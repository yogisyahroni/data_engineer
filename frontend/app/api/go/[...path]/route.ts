import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const GO_BACKEND_URL = process.env.GO_BACKEND_URL || 'http://localhost:8080';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyToGo(request, params.path, 'GET');
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyToGo(request, params.path, 'POST');
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyToGo(request, params.path, 'PUT');
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    return proxyToGo(request, params.path, 'DELETE');
}

async function proxyToGo(
    request: NextRequest,
    path: string[],
    method: string
) {
    try {
        // Get JWT token directly from NextAuth
        const token = await getToken({
            req: request as any,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Build target URL
        const targetPath = path.join('/');
        const searchParams = request.nextUrl.searchParams.toString();
        const targetUrl = `${GO_BACKEND_URL}/api/${targetPath}${searchParams ? `?${searchParams}` : ''}`;

        console.log(`[API Proxy] ${method} ${targetUrl}`);

        // Prepare headers - use the JWT token directly
        const headers: HeadersInit = {
            'Authorization': `Bearer ${JSON.stringify(token)}`,
            'Content-Type': 'application/json',
        };

        // Prepare request options
        const options: RequestInit = {
            method,
            headers,
        };

        // Add body for POST/PUT
        if (method === 'POST' || method === 'PUT') {
            const body = await request.text();
            if (body) {
                options.body = body;
            }
        }

        // Forward request to Go backend
        const response = await fetch(targetUrl, options);
        const data = await response.text();

        // Return response
        return new NextResponse(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
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
