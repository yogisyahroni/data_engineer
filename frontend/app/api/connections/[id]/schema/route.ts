import { type NextRequest, NextResponse } from 'next/server';
import { connectionService } from '@/lib/services/connection-service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/connections/[id]/schema - Fetch database schema
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        const connection = await connectionService.getConnection(id);
        if (!connection) {
            return NextResponse.json(
                { success: false, error: 'Connection not found' },
                { status: 404 }
            );
        }

        // Fetch real schema
        const schema = await connectionService.fetchSchema(id);

        if (!schema) {
            return NextResponse.json({
                success: false,
                error: 'Failed to fetch schema from database',
                isMock: false,
            });
        }

        return NextResponse.json({
            success: true,
            data: schema,
            isMock: false,
        });
    } catch (error) {
        console.error('[API] Error fetching schema:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal Server Error',
            isMock: false,
        }, { status: 500 });
    }
}
