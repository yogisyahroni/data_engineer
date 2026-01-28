import { NextRequest, NextResponse } from 'next/server';
import { IngestionService } from '@/lib/services/ingestion-service';

/**
 * Enterprise Data Ingestion API
 * Handles Excel/CSV uploads and projects them into SQL tables
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string || 'anonymous';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        if (fileExtension !== 'xlsx' && fileExtension !== 'csv') {
            return NextResponse.json({ success: false, error: 'Unsupported file format' }, { status: 400 });
        }

        const result = await IngestionService.ingestFromFile(
            userId,
            file.name,
            buffer,
            fileExtension as 'xlsx' | 'csv'
        );

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
