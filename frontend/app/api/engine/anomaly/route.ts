import { NextRequest, NextResponse } from 'next/server';
import { detectAnomaliesZScore, detectAnomaliesIQR, AnomalyOptions } from '@/lib/analytics/anomaly';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, valueColumn, method = 'iqr', sensitivity } = body as AnomalyOptions;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        if (!valueColumn) {
            return NextResponse.json({ error: 'Value column required' }, { status: 400 });
        }

        let result;
        if (method === 'z-score') {
            result = detectAnomaliesZScore({ data, valueColumn, method, sensitivity });
        } else {
            result = detectAnomaliesIQR({ data, valueColumn, method, sensitivity });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Anomaly Error:', error);
        return NextResponse.json({ error: 'Failed to detect anomalies' }, { status: 500 });
    }
}
