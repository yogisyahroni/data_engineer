import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isWorkspaceOwner, requireAuth } from '@/lib/auth/permissions';
import { WorkspaceService } from '@/lib/services/workspace-service';

/**
 * GET /api/workspaces/[id]/members
 * List all members of a workspace
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await requirePermission(params.id, 'read:workspace');

        const members = await WorkspaceService.listMembers(params.id);

        return NextResponse.json(members);
    } catch (error: any) {
        console.error('[API] List members error:', error);
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
 * POST /api/workspaces/[id]/members
 * Invite a new member to workspace
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

        // Only ADMIN or OWNER can invite members
        await requirePermission(params.id, 'manage:users');

        const body = await request.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json(
                { error: 'userId and role are required' },
                { status: 400 }
            );
        }

        if (!['VIEWER', 'EDITOR', 'ADMIN'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role. Must be VIEWER, EDITOR, or ADMIN' },
                { status: 400 }
            );
        }

        const member = await WorkspaceService.inviteMember({
            workspaceId: params.id,
            userId,
            role,
            invitedBy: user.id,
        });

        return NextResponse.json(member, { status: 201 });
    } catch (error: any) {
        console.error('[API] Invite member error:', error);
        const status = error.message?.includes('Unauthorized')
            ? 401
            : error.message?.includes('Forbidden')
                ? 403
                : error.message?.includes('Unique constraint')
                    ? 409
                    : 500;

        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status }
        );
    }
}
