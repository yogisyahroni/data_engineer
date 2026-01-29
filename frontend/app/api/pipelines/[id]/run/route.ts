
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import { getPipelineQueue } from '@/lib/queue/queue';

export async function POST(
    req: NextRequest,
    props: any // Relaxed type for cross-version compatibility
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const pipelineId = params.id;
    if (!pipelineId) return new NextResponse('Pipeline ID required', { status: 400 });

    try {
        const pipeline = await db.pipeline.findUnique({
            where: { id: pipelineId }
        });

        if (!pipeline) return new NextResponse('Pipeline not found', { status: 404 });

        // Create Execution Record
        const execution = await db.jobExecution.create({
            data: {
                pipelineId,
                status: 'PENDING'
            }
        });

        // Add to Queue
        await getPipelineQueue().add('extract-load', {
            pipelineId,
            executionId: execution.id,
            sourceType: pipeline.sourceType
        });

        return NextResponse.json(execution);
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
