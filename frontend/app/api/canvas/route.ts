import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db as prisma } from '@/lib/db';

// GET /api/canvas - List all canvases in workspace
export async function GET(req: Request) {
    // Auth check (Grade A+ Security)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get('workspaceId');

        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
        }

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId: session.user.id
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 });
        }

        // Fetch canvases
        const canvases = await prisma.canvas.findMany({
            where: { workspaceId },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                _count: {
                    select: { widgets: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json({ canvases });
    } catch (error: any) {
        console.error('[Canvas GET] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/canvas - Create new canvas
export async function POST(req: Request) {
    // Auth check (Grade A+ Security)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, description, workspaceId, layout, gridSize } = body;

        // Validation
        if (!name || !workspaceId) {
            return NextResponse.json({ error: 'name and workspaceId are required' }, { status: 400 });
        }

        // Verify workspace membership
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId: session.user.id
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'Access denied to workspace' }, { status: 403 });
        }

        // Create canvas
        const canvas = await prisma.canvas.create({
            data: {
                name,
                description,
                workspaceId,
                createdBy: session.user.id,
                layout: layout || 'free',
                gridSize: gridSize || 8
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

        return NextResponse.json({ canvas }, { status: 201 });
    } catch (error: any) {
        console.error('[Canvas POST] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
