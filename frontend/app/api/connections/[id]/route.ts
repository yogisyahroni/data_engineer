import { type NextRequest, NextResponse } from 'next/server';
import { connectionService } from '@/lib/services/connection-service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/connections/[id] - Get single connection
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

        // Don't expose password in response
        const safeConnection = {
            ...connection,
            password: connection.password ? '********' : null,
        };

        return NextResponse.json({
            success: true,
            data: safeConnection,
        });
    } catch (error) {
        console.error('[API] Error fetching connection:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// PUT /api/connections/[id] - Update connection
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        const existing = await connectionService.getConnection(id);
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Connection not found' },
                { status: 404 }
            );
        }

        const updated = await connectionService.updateConnection(id, body);

        return NextResponse.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('[API] Error updating connection:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// DELETE /api/connections/[id] - Delete connection
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        const existing = await connectionService.getConnection(id);
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Connection not found' },
                { status: 404 }
            );
        }

        await connectionService.deleteConnection(id);

        return NextResponse.json({
            success: true,
            message: 'Connection deleted successfully',
        });
    } catch (error) {
        console.error('[API] Error deleting connection:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
