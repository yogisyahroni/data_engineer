import { PrismaClient, Role } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

const prisma = new PrismaClient();

/**
 * Permission matrix defining what each role can do
 */
const PERMISSIONS = {
    VIEWER: ['read:*'],
    EDITOR: [
        'read:*',
        'write:query',
        'write:dashboard',
        'write:collection',
        'write:story',
    ],
    ADMIN: [
        'read:*',
        'write:*',
        'manage:users',
        'manage:connections',
        'manage:settings',
    ],
    OWNER: ['*'],
} as const;

/**
 * Get the current user's session
 */
export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    return session?.user || null;
}

/**
 * Get user's role in a workspace
 */
export async function getUserRole(
    userId: string,
    workspaceId: string
): Promise<Role | null> {
    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { ownerId: true },
        });

        // Owner check
        if (workspace?.ownerId === userId) {
            return 'OWNER';
        }

        // Member check
        const member = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
            select: { role: true },
        });

        return member?.role || null;
    } catch (error) {
        console.error('[RBAC] Error getting user role:', error);
        return null;
    }
}

/**
 * Check if user has permission in workspace
 */
export async function hasPermission(
    userId: string,
    workspaceId: string,
    permission: string
): Promise<boolean> {
    const role = await getUserRole(userId, workspaceId);

    if (!role) return false;

    const rolePermissions = PERMISSIONS[role];

    // OWNER has all permissions
    if (rolePermissions.includes('*')) return true;

    // Check if role has the specific permission
    if (rolePermissions.includes(permission)) return true;

    // Check wildcard permissions (e.g., 'read:*' matches 'read:dashboard')
    const [action] = permission.split(':');
    if (rolePermissions.includes(`${action}:*`)) return true;

    return false;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized: Authentication required');
    }
    return user;
}

/**
 * Require specific permission in workspace (throws if not permitted)
 */
export async function requirePermission(
    workspaceId: string,
    permission: string
) {
    const user = await requireAuth();
    const hasAccess = await hasPermission(user.id, workspaceId, permission);

    if (!hasAccess) {
        throw new Error(
            `Forbidden: User does not have permission '${permission}' in workspace`
        );
    }

    return user;
}

/**
 * Check if user is workspace owner
 */
export async function isWorkspaceOwner(
    userId: string,
    workspaceId: string
): Promise<boolean> {
    try {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { ownerId: true },
        });
        return workspace?.ownerId === userId;
    } catch (error) {
        console.error('[RBAC] Error checking ownership:', error);
        return false;
    }
}

/**
 * Get all workspaces user has access to
 */
export async function getUserWorkspaces(userId: string) {
    try {
        const [ownedWorkspaces, memberWorkspaces] = await Promise.all([
            prisma.workspace.findMany({
                where: { ownerId: userId },
                include: {
                    members: {
                        select: {
                            user: { select: { name: true, email: true } },
                            role: true,
                        },
                    },
                },
            }),
            prisma.workspaceMember.findMany({
                where: { userId },
                include: {
                    workspace: {
                        include: {
                            owner: { select: { name: true, email: true } },
                        },
                    },
                },
            }),
        ]);

        return {
            owned: ownedWorkspaces,
            member: memberWorkspaces.map((m) => m.workspace),
        };
    } catch (error) {
        console.error('[RBAC] Error getting user workspaces:', error);
        return { owned: [], member: [] };
    }
}
