import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db as prisma } from '@/lib/db';

// PUT /api/canvas/[id]/widgets/[widgetId] - Update widget
export async function PUT(
    req: Request,
    { params }: { params: { id: string; widgetId: string } }
) {
    // Auth check (Grade A+ Security)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: canvasId, widgetId } = params;
        const body = await req.json();
        const { x, y, width, height, zIndex, config } = body;

        // Fetch widget and canvas
        const widget = await prisma.canvasWidget.findUnique({
            where: { id: widgetId },
            include: { canvas: true }
        });

        if (!widget) {
            return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
        }

        if (widget.canvasId !== canvasId) {
            return NextResponse.json({ error: 'Widget does not belong to this canvas' }, { status: 400 });
        }

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: widget.canvas.workspaceId,
                userId: session.user.id
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Update widget
        const updatedWidget = await prisma.canvasWidget.update({
            where: { id: widgetId },
            data: {
                ...(x !== undefined && { x }),
                ...(y !== undefined && { y }),
                ...(width !== undefined && { width }),
                ...(height !== undefined && { height }),
                ...(zIndex !== undefined && { zIndex }),
                ...(config && { config })
            }
        });

        return NextResponse.json({ widget: updatedWidget });
    } catch (error: any) {
        console.error('[Canvas Widget PUT] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/canvas/[id]/widgets/[widgetId] - Delete widget
export async function DELETE(
    req: Request,
    { params }: { params: { id: string; widgetId: string } }
) {
    // Auth check (Grade A+ Security)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: canvasId, widgetId } = params;

        // Fetch widget and canvas
        const widget = await prisma.canvasWidget.findUnique({
            where: { id: widgetId },
            include: { canvas: true }
        });

        if (!widget) {
            return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
        }

        if (widget.canvasId !== canvasId) {
            return NextResponse.json({ error: 'Widget does not belong to this canvas' }, { status: 400 });
        }

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: widget.canvas.workspaceId,
                userId: session.user.id
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Delete widget
        await prisma.canvasWidget.delete({
            where: { id: widgetId }
        });

        return NextResponse.json({ message: 'Widget deleted successfully' });
    } catch (error: any) {
        console.error('[Canvas Widget DELETE] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
