import { NextRequest, NextResponse } from 'next/server';
import { kMeansCluster, ClusterOptions } from '@/lib/analytics/clustering';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { data, features, k } = body as ClusterOptions;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        if (!features || features.length === 0) {
            return NextResponse.json({ error: 'Features required' }, { status: 400 });
        }
        if (!k || k < 2) {
            return NextResponse.json({ error: 'K must be >= 2' }, { status: 400 });
        }

        const result = kMeansCluster({ data, features, k });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Clustering Error:', error);
        return NextResponse.json({ error: 'Failed to perform clustering' }, { status: 500 });
    }
}
