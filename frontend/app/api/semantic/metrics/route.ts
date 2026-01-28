import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { CreateMetricSchema } from '@/lib/validation/semantic-schemas';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    try {
        const metrics = await db.metric.findMany({
            where: { connectionId },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(metrics);
    } catch (error) {
        console.error('[API] Fetch Metrics Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.json();
        const data = CreateMetricSchema.parse(rawBody);

        // Protocol 4: Security
        // In a production app, we would verify ownership here
        const userId = "temp-user-id"; // TODO: Use real auth

        const metric = await db.metric.create({
            data: {
                ...data,
                userId,
            },
        });

        return NextResponse.json(metric);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
        }
        console.error('[API] Create Metric Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
