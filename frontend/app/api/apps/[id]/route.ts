
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import { z } from 'zod';

const UpdateAppSchema = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().optional(),
    logoUrl: z.string().optional(),
    themeConfig: z.record(z.any()).optional(),
    isPublished: z.boolean().optional(),
    customDomain: z.string().optional(),
});

// GET /api/apps/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Fix for Next.js 15 breaking change on params
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const app = await db.dataApp.findUnique({
        where: { id },
    });

    if (!app) {
        return new NextResponse('App not found', { status: 404 });
    }

    // Verify workspace access (VIEWER is enough to see app details in listing, but maybe EDITOR to see settings?)
    // Let's allow VIEWER for now.
    const member = await db.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: app.workspaceId,
                userId: session.user.id,
            },
        },
    });

    if (!member) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    return NextResponse.json(app);
}

// PUT /api/apps/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const json = await request.json();
        const body = UpdateAppSchema.parse(json);

        const app = await db.dataApp.findUnique({
            where: { id },
        });

        if (!app) {
            return new NextResponse('App not found', { status: 404 });
        }

        // Verify workspace access (EDITOR or higher)
        const member = await db.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: app.workspaceId,
                    userId: session.user.id,
                },
            },
        });

        if (!member || ['VIEWER'].includes(member.role)) {
            return new NextResponse('Forbidden: Editors only', { status: 403 });
        }

        // Check Slug Uniqueness if changed
        if (body.slug && body.slug !== app.slug) {
            const existing = await db.dataApp.findUnique({
                where: { slug: body.slug }
            });
            if (existing) {
                return NextResponse.json({ success: false, error: 'Slug is already taken' }, { status: 409 });
            }
        }

        const updatedApp = await db.dataApp.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(updatedApp);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error('[API] Update DataApp Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE /api/apps/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const app = await db.dataApp.findUnique({
        where: { id },
    });

    if (!app) {
        return new NextResponse('App not found', { status: 404 });
    }

    // Verify workspace access (ADMIN or OWNER only for deletion?)
    // Let's say EDITOR is enough for MVP, but ideally ADMIN.
    const member = await db.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: app.workspaceId,
                userId: session.user.id,
            },
        },
    });

    if (!member || ['VIEWER'].includes(member.role)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    await db.dataApp.delete({
        where: { id },
    });

    return new NextResponse(null, { status: 204 });
}
