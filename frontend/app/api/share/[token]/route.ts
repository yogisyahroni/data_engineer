import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    try {
        const shareLink = await db.shareLink.findUnique({
            where: { token },
            include: {
                dashboard: {
                    include: {
                        cards: { include: { query: true } } // Fetch query data if needed
                    }
                },
                query: true
            }
        });

        if (!shareLink) {
            return NextResponse.json({ error: 'Link not found or expired' }, { status: 404 });
        }

        // Check Expiry
        if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
            return NextResponse.json({ error: 'Link expired' }, { status: 410 });
        }

        // Check Password (Basic Check)
        const passwordHeader = req.headers.get('x-share-password');
        if (shareLink.password && shareLink.password !== passwordHeader) {
            return NextResponse.json({ error: 'Password required' }, { status: 403 });
        }

        // Increment View Count
        await db.shareLink.update({
            where: { id: shareLink.id },
            data: { viewCount: { increment: 1 }, lastViewedAt: new Date() }
        });

        // Strip sensitive data before returning
        // We only return the specific resource requested
        let data = null;
        if (shareLink.resourceType === 'DASHBOARD') data = shareLink.dashboard;
        else if (shareLink.resourceType === 'QUERY') data = shareLink.query;

        return NextResponse.json({
            success: true,
            type: shareLink.resourceType,
            data
        });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

