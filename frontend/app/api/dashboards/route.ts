import { type NextRequest, NextResponse } from 'next/server';
import { dashboardRepo } from '@/lib/repositories/dashboard-repo';

// GET /api/dashboards - List all dashboards
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId') || 'user_123'; // Default to mock user for now

        const dashboards = await dashboardRepo.findAllByUserId(userId);

        return NextResponse.json({
            success: true,
            data: dashboards,
            count: dashboards.length,
        });
    } catch (error) {
        console.error('[API] Error fetching dashboards:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// POST /api/dashboards - Create new dashboard
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, description, collectionId, tags = [] } = body;

        if (!name || !collectionId) {
            return NextResponse.json(
                { success: false, error: 'Dashboard name and collectionId are required' },
                { status: 400 }
            );
        }

        const newDashboard = await dashboardRepo.create({
            name,
            description,
            collectionId,
            userId: 'user_123', // TODO: Get from auth
            isPublic: false,
            // tags are not in schema yet, ignoring
        });

        return NextResponse.json({
            success: true,
            data: newDashboard,
        });
    } catch (error) {
        console.error('[API] Error creating dashboard:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
