import { type NextRequest, NextResponse } from 'next/server';
import { connectionService } from '@/lib/services/connection-service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// POST /api/connections/[id]/test - Test database connection
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        const result = await connectionService.testConnection(id);

        return NextResponse.json({
            success: result.success,
            data: result,
        });
    } catch (error) {
        console.error('[API] Error testing connection:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
