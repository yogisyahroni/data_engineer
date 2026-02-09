import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const rawToken = await getToken({
        req: req as any,
        secret: process.env.NEXTAUTH_SECRET,
        raw: true
    });

    const decodedToken = await getToken({
        req: req as any,
        secret: process.env.NEXTAUTH_SECRET,
        raw: false
    });

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 10) + '...' }));

    return NextResponse.json({
        status: 'diagnostics',
        env_secret_len: process.env.NEXTAUTH_SECRET?.length || 0,
        token_found: !!rawToken,
        token_preview: rawToken ? rawToken.substring(0, 20) + '...' : null,
        token_parts: rawToken ? rawToken.split('.').length : 0,
        decoded: decodedToken,
        cookies: allCookies,
        backend_url: process.env.GO_BACKEND_URL
    });
}
