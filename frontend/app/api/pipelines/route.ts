
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import { z } from 'zod';

const createPipelineSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    workspaceId: z.string(),
    sourceType: z.string(),
    sourceConfig: z.record(z.any()),
    destinationType: z.string().default('INTERNAL_RAW'),
    destinationConfig: z.record(z.any()).optional(),
    mode: z.string().default('ELT'),
    transformationSteps: z.array(z.any()).optional(),
    qualityRules: z.array(z.any()).optional(), // Phase 21
    scheduleCron: z.string().optional(),
});

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId');

    if (!workspaceId) return new NextResponse('Workspace ID required', { status: 400 });

    const pipelines = await db.pipeline.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(pipelines);
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const body = await req.json();
        const validated = createPipelineSchema.parse(body);

        // Verify Workspace Access
        const membership = await db.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: validated.workspaceId,
                    userId: session.user.id
                }
            }
        });

        if (!membership || !['ADMIN', 'OWNER', 'EDITOR'].includes(membership.role)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const pipeline = await db.pipeline.create({
            data: {
                name: validated.name,
                description: validated.description,
                workspaceId: validated.workspaceId,
                sourceType: validated.sourceType,
                sourceConfig: validated.sourceConfig,
                destinationType: validated.destinationType,
                destinationConfig: validated.destinationConfig,
                mode: validated.mode,
                transformationSteps: validated.transformationSteps || [],
                qualityRules: {
                    create: validated.qualityRules || []
                },
                scheduleCron: validated.scheduleCron,
            }
        });

        return NextResponse.json(pipeline);
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
