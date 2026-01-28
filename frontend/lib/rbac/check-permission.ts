import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { hasPermission, type Permission, type Role } from './permissions';

/**
 * Result of permission check
 */
export interface PermissionCheckResult {
    authorized: true;
    userId: string;
    role: Role;
    workspaceId: string;
}

export type PermissionCheckError = NextResponse<{ error: string }>;

/**
 * Check if the current user has permission to perform an action in a workspace
 * 
 * @param workspaceId - The workspace to check permissions for
 * @param requiredPermission - The permission required
 * @returns Permission check result or error response
 */
export async function checkWorkspacePermission(
    workspaceId: string,
    requiredPermission: Permission
): Promise<PermissionCheckResult | PermissionCheckError> {
    // Get current session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    // Get user's membership in this workspace
    const member = await db.workspaceMember.findFirst({
        where: {
            workspaceId,
            userId: session.user.id,
        },
    });

    if (!member) {
        return NextResponse.json(
            { error: 'Not a member of this workspace' },
            { status: 403 }
        );
    }

    // Check if user's role has the required permission
    if (!hasPermission(member.role as Role, requiredPermission)) {
        return NextResponse.json(
            { error: `Insufficient permissions. Required: ${requiredPermission}` },
            { status: 403 }
        );
    }

    return {
        authorized: true,
        userId: session.user.id,
        role: member.role as Role,
        workspaceId,
    };
}

/**
 * Check if user is authenticated (no workspace required)
 */
export async function checkAuth(): Promise<{ userId: string } | PermissionCheckError> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    return { userId: session.user.id };
}

/**
 * Check if user is workspace owner
 */
export async function checkWorkspaceOwner(
    workspaceId: string
): Promise<PermissionCheckResult | PermissionCheckError> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
        );
    }

    const workspace = await db.workspace.findFirst({
        where: {
            id: workspaceId,
            ownerId: session.user.id,
        },
    });

    if (!workspace) {
        return NextResponse.json(
            { error: 'Only workspace owner can perform this action' },
            { status: 403 }
        );
    }

    return {
        authorized: true,
        userId: session.user.id,
        role: 'OWNER',
        workspaceId,
    };
}

/**
 * Type guard to check if permission check succeeded
 */
export function isAuthorized(
    result: PermissionCheckResult | PermissionCheckError
): result is PermissionCheckResult {
    return 'authorized' in result && result.authorized === true;
}
