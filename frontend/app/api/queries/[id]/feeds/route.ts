
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: queryId } = await params;
        const body = await req.json();
        const { name, format = "csv" } = body;

        // Verify ownership or edit access
        // For MVP, user must be the creator of the query OR in the workspace (simplified)
        // Here we check if query exists
        const query = await db.savedQuery.findUnique({
            where: { id: queryId }
        });

        if (!query) {
            return NextResponse.json({ error: "Query not found" }, { status: 404 });
        }

        const feed = await db.queryFeed.create({
            data: {
                queryId,
                name: name || `Feed for ${query.title}`,
                format,
                createdBy: session.user.id,
            }
        });

        return NextResponse.json(feed);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: queryId } = await params;

        const feeds = await db.queryFeed.findMany({
            where: { queryId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(feeds);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
