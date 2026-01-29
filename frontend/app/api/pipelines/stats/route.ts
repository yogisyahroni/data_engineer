import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
        }

        // 1. Pipeline Counts
        const totalPipelines = await db.pipeline.count({
            where: { workspaceId }
        });

        const activePipelines = await db.pipeline.count({
            where: { workspaceId, isActive: true }
        });

        // 2. Job Executions (Last 24h)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const recentExecutions = await db.jobExecution.findMany({
            where: {
                pipeline: { workspaceId },
                startedAt: { gte: oneDayAgo }
            },
            select: {
                status: true,
                rowsProcessed: true,
                duration: true
            }
        });

        const totalExecutions = recentExecutions.length;
        const failedExecutions = recentExecutions.filter(e => e.status === 'FAILED').length;
        const successExecutions = recentExecutions.filter(e => e.status === 'SUCCESS').length;

        const successRate = totalExecutions > 0
            ? ((successExecutions / totalExecutions) * 100).toFixed(1)
            : 0;

        const totalRowsProcessed = recentExecutions.reduce((acc, curr) => acc + (curr.rowsProcessed || 0), 0);

        // 3. Recent Failures (Top 5)
        const recentFailures = await db.jobExecution.findMany({
            where: {
                pipeline: { workspaceId },
                status: 'FAILED'
            },
            take: 5,
            orderBy: { startedAt: 'desc' },
            include: {
                pipeline: { select: { name: true } }
            }
        });

        // 4. All Pipelines for Heatmap
        const allPipelines = await db.pipeline.findMany({
            where: { workspaceId },
            select: {
                id: true,
                name: true,
                lastStatus: true,
                lastRunAt: true
            },
            orderBy: { lastRunAt: 'desc' }
        });

        return NextResponse.json({
            overview: {
                totalPipelines,
                activePipelines,
                successRate,
                totalRowsProcessed,
                totalExecutions
            },
            pipelines: allPipelines,
            recentFailures: recentFailures.map(f => ({
                id: f.id,
                pipelineName: f.pipeline.name,
                startedAt: f.startedAt,
                error: f.logs && Array.isArray(f.logs) ? f.logs.find((l: any) => l.toString().includes('Error') || l.toString().includes('FAIL')) || 'Unknown Error' : 'Unknown Error'
            }))
        });

    } catch (error: any) {
        console.error("[Stats API] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
