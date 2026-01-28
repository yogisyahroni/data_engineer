import { type NextRequest, NextResponse } from 'next/server';
import { collectionRepo } from '@/lib/repositories/collection-repo';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        const updated = await collectionRepo.update(id, body);

        return NextResponse.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('[API] Error updating collection:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        await collectionRepo.delete(id);

        return NextResponse.json({
            success: true,
            message: 'Collection deleted successfully',
        });
    } catch (error) {
        console.error('[API] Error deleting collection:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
