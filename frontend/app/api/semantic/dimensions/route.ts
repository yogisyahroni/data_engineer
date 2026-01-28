import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { CreateDimensionSchema } from '@/lib/validation/semantic-schemas';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    try {
        const dimensions = await db.dimension.findMany({
            where: { connectionId },
            orderBy: { tableName: 'asc' },
        });
        return NextResponse.json(dimensions);
    } catch (error) {
        console.error('[API] Fetch Dimensions Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.json();
        const data = CreateDimensionSchema.parse(rawBody);

        const userId = "temp-user-id"; // TODO: Use real auth

        const dimension = await db.dimension.create({
            data: {
                ...data,
                userId,
            },
        });

        return NextResponse.json(dimension);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
        }
        console.error('[API] Create Dimension Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
