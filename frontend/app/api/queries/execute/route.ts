import { type NextRequest, NextResponse } from 'next/server';
import { queryService } from '@/lib/services/query-service';
import { z } from 'zod';
import { getPoliciesForUser, wrapQueryWithRLS } from '@/lib/security/rls';

const ExecuteQuerySchema = z.object({
  sql: z.string().min(1, 'SQL query is required'),
  connectionId: z.string().min(1, 'Connection ID is required'),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const { sql, connectionId, page, pageSize } = ExecuteQuerySchema.parse(rawBody);

    // Protocol 4: Security - TODO Check User Permissions here

    let result;
    if (page !== undefined && pageSize !== undefined) {
      result = await queryService.executePaginatedQuery(connectionId, sql, page, pageSize);
    } else {
      // Legacy mode (or full export) - cautious with 1M rows
      // result = await queryService.executeRawQuery(connectionId, sql); // Original line

      // Determine limit for raw query, default to a reasonable max if not provided
      const limit = pageSize !== undefined ? pageSize : 50000; // Use pageSize as limit if provided, else default

      if (limit > 50000) {
        return new NextResponse('Limit cannot exceed 50,000 rows', { status: 400 });
      }

      // --- RLS INJECTION (Phase 11.3) ---
      // 1. Fetch active policies for this user + connection
      // Note: In real app, get userId from session. Here assuming passed or mocking.
      // For MVP, we'll try to get session, or default to a test ID if running locally/dev.
      // const session = await getServerSession(authOptions);
      // const userId = session?.user?.id;
      const userId = 'clq...'; // Placeholder or extract from header/token

      let finalSql = sql;

      if (userId) {
        // Hardcoded workspaceId for now or fetch from connection
        // ideally we get workspaceId from request or connection relation
        const policies = await getPoliciesForUser({
          userId,
          workspaceId: 'clq...', // valid workspace id
          connectionId
        });

        // 2. Apply policies
        // Simple heuristic: If policy.tableName is in the SQL, apply it.
        // This is "blind" injection. Real RLS parsing is harder.
        // We only apply the FIRST matching policy for MVP simplicity to avoid nesting hell without parser.
        for (const policy of policies) {
          // Regex to check if table is used. 
          // Matches "FROM table" or "JOIN table"
          const tableRegex = new RegExp(`\\b${policy.tableName}\\b`, 'i');
          if (tableRegex.test(finalSql)) {
            console.log(`[RLS] Applying policy: ${policy.name} for table ${policy.tableName}`);
            finalSql = wrapQueryWithRLS(finalSql, policy.condition);
            // For MVP, apply only one to avoid conflict/complexity
            break;
          }
        }
      }
      // ----------------------------------

      // Execute query
      result = await queryService.executeRawQuery(connectionId, finalSql, limit); // Modified to use finalSql and limit
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[API] Query Execution Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
