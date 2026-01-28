
import { type NextRequest, NextResponse } from 'next/server';
import { aggregationService } from '@/lib/services/aggregation-service';
import { z } from 'zod';

const AggregationSchema = z.object({
    connectionId: z.string().min(1),
    table: z.string().min(1),
    dimensions: z.array(
        z.union([
            z.string(),
            z.object({
                column: z.string(),
                timeBucket: z.enum(['day', 'week', 'month', 'year']).optional()
            })
        ])
    ).default([]),
    metrics: z.array(
        z.object({
            column: z.string(),
            type: z.enum(['count', 'sum', 'avg', 'min', 'max']),
            label: z.string().optional()
        })
    ).min(1),
    filters: z.array(
        z.object({
            column: z.string(),
            operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'contains']),
            value: z.any().refine((val) => val !== undefined, { message: "Value is required" })
        })
    ).optional(),
    limit: z.number().optional().default(1000)
});

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.json();
        const validated = AggregationSchema.parse(rawBody);

        // TODO: Get Tenant/Segment from Auth Session
        // For now, mock it or allow passing context for testing, but in production this should be forced from session
        const context = { segment: 'Consumer' }; // Default mock context for RLS testing

        const result = await aggregationService.executeAggregation({
            ...validated,
            context // Inject RLS context
        });

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Validation Error', details: error.errors },
                { status: 400 }
            );
        }

        console.error('[API] Aggregation Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
