import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UpdateMetricSchema } from '@/lib/validation/semantic-schemas';
import { z } from 'zod';

/**
 * PATCH /api/semantic/metrics/[id]
 * Update a metric
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const validatedData = UpdateMetricSchema.parse(body);

        // TODO: Get real userId from session
        const userId = 'user_123';

        // Verify metric exists and user owns it
        const existing = await db.metric.findFirst({
            where: {
                id: params.id,
                userId,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Metric not found or access denied' },
                { status: 404 }
            );
        }

        // Update metric
        const metric = await db.metric.update({
            where: { id: params.id },
            data: validatedData,
        });

        return NextResponse.json(metric);
    } catch (error: any) {
        console.error('PATCH /api/semantic/metrics/[id] error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', issues: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update metric', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/semantic/metrics/[id]
 * Delete a metric
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // TODO: Get real userId from session
        const userId = 'user_123';

        // Verify metric exists and user owns it
        const existing = await db.metric.findFirst({
            where: {
                id: params.id,
                userId,
            },
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Metric not found or access denied' },
                { status: 404 }
            );
        }

        // Delete metric
        await db.metric.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/semantic/metrics/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete metric', details: error.message },
            { status: 500 }
        );
    }
}
