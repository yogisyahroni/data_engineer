import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyToGo(request, path, 'GET');
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyToGo(request, path, 'POST');
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyToGo(request, path, 'PUT');
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyToGo(request, path, 'DELETE');
}

async function proxyToGo(
    request: NextRequest,
    path: string[],
    method: string
) {
    const debugPrefix = `[DEBUG-FINAL] [${method} /${path.join('/')}]`;
    console.error(`${debugPrefix} Incoming request`);

    try {
        if (!process.env.NEXTAUTH_SECRET) {
            console.error(`${debugPrefix} CRITICAL: NEXTAUTH_SECRET is missing in route.ts env!`);
        }

        // Get session token from NextAuth to validate that user is authenticated
        // CRITICAL FIX: Use raw: true to get the exact JWS that the Go backend expects
        const sessionToken = await getToken({
            req: request as any,
            secret: process.env.NEXTAUTH_SECRET,
            raw: true,
        });

        const hasToken = !!sessionToken;
        console.error(`${debugPrefix} Token found: ${hasToken}`);

        if (hasToken) {
            const parts = sessionToken.split('.');
            console.error(`${debugPrefix} Token parts: ${parts.length}, Preview: ${sessionToken.substring(0, 15)}...`);
        }

        if (!sessionToken) {
            console.error(`${debugPrefix} No session token found - returning 401`);
            return NextResponse.json(
                { error: 'Unauthorized - Please login first' },
                { status: 401 }
            );
        }

        // Build target URL
        const targetPath = path.join('/');
        const searchParams = request.nextUrl.searchParams.toString();
        const fullTargetUrl = `${GO_BACKEND_URL}/api/${targetPath}${searchParams ? `?${searchParams}` : ''}`;

        console.error(`[DEBUG-FINAL] Forwarding to: ${method} ${fullTargetUrl}`);

        // Prepare headers - forward authorization header to Go backend
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            // Forward all cookies from the original request to Go backend (optional but good for other cookies)
            'Cookie': request.headers.get('cookie') || '',
            // FORCE the correct Authorization header from the resolved internal token
            'Authorization': `Bearer ${sessionToken}`,
        };

        // Prepare request options
        const options: RequestInit = {
            method,
            headers,
            // Forward the cookies to backend - use 'omit' to let fetch handle cookies properly via the headers above
            credentials: 'include',
        };

        // Add body for POST/PUT
        if (method === 'POST' || method === 'PUT') {
            const body = await request.text();
            if (body) {
                options.body = body;
            }
        }

        // Forward request to Go backend
        const response = await fetch(fullTargetUrl, options);

        console.error(`[DEBUG-FINAL] Backend response status: ${response.status}`);

        // Handle non-JSON responses from backend gracefully
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.text(); // Get text first to ensure we can proxy it even if invalid json
        } else {
            data = await response.text();
        }

        // Return response
        return new NextResponse(data, {
            status: response.status,
            headers: {
                'Content-Type': contentType || 'application/json',
            },
        });
    } catch (error) {
        console.error('[API Proxy] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
