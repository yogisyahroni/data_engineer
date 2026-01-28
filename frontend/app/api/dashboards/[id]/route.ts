import { type NextRequest, NextResponse } from 'next/server';
import { dashboardRepo } from '@/lib/repositories/dashboard-repo';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/dashboards/[id] - Get dashboard by ID
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        const dashboard = await dashboardRepo.findById(id);

        if (!dashboard) {
            return NextResponse.json(
                { success: false, error: 'Dashboard not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: dashboard,
        });
    } catch (error) {
        console.error('[API] Error fetching dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// PUT /api/dashboards/[id] - Update dashboard
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        let updated;

        if (body.cards && Array.isArray(body.cards)) {
            // If cards are provided, we assume a layout update (full sync of cards)
            // We also update metadata if provided, but prioritizing layout logic
            if (body.name || body.description || body.isPublic !== undefined || body.filters) {
                await dashboardRepo.update(id, {
                    name: body.name,
                    description: body.description,
                    isPublic: body.isPublic,
                    collectionId: body.collectionId,
                    filters: body.filters
                });
            }
            updated = await dashboardRepo.updateLayout(id, body.cards);
        } else {
            // Metadata only update
            updated = await dashboardRepo.update(id, body);
        }

        return NextResponse.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('[API] Error updating dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// DELETE /api/dashboards/[id] - Delete dashboard
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        await dashboardRepo.delete(id);

        return NextResponse.json({
            success: true,
            message: 'Dashboard deleted successfully',
        });
    } catch (error) {
        console.error('[API] Error deleting dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
