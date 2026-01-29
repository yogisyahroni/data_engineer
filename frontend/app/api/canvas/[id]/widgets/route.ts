import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db as prisma } from '@/lib/db';

// POST /api/canvas/[id]/widgets - Add widget to canvas
export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    // Auth check (Grade A+ Security)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: canvasId } = params;
        const body = await req.json();
        const { type, x, y, width, height, zIndex, config } = body;

        // Validation
        if (!type || x === undefined || y === undefined || width === undefined || height === undefined) {
            return NextResponse.json({
                error: 'type, x, y, width, height are required'
            }, { status: 400 });
        }

        // Valid widget types
        const validTypes = ['text', 'image', 'chart', 'metric', 'filter', 'divider'];
        if (!validTypes.includes(type)) {
            return NextResponse.json({
                error: `Invalid widget type. Must be one of: ${validTypes.join(', ')}`
            }, { status: 400 });
        }

        // Fetch canvas
        const canvas = await prisma.canvas.findUnique({
            where: { id: canvasId }
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

        // Create widget
        const widget = await prisma.canvasWidget.create({
            data: {
                canvasId,
                type,
                x,
                y,
                width,
                height,
                zIndex: zIndex || 0,
                config: config || {}
            }
        });

        return NextResponse.json({ widget }, { status: 201 });
    } catch (error: any) {
        console.error('[Canvas Widget POST] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
