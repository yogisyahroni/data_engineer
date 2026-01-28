
import { NextRequest, NextResponse } from 'next/server';
import { agentService } from '@/lib/services/agent-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // 1. Security Check
    const authHeader = request.headers.get('x-cron-secret');
    const validSecret = process.env.CRON_SECRET || 'schedule_secret_123';

    if (authHeader !== validSecret) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[Scheduler] 🤖 Starting AI Agents...');
        const results = await agentService.runDueAgents();

        return NextResponse.json({
            success: true,
            triggered: results.length,
            details: results
        });

    } catch (error) {
        console.error('[Scheduler] Agent Run Failed:', error);
        return NextResponse.json({ success: false, error: 'Internal Scheduler Error' }, { status: 500 });
    }
}
