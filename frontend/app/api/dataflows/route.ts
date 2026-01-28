import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const dataflows = await db.dataflow.findMany({
            where: { userId: session.user.id },
            include: {
                runs: {
                    orderBy: { startedAt: 'desc' },
                    take: 1
                },
                _count: { select: { steps: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json({ success: true, dataflows });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { name, description, schedule, steps } = body;

        const dataflow = await db.dataflow.create({
            data: {
                name,
                description,
                schedule,
                userId: session.user.id,
                steps: {
                    create: steps.map((step: any, index: number) => ({
                        order: index,
                        name: step.name,
                        type: step.type,
                        config: step.config
                    }))
                }
            }
        });

        return NextResponse.json({ success: true, dataflow });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}
