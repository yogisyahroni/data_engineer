import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        // Retrieve the RAW token (JWS string)
        const token = await getToken({
            req: request as any,
            secret: process.env.NEXTAUTH_SECRET,
            raw: true,
        });

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return NextResponse.json({ token });
    } catch (error) {
        console.error('[API] Error getting token:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
