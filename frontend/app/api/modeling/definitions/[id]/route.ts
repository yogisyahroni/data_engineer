
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiRequest } from '@/lib/auth/api-auth-middleware';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const model = await db.modelDefinition.findUnique({
        where: { id: params.id },
        include: {
            virtualMetrics: true,
            connection: { select: { name: true, type: true } }
        }
    });

    if (!model) {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, model });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        // Allow partial updates
        const updatedModel = await db.modelDefinition.update({
            where: { id: params.id },
            data: {
                name: body.name,
                description: body.description,
                columnMetadata: body.columnMetadata,
                sqlQuery: body.sqlQuery,
                tableName: body.tableName
            }
        });

        return NextResponse.json({ success: true, model: updatedModel });
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
        await db.modelDefinition.delete({
            where: { id: params.id }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
