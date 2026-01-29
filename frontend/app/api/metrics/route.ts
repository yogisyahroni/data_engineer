import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const MetricSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().min(1, "Description is required"),
    formula: z.string().min(1, "Formula is required"),
    status: z.enum(['draft', 'verified', 'deprecated']).optional(),
    tags: z.array(z.string()).optional(),
    ownerId: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        const where: any = {};

        if (status && status !== 'all') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { hasSome: [search] } }
            ];
        }

        const metrics = await db.businessMetric.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                queries: {
                    select: { id: true, name: true }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: metrics,
        });
    } catch (error) {
        console.error('[API] Error fetching metrics:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch metrics' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.json();
        const validatedData = MetricSchema.parse(rawBody);

        // Mock User ID for now since we don't have full Auth session context here usually
        // In real app, get from session
        const ownerId = validatedData.ownerId || 'user_123';

        const newMetric = await db.businessMetric.create({
            data: {
                name: validatedData.name,
                description: validatedData.description,
                formula: validatedData.formula,
                status: validatedData.status || 'draft',
                tags: validatedData.tags || [],
                ownerId,
            }
        });

        return NextResponse.json({
            success: true,
            data: newMetric,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Validation Error', details: error.errors },
                { status: 400 }
            );
        }

        console.error('[API] Error creating metric:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
