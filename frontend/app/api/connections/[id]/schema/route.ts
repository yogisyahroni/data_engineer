import { type NextRequest, NextResponse } from 'next/server';
import { connectionService } from '@/lib/services/connection-service';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET /api/connections/[id]/schema - Fetch database schema
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;
        const useMock = request.nextUrl.searchParams.get('mock') === 'true';

        // If mock flag is set or connection fails, return mock schema
        if (useMock) {
            const mockSchema = connectionService.getMockSchema();
            return NextResponse.json({
                success: true,
                data: mockSchema,
                isMock: true,
            });
        }

        const connection = await connectionService.getConnection(id);
        if (!connection) {
            return NextResponse.json(
                { success: false, error: 'Connection not found' },
                { status: 404 }
            );
        }

        // Try to fetch real schema, fallback to mock if it fails
        const schema = await connectionService.fetchSchema(id);

        if (!schema) {
            // Fallback to mock data for demo purposes
            const mockSchema = connectionService.getMockSchema();
            return NextResponse.json({
                success: true,
                data: mockSchema,
                isMock: true,
                message: 'Using mock schema - real database connection failed',
            });
        }

        return NextResponse.json({
            success: true,
            data: schema,
            isMock: false,
        });
    } catch (error) {
        console.error('[API] Error fetching schema:', error);

        // Even on error, return mock schema for demo
        const mockSchema = connectionService.getMockSchema();
        return NextResponse.json({
            success: true,
            data: mockSchema,
            isMock: true,
            message: 'Using mock schema due to error',
        });
    }
}
