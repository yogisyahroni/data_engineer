
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> } // Fix for Next.js 15 breaking change on params
) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    // Rate Limiting (Phase 18.3)
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success, limit, remaining, reset } = await rateLimit(ip);

    if (!success) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString()
            }
        });
    }

    // MVP: Apps are internal portals, require login.
    // Future: Check 'isPublished' and 'customDomain' for public access.
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized: Please log in to view this App', { status: 401 });
    }

    const app = await db.dataApp.findUnique({
        where: { slug: slug },
        include: {
            pages: {
                where: { isHidden: false },
                orderBy: { order: 'asc' },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    type: true,
                    icon: true,
                    order: true,
                    externalUrl: true,
                    // We DO NOT fetch content or dashboardId here to keep initial load light.
                    // Content is fetched on demand via page slug.
                }
            }
        }
    });

    if (!app) {
        return new NextResponse('App not found', { status: 404 });
    }

    // Verify workspace access (VIEWER is allowed for Runtime)
    const member = await db.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: app.workspaceId,
                userId: session.user.id,
            },
        },
    });

    if (!member) {
        return new NextResponse('Forbidden: You are not a member of this workspace', { status: 403 });
    }

    // Return Runtime Config
    return NextResponse.json({
        id: app.id,
        name: app.name,
        description: app.description,
        logoUrl: app.logoUrl,
        themeConfig: app.themeConfig,
        pages: app.pages,
        workspaceId: app.workspaceId
    });
}
