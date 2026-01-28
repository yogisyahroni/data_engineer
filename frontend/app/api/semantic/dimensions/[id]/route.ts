import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UpdateDimensionSchema } from '@/lib/validation/semantic-schemas';
import { z } from 'zod';

/**
 * PATCH /api/semantic/dimensions/[id]
 * Update a dimension
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const validatedData = UpdateDimensionSchema.parse(body);

        // TODO: Get real userId from session
        const userId = 'user_123';

        // Verify dimension exists and user owns it
        const existing = await db.dimension.findFirst({
            where: {
                id: params.id,
                userId,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Dimension not found or access denied' },
                { status: 404 }
            );
        }

        // Update dimension
        const dimension = await db.dimension.update({
            where: { id: params.id },
            data: validatedData,
        });

        return NextResponse.json(dimension);
    } catch (error: any) {
        console.error('PATCH /api/semantic/dimensions/[id] error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', issues: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update dimension', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/semantic/dimensions/[id]
 * Delete a dimension
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // TODO: Get real userId from session
        const userId = 'user_123';

        // Verify dimension exists and user owns it
        const existing = await db.dimension.findFirst({
            where: {
                id: params.id,
                userId,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Dimension not found or access denied' },
                { status: 404 }
            );
        }

        // Delete dimension
        await db.dimension.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/semantic/dimensions/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete dimension', details: error.message },
            { status: 500 }
        );
    }
}
