import { type NextRequest, NextResponse } from 'next/server';
import { RelationshipService } from '@/lib/services/relationship-service';
import { z } from 'zod';
import { CreateRelationshipSchema } from '@/lib/validation/semantic-schemas';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    try {
        const relationships = await RelationshipService.getRelationships(connectionId);
        return NextResponse.json(relationships);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = CreateRelationshipSchema.parse(body);

        // TODO: Get real userId from session
        const userId = 'user_123';

        const relationship = await RelationshipService.createRelationship({
            ...validated,
            userId,
        });

        return NextResponse.json(relationship, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
