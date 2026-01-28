import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireAuth } from '@/lib/auth/permissions';
import { WorkspaceService } from '@/lib/services/workspace-service';

/**
 * PATCH /api/workspaces/[id]/members/[memberId]
 * Update member role
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; memberId: string } }
) {
    try {
        await requirePermission(params.id, 'manage:users');

        const body = await request.json();
        const { role } = body;

        if (!role || !['VIEWER', 'EDITOR', 'ADMIN'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role. Must be VIEWER, EDITOR, or ADMIN' },
                { status: 400 }
            );
        }

        const updated = await WorkspaceService.updateMemberRole(
            params.id,
            params.memberId,
            role
        );

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('[API] Update member role error:', error);
        const status = error.message?.includes('Unauthorized')
            ? 401
            : error.message?.includes('Forbidden')
                ? 403
                : 500;

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status }
        );
    }
}

/**
 * DELETE /api/workspaces/[id]/members/[memberId]
 * Remove member from workspace
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; memberId: string } }
) {
    try {
        await requirePermission(params.id, 'manage:users');

        await WorkspaceService.removeMember(params.id, params.memberId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Remove member error:', error);
        const status = error.message?.includes('Unauthorized')
            ? 401
            : error.message?.includes('Forbidden')
                ? 403
                : 500;

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status }
        );
    }
}
