
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import { z } from 'zod';

const CreatePageSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric'),
    type: z.enum(['DASHBOARD', 'URL', 'MARKDOWN']).default('DASHBOARD'),
    icon: z.string().optional(),
    dashboardId: z.string().optional(),
    externalUrl: z.string().url().optional(),
    content: z.string().optional(),
    isHidden: z.boolean().optional(),
});

// GET /api/apps/[id]/pages
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: appId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify App Access
    const app = await db.dataApp.findUnique({ where: { id: appId } });
    if (!app) return new NextResponse('App not found', { status: 404 });

    const member = await db.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: app.workspaceId, userId: session.user.id } }
    });
    if (!member) return new NextResponse('Forbidden', { status: 403 });

    const pages = await db.appPage.findMany({
        where: { appId },
        orderBy: { order: 'asc' },
        include: {
            dashboard: {
                select: { id: true, name: true } // Return basic dashboard info to display
            }
        }
    });

    return NextResponse.json(pages);
}

// POST /api/apps/[id]/pages
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: appId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const json = await request.json();
        const body = CreatePageSchema.parse(json);

        const app = await db.dataApp.findUnique({ where: { id: appId } });
        if (!app) return new NextResponse('App not found', { status: 404 });

        // Editors only
        const member = await db.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: app.workspaceId, userId: session.user.id } }
        });
        if (!member || member.role === 'VIEWER') return new NextResponse('Forbidden', { status: 403 });

        // Get max order
        const lastPage = await db.appPage.findFirst({
            where: { appId },
            orderBy: { order: 'desc' },
        });
        const newOrder = (lastPage?.order ?? -1) + 1;

        // Create
        const page = await db.appPage.create({
            data: {
                appId,
                title: body.title,
                slug: body.slug,
                type: body.type,
                icon: body.icon,
                dashboardId: body.dashboardId,
                externalUrl: body.externalUrl,
                content: body.content,
                isHidden: body.isHidden ?? false,
                order: newOrder,
            },
        });

        return NextResponse.json(page);
    } catch (error) {
        if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors }, { status: 400 });
        // Handle unique constraint failure on slug
        if ((error as any).code === 'P2002') {
            return NextResponse.json({ success: false, error: 'Slug must be unique within the app' }, { status: 409 });
        }
        console.error('[API] Create Page Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
