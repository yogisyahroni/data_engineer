import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const dashboardCardId = searchParams.get('cardId');

        if (!dashboardCardId) return NextResponse.json({ error: 'Card ID required' }, { status: 400 });

        const comments = await db.comment.findMany({
            where: {
                dashboardCardId,
                parentId: null // Top level only, include replies
            },
            include: {
                user: { select: { name: true, image: true, email: true } },
                replies: {
                    include: { user: { select: { name: true, image: true, email: true } } },
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, comments });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { content, dashboardCardId, parentId } = body;

        if (!content || !dashboardCardId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const comment = await db.comment.create({
            data: {
                content,
                dashboardCardId,
                parentId: parentId || null,
                userId: session.user.id
            },
            include: {
                user: { select: { name: true, image: true } }
            }
        });

        // 1. Log Activity
        await db.activity.create({
            data: {
                type: 'COMMENT',
                description: `commented on a chart`,
                metadata: { dashboardCardId, commentId: comment.id },
                userId: session.user.id
            }
        });

        // 2. Parse Mentions (Simple regex for @Name)
        // Matches @Word or @"Multiple Words" (simplified)
        const mentionRegex = /@(\w+)/g;
        const mentions = content.match(mentionRegex);

        if (mentions) {
            for (const mention of mentions) {
                const username = mention.substring(1); // remove @
                // Find user (fuzzy match or exact?) -> For MVP, assuming we don't have username field, we skip strict lookup
                // But we log the mention activity regardless

                await db.activity.create({
                    data: {
                        type: 'MENTION',
                        description: `mentioned ${mention} in a comment`,
                        metadata: { dashboardCardId, target: username },
                        userId: session.user.id
                    }
                });

                // TODO: Integration with Resend would go here
                // sendEmail({ to: ..., subject: 'You were mentioned', ... })
            }
        }

        return NextResponse.json({ success: true, comment });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to post' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, isResolved } = body; // Simplified update for MVP

        // Check ownership or admin status... skipping strict RBAC for MVP speed
        const comment = await db.comment.findUnique({ where: { id } });
        if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const updated = await db.comment.update({
            where: { id },
            data: { isResolved }
        });

        return NextResponse.json({ success: true, comment: updated });
    } catch (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}
