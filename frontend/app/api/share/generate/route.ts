import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { resourceType, resourceId, expiresAt, password } = body;

        if (!['DASHBOARD', 'QUERY'].includes(resourceType)) {
            return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });
        }

        // Validate resource ownership
        if (resourceType === 'DASHBOARD') {
            const dashboard = await db.dashboard.findUnique({ where: { id: resourceId } });
            if (!dashboard || dashboard.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        } else {
            const query = await db.savedQuery.findUnique({ where: { id: resourceId } });
            if (!query || query.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const token = nanoid(10); // Short, URL-safe

        const shareLink = await db.shareLink.create({
            data: {
                token,
                resourceType,
                // Assign FK based on type
                dashboardId: resourceType === 'DASHBOARD' ? resourceId : undefined,
                queryId: resourceType === 'QUERY' ? resourceId : undefined,

                expiresAt: expiresAt ? new Date(expiresAt) : null,
                // In real app, hash this password!
                password: password || null,
                userId: session.user.id
            }
        });

        const publicUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/share/${token}`;

        return NextResponse.json({ success: true, token, url: publicUrl });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }
}
