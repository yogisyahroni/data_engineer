
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateApiRequest } from '@/lib/auth/api-auth-middleware';
import * as z from 'zod';

const createModelSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    connectionId: z.string(),
    workspaceId: z.string(),
    tableName: z.string().optional(),
    sqlQuery: z.string().optional(),
    columnMetadata: z.record(z.any()).optional()
});

export async function GET(req: NextRequest) {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
        return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // TODO: Add Authorization Check (Is user member of workspace?)
    // For now assuming Auth middleware covers identity, checking membership is next step.

    const models = await db.modelDefinition.findMany({
        where: {
            workspaceId: workspaceId
        },
        include: {
            virtualMetrics: true,
            connection: {
                select: { name: true, type: true }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ success: true, models });
}

export async function POST(req: NextRequest) {
    const auth = await authenticateApiRequest(req);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const data = createModelSchema.parse(body);

        // Validate: Either tableName or sqlQuery must be present
        if (!data.tableName && !data.sqlQuery) {
            return NextResponse.json({ error: 'Must provide either tableName or sqlQuery' }, { status: 400 });
        }

        const newModel = await db.modelDefinition.create({
            data: {
                ...data,
                columnMetadata: data.columnMetadata || {}
            }
        });

        return NextResponse.json({ success: true, model: newModel });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
