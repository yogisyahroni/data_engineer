import { NextRequest, NextResponse } from 'next/server';
import { calculateLinearForecast, calculateHoltWinters, calculateDecompositionForecast, ForecastOptions } from '@/lib/analytics/forecasting';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, dateColumn, valueColumn, periods, model } = body as ForecastOptions;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
        }

        if (!dateColumn || !valueColumn) {
            return NextResponse.json({ error: 'Date and Value columns are required' }, { status: 400 });
        }

        let result;
        if (model === 'exponential_smoothing') {
            result = calculateHoltWinters({ data, dateColumn, valueColumn, periods, model });
        } else {
            // Default to linear
            result = calculateLinearForecast({ data, dateColumn, valueColumn, periods, model: 'linear' });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Forecasting error:', error);
        return NextResponse.json(
            { error: 'Failed to generate forecast' },
            { status: 500 }
        );
    }
}
