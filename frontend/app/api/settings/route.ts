import { type NextRequest, NextResponse } from 'next/server';
import { settingsRepo } from '@/lib/repositories/settings-repo';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
        return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    const value = await settingsRepo.get(key);
    return NextResponse.json({ success: true, data: value });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { key, value } = body;

        if (!key) {
            return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
        }

        await settingsRepo.set(key, value);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Settings error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
