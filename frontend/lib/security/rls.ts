
import { db as prisma } from '@/lib/db';
import { applyFiltersToSql } from '@/lib/sql-utils';
import { Role } from '@prisma/client';

export type RLSPolicyCheck = {
    userId: string;
    workspaceId: string;
    connectionId: string;
    userRole?: Role;
};

/**
 * Fetch active RLS policies for a specific user context
 */
export async function getPoliciesForUser(context: RLSPolicyCheck) {
    const { userId, workspaceId, connectionId, userRole } = context;

    // Fetch policies that match:
    // 1. Same Workspace & Connection
    // 2. Target is THIS User OR Target is THIS Role
    // 3. Is Active
    const policies = await prisma.rLSPolicy.findMany({
        where: {
            workspaceId,
            connectionId,
            isActive: true,
            OR: [
                { userId: userId }, // Direct assignment
                { role: userRole }   // Role-based assignment
            ]
        }
    });

    return policies;
}

/**
 * Injects RLS conditions into a SQL query
 * Supports multiple policies on different tables (conceptually)
 * NOTE: For MVP, we assume the query targets the table specified in the policy.
 * If a query joins multiple tables, this simple wrapper might need enhancement.
 * 
 * Strategy:
 * If we find a policy for 'sales' table, we wrap the query.
 * BUT, we don't know the table name from the raw SQL easily without a parser.
 * 
 * MVP Compromise:
 * We will regex match the table name in the query. 
 * If the query contains "FROM table_name" or "JOIN table_name", we apply the filter.
 * 
 * BETTER APPROACH (Wrapper Pattern):
 * This function handles a SINGLE table target for now, or applied to the whole query result 
 * if the view itself represents that table.
 * 
 * ACTUAL IMPLEMENTATION:
 * We will return a map of "TableName" -> "Condition".
 * The CALLER (query execution service) needs to decide how to apply it.
 * 
 * WAIT, the Plan said: "Inject upstream".
 * If we have a policy "region = 'North'" for table "sales".
 * And user runs "SELECT * FROM sales".
 * We want "SELECT * FROM (SELECT * FROM sales) AS _rls_wrapper WHERE region = 'North'".
 * 
 * Issue: If user runs "SELECT * FROM customers", we should NOT apply sales policy.
 * 
 * Solution: We need to know the target table of the Saved Query if possible.
 * If ad-hoc SQL, we must detect table usage.
 * 
 * Revised Strategy for this file:
 * Just return the policies. Let the API route handle the application or 
 * use a simple regex heuristic for now as outlined in the plan.
 */
export function generateRLSWrappers(sql: string, policies: { tableName: string; condition: string }[]) {
    // This function is complex to do perfectly without a parser.
    // However, if we assume the query is simple (often the case for filtered views):
    // We can just check if any policy table is mentioned.

    // For MVP Phase 11.3:
    // We will apply the wrapper IF the SQL *seems* to be selecting from the target table.
    // OR, if the 'SavedQuery' metadata tells us the primary table.

    // Let's implement the specific "Apply" function that takes one policy and wraps.
    return policies;
}

/**
 * Core function to wrap SQL with RLS condition
 * Reuses the logic from sql-utils but strictly for security strings
 */
export function wrapQueryWithRLS(sql: string, condition: string): string {
    const cleanSql = sql.trim().replace(/;$/, '');
    return `SELECT * FROM (\n${cleanSql}\n) AS _rls_wrapper WHERE ${condition}`;
}
