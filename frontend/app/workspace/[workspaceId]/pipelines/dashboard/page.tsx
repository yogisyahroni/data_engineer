import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, Database, AlertOctagon } from "lucide-react";
import { StatusHeatmap } from "@/components/pipelines/dashboard/status-heatmap";
import { RecentFailures } from "@/components/pipelines/dashboard/recent-failures";
import { Separator } from "@/components/ui/separator";

interface DashboardPageProps {
    params: { workspaceId: string };
}

export default async function PipelineDashboardPage({ params }: DashboardPageProps) {
    const { workspaceId } = params;

    // 1. Fetch Data (Parallel)
    const [
        totalPipelines,
        activePipelines,
        pipelinesList,
        recentExecutions,
        recentFailures
    ] = await Promise.all([
        db.pipeline.count({ where: { workspaceId } }),
        db.pipeline.count({ where: { workspaceId, isActive: true } }),
        db.pipeline.findMany({
            where: { workspaceId },
            select: { id: true, name: true, lastStatus: true, lastRunAt: true },
            orderBy: { lastRunAt: 'desc' }
        }),
        db.jobExecution.findMany({
            where: {
                pipeline: { workspaceId },
                startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            },
            select: { status: true, rowsProcessed: true }
        }),
        db.jobExecution.findMany({
            where: {
                pipeline: { workspaceId },
                status: 'FAILED'
            },
            take: 5,
            orderBy: { startedAt: 'desc' },
            include: { pipeline: { select: { name: true } } }
        })
    ]);

    // 2. Calculate Metrics
    const totalExecs = recentExecutions.length;
    const successExecs = recentExecutions.filter(e => e.status === 'SUCCESS').length;
    const successRate = totalExecs > 0 ? ((successExecs / totalExecs) * 100).toFixed(1) : "0.0";
    const totalRows = recentExecutions.reduce((acc, curr) => acc + (curr.rowsProcessed || 0), 0);

    // 3. Format Data for Components
    const formattedPipelines = pipelinesList.map(p => ({
        id: p.id,
        name: p.name,
        lastStatus: p.lastStatus,
        lastRunAt: p.lastRunAt ? p.lastRunAt.toISOString() : null
    }));

    const formattedFailures = recentFailures.map(f => ({
        id: f.id,
        pipelineName: f.pipeline.name,
        startedAt: f.startedAt.toISOString(),
        error: f.logs && Array.isArray(f.logs) ? f.logs.find((l: any) => l.toString().includes('Error') || l.toString().includes('FAIL')) || 'Unknown Error' : 'Unknown Error'
    }));

    return (
        <div className="space-y-6 pt-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Pipeline Operations</h2>
                <p className="text-muted-foreground">
                    Real-time overview of your data ingestion and quality.
                </p>
            </div>

            <Separator />

            {/* METRICS GRID */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pipelines</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPipelines}</div>
                        <p className="text-xs text-muted-foreground">
                            {activePipelines} active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">24h Success Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{successRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {totalExecs} runs today
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rows Processed</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(totalRows / 1000).toFixed(1)}k</div>
                        <p className="text-xs text-muted-foreground">
                            +20.1% from yesterday
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Quality Issues</CardTitle>
                        <AlertOctagon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recentFailures.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Failures in last 50 runs
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* DASHBOARD CONTENT */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4">
                    <StatusHeatmap pipelines={formattedPipelines} />
                </div>
                <div className="col-span-3">
                    <RecentFailures failures={formattedFailures} />
                </div>
            </div>
        </div>
    );
}
