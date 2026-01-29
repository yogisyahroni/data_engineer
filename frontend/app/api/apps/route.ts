
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import { z } from 'zod';

const CreateAppSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
    description: z.string().optional(),
    workspaceId: z.string().min(1, 'Workspace ID is required'),
});

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
        return new NextResponse('Workspace ID is required', { status: 400 });
    }

    // Verify access to workspace
    const member = await db.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId: session.user.id,
            },
        },
    });

    if (!member) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const apps = await db.dataApp.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: {
                select: { pages: true }
            }
        }
    });

    return NextResponse.json(apps);
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const json = await request.json();
        const body = CreateAppSchema.parse(json);

        // Verify workspace access (EDITOR or higher)
        const member = await db.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: body.workspaceId,
                    userId: session.user.id,
                },
            },
        });

        if (!member || ['VIEWER'].includes(member.role)) {
            return new NextResponse('Forbidden: Editors only', { status: 403 });
        }

        // Check slug uniqueness globally (or per workspace? Model says @unique global)
        // The schema says @unique globally.
        const existing = await db.dataApp.findUnique({
            where: { slug: body.slug }
        });

        if (existing) {
            return NextResponse.json({ success: false, error: 'Slug is already taken' }, { status: 409 });
        }

        const app = await db.dataApp.create({
            data: {
                name: body.name,
                slug: body.slug,
                description: body.description,
                workspaceId: body.workspaceId,
            },
        });

        return NextResponse.json(app);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error('[API] Create DataApp Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
