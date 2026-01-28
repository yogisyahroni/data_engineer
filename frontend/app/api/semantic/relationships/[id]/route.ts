import { NextRequest, NextResponse } from 'next/server';
import { SemanticLayerService } from '@/lib/services/semantic-layer-service';

/**
 * DELETE /api/semantic/relationships/[id]
 * Delete a virtual relationship
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // TODO: Add auth check when auth is implemented
        await SemanticLayerService.deleteRelationship(params.id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Delete relationship error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
