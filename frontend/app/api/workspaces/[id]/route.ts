import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, isWorkspaceOwner, requireAuth } from '@/lib/auth/permissions';
import { WorkspaceService } from '@/lib/services/workspace-service';

/**
 * GET /api/workspaces/[id]
 * Get workspace details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

        // Verify user has access to this workspace
        await requirePermission(params.id, 'read:workspace');

        const workspace = await WorkspaceService.getWorkspace(params.id);

        if (!workspace) {
            return NextResponse.json(
                { error: 'Workspace not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(workspace);
    } catch (error: any) {
        console.error('[API] Get workspace error:', error);
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
 * PATCH /api/workspaces/[id]
 * Update workspace settings
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

        // Only owner can update workspace
        const isOwner = await isWorkspaceOwner(user.id, params.id);
        if (!isOwner) {
            return NextResponse.json(
                { error: 'Only workspace owner can update settings' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, plan } = body;

        const updated = await WorkspaceService.updateWorkspace(params.id, {
            name,
            plan,
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('[API] Update workspace error:', error);
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
 * DELETE /api/workspaces/[id]
 * Delete workspace (owner only)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();

        const isOwner = await isWorkspaceOwner(user.id, params.id);
        if (!isOwner) {
            return NextResponse.json(
                { error: 'Only workspace owner can delete workspace' },
                { status: 403 }
            );
        }

        await WorkspaceService.deleteWorkspace(params.id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API] Delete workspace error:', error);
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
