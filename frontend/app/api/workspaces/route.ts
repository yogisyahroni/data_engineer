import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth } from '@/lib/auth/permissions';
import { WorkspaceService } from '@/lib/services/workspace-service';

/**
 * GET /api/workspaces
 * List all workspaces user has access to
 */
export async function GET(request: NextRequest) {
    try {
        const user = await requireAuth();

        const { owned, member } = await WorkspaceService.getUserWorkspaces(user.id);

        return NextResponse.json({
            owned,
            member,
            total: owned.length + member.length,
        });
    } catch (error: any) {
        console.error('[API] Get workspaces error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}

/**
 * POST /api/workspaces
 * Create a new workspace
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await request.json();

        const { name, slug } = body;

        if (!name || !slug) {
            return NextResponse.json(
                { error: 'Name and slug are required' },
                { status: 400 }
            );
        }

        const workspace = await WorkspaceService.createWorkspace({
            name,
            slug,
            ownerId: user.id,
        });

        return NextResponse.json(workspace, { status: 201 });
    } catch (error: any) {
        console.error('[API] Create workspace error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message?.includes('Unauthorized') ? 401 : 500 }
        );
    }
}
