import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface CreateWorkspaceInput {
    name: string;
    slug: string;
    ownerId: string;
}

export interface InviteMemberInput {
    workspaceId: string;
    userId: string;
    role: 'VIEWER' | 'EDITOR' | 'ADMIN';
    invitedBy: string;
}

/**
 * Workspace Service - Manages workspace CRUD and member management
 */
export class WorkspaceService {
    /**
     * Create a new workspace
     */
    static async createWorkspace(input: CreateWorkspaceInput) {
        return prisma.workspace.create({
            data: {
                name: input.name,
                slug: input.slug,
                ownerId: input.ownerId,
            },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    /**
     * Get workspace by ID
     */
    static async getWorkspace(workspaceId: string) {
        return prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
            },
        });
    }

    /**
     * Invite a member to workspace
     */
    static async inviteMember(input: InviteMemberInput) {
        return prisma.workspaceMember.create({
            data: {
                workspaceId: input.workspaceId,
                userId: input.userId,
                role: input.role,
                invitedBy: input.invitedBy,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    /**
     * Update member role
     */
    static async updateMemberRole(
        workspaceId: string,
        userId: string,
        newRole: 'VIEWER' | 'EDITOR' | 'ADMIN'
    ) {
        return prisma.workspaceMember.update({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
            data: { role: newRole },
        });
    }

    /**
     * Remove member from workspace
     */
    static async removeMember(workspaceId: string, userId: string) {
        return prisma.workspaceMember.delete({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
    }

    /**
     * List all members of a workspace
     */
    static async listMembers(workspaceId: string) {
        return prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { invitedAt: 'desc' },
        });
    }

    /**
     * Link a connection to a workspace
     */
    static async linkConnection(workspaceId: string, connectionId: string) {
        return prisma.workspaceConnection.create({
            data: {
                workspaceId,
                connectionId,
            },
        });
    }

    /**
     * Link a dashboard to a workspace
     */
    static async linkDashboard(workspaceId: string, dashboardId: string) {
        return prisma.workspaceDashboard.create({
            data: {
                workspaceId,
                dashboardId,
            },
        });
    }

    /**
     * Get all workspaces for a user
     */
    static async getUserWorkspaces(userId: string) {
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
            console.error('[WorkspaceService] Error getting user workspaces:', error);
            return { owned: [], member: [] };
        }
    }

    /**
     * Update workspace
     */
    static async updateWorkspace(
        workspaceId: string,
        data: { name?: string; plan?: 'FREE' | 'PRO' | 'ENTERPRISE' }
    ) {
        return prisma.workspace.update({
            where: { id: workspaceId },
            data,
            include: {
                owner: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    /**
     * Delete workspace
     */
    static async deleteWorkspace(workspaceId: string) {
        return prisma.workspace.delete({
            where: { id: workspaceId },
        });
    }
}

/**
 * User Service - Manages user authentication and registration
 */
export class UserService {
    /**
     * Create a new user with hashed password
     */
    static async createUser(
        email: string,
        password: string,
        name: string
    ) {
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });

        // Create default workspace for new user
        const defaultWorkspace = await WorkspaceService.createWorkspace({
            name: `${name}'s Workspace`,
            slug: `${email.split('@')[0]}-workspace-${Date.now()}`,
            ownerId: user.id,
        });

        return { user, defaultWorkspace };
    }

    /**
     * Find user by email
     */
    static async findByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });
    }

    /**
     * Verify password
     */
    static async verifyPassword(
        plainPassword: string,
        hashedPassword: string
    ): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
}
