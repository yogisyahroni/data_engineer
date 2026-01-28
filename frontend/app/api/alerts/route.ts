import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, queryId, column, operator, threshold, schedule, email } = body;

        // Basic validation
        if (!name || !queryId || !column || !threshold) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const alert = await db.alert.create({
            data: {
                name,
                queryId,
                column,
                operator,
                threshold,
                schedule: schedule || 'hourly',
                email: email || session.user.email,
                userId: session.user.id
            }
        });

        return NextResponse.json({ success: true, alert });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to create alert' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const alerts = await db.alert.findMany({
            where: { userId: session.user.id },
            include: {
                query: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, alerts });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
}
