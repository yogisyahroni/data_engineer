import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Retrieve last 50 activities
        const activities = await db.activity.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true, image: true, email: true } }
            }
        });

        return NextResponse.json({ success: true, activities });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }
}
