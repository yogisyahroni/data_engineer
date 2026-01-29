
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiRequest } from '@/lib/auth/api-auth-middleware';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const updatedMetric = await db.virtualMetric.update({
            where: { id: params.id },
            data: {
                name: body.name,
                description: body.description,
                expression: body.expression,
                format: body.format
            }
        });

        return NextResponse.json({ success: true, metric: updatedMetric });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await db.virtualMetric.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
