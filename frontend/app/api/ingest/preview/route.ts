import { type NextRequest, NextResponse } from 'next/server';
import { IngestionService } from '@/lib/services/ingestion-service';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileType = file.name.endsWith('.xlsx') ? 'xlsx' : 'csv';

        const preview = await IngestionService.getPreview(buffer, fileType);

        return NextResponse.json(preview);
    } catch (error: any) {
        console.error('[Ingest Preview API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
