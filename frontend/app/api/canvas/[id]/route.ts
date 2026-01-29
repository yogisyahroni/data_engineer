import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db as prisma } from '@/lib/db';

// GET /api/canvas/[id] - Get canvas with all widgets
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    // Auth check (Grade A+ Security)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = params;

        const canvas = await prisma.canvas.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                widgets: {
                    orderBy: { zIndex: 'asc' }
                }
            }
        });

        if (!canvas) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: canvas.workspaceId,
                userId: session.user.id
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ canvas });
    } catch (error: any) {
        console.error('[Canvas GET by ID] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/canvas/[id] - Update canvas metadata
export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    // Auth check (Grade A+ Security)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = params;
        const body = await req.json();
        const { name, description, layout, gridSize } = body;

        // Fetch existing canvas
        const existing = await prisma.canvas.findUnique({
            where: { id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: existing.workspaceId,
                userId: session.user.id
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Update canvas
        const canvas = await prisma.canvas.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(layout && { layout }),
                ...(gridSize && { gridSize })
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json({ canvas });
    } catch (error: any) {
        console.error('[Canvas PUT] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/canvas/[id] - Delete canvas
export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    // Auth check (Grade A+ Security)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = params;

        const existing = await prisma.canvas.findUnique({
            where: { id }
        });

        if (!existing) {
            return NextResponse.json({ error: 'Canvas not found' }, { status: 404 });
        }

        // Verify workspace membership 
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: existing.workspaceId,
                userId: session.user.id
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Delete canvas (widgets auto-deleted via CASCADE)
        await prisma.canvas.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Canvas deleted successfully' });
    } catch (error: any) {
        console.error('[Canvas DELETE] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
