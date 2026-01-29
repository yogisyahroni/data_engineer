
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        // We check if the feed exists and if the current user created it OR has admin rights
        const feed = await db.queryFeed.findUnique({
            where: { id }
        });

        if (!feed) {
            return NextResponse.json({ error: "Feed not found" }, { status: 404 });
        }

        if (feed.createdBy !== session.user.id) {
            // Technically we should check workspace role too, but for MVP strict ownership is safer
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        await db.queryFeed.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
