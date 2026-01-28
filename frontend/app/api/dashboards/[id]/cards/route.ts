import { type NextRequest, NextResponse } from 'next/server';
import type { DashboardCard, VisualizationConfig } from '@/lib/types';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// Mock cards storage
const getMockCards = (dashboardId: string): DashboardCard[] => {
    const cards: Record<string, DashboardCard[]> = {
        'dash_1': [
            {
                id: 'card_1',
                dashboardId: 'dash_1',
                queryId: 'query_1',
                position: { x: 0, y: 0, w: 6, h: 4 },
                visualizationConfig: { chartType: 'bar', xAxis: 'customer_name', yAxis: 'total_sales' },
            },
            {
                id: 'card_2',
                dashboardId: 'dash_1',
                queryId: 'query_2',
                position: { x: 6, y: 0, w: 6, h: 4 },
                visualizationConfig: { chartType: 'line', xAxis: 'month', yAxis: 'revenue' },
            },
            {
                id: 'card_3',
                dashboardId: 'dash_1',
                queryId: 'query_3',
                position: { x: 0, y: 4, w: 4, h: 3 },
                visualizationConfig: { chartType: 'pie', xAxis: 'segment', yAxis: 'count' },
            },
        ],
    };
    return cards[dashboardId] || [];
};

// GET /api/dashboards/[id]/cards - List all cards in dashboard
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id } = await context.params;

        const cards = getMockCards(id);

        return NextResponse.json({
            success: true,
            data: cards,
            count: cards.length,
        });
    } catch (error) {
        console.error('[API] Error fetching cards:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// POST /api/dashboards/[id]/cards - Add card to dashboard
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id: dashboardId } = await context.params;
        const body = await request.json();
        const { queryId, position, visualizationConfig, title } = body;

        if (!queryId) {
            return NextResponse.json(
                { success: false, error: 'Query ID is required' },
                { status: 400 }
            );
        }

        const newCard: DashboardCard = {
            id: `card_${Date.now()}`,
            dashboardId,
            queryId,
            title,
            position: position || { x: 0, y: 0, w: 6, h: 4 },
            visualizationConfig: visualizationConfig || { chartType: 'bar' },
        };

        console.log('[API] Card added to dashboard:', dashboardId, newCard.id);

        return NextResponse.json({
            success: true,
            data: newCard,
        });
    } catch (error) {
        console.error('[API] Error adding card:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// PUT /api/dashboards/[id]/cards - Update card positions (bulk update)
export async function PUT(request: NextRequest, context: RouteContext) {
    try {
        const { id: dashboardId } = await context.params;
        const body = await request.json();
        const { cards } = body as { cards: Array<{ id: string; position: { x: number; y: number; w: number; h: number } }> };

        if (!cards || !Array.isArray(cards)) {
            return NextResponse.json(
                { success: false, error: 'Cards array is required' },
                { status: 400 }
            );
        }

        console.log('[API] Updated card positions for dashboard:', dashboardId, cards.length, 'cards');

        return NextResponse.json({
            success: true,
            message: `Updated ${cards.length} cards`,
        });
    } catch (error) {
        console.error('[API] Error updating cards:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// DELETE /api/dashboards/[id]/cards - Remove card from dashboard (requires cardId in body)
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const { id: dashboardId } = await context.params;
        const body = await request.json();
        const { cardId } = body;

        if (!cardId) {
            return NextResponse.json(
                { success: false, error: 'Card ID is required' },
                { status: 400 }
            );
        }

        console.log('[API] Card removed from dashboard:', dashboardId, cardId);

        return NextResponse.json({
            success: true,
            message: 'Card removed successfully',
        });
    } catch (error) {
        console.error('[API] Error removing card:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
