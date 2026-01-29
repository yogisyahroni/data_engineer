
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiRequest } from '@/lib/auth/api-auth-middleware';
import * as z from 'zod';

const createMetricSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    expression: z.string().min(1), // e.g., "(${profit} / ${revenue})"
    format: z.string().optional() // 'currency', 'percent'
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    // params.id is modelId
    const auth = await authenticateApiRequest(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics = await db.virtualMetric.findMany({
        where: { modelId: params.id },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, metrics });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const data = createMetricSchema.parse(body);

        const newMetric = await db.virtualMetric.create({
            data: {
                modelId: params.id,
                name: data.name,
                description: data.description,
                expression: data.expression,
                format: data.format,
            }
        });

        return NextResponse.json({ success: true, metric: newMetric });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
