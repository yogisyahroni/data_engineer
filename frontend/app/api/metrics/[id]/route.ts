import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

         const metric = await db.businessMetric.findUnique({
            where: { id },
            include: {
                queries: {
                    select: { id: true, name: true, connectionId: true } // type field doesn't exist on SavedQuery model
                }
            }
        });

        if (!metric) {
            return NextResponse.json(
                { success: false, error: 'Metric not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: metric,
        });
    } catch (error) {
        console.error('[API] Error fetching metric:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

const UpdateMetricSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    formula: z.string().optional(),
    status: z.enum(['draft', 'verified', 'deprecated']).optional(),
    tags: z.array(z.string()).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validatedData = UpdateMetricSchema.parse(body);

        const metric = await db.businessMetric.update({
            where: { id },
            data: validatedData,
        });

        return NextResponse.json({
            success: true,
            data: metric,
        });
    } catch (error) {
        console.error('[API] Error updating metric:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await db.businessMetric.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Error deleting metric:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

