
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PipelineHistory } from "@/components/pipelines/pipeline-history";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function PipelineDetailPage(
    props: { params: { workspaceId: string, id: string } }
) {
    const params = props.params;
    const pipeline = await db.pipeline.findUnique({
        where: { id: params.id, workspaceId: params.workspaceId },
        include: {
            executions: {
                orderBy: { startedAt: 'desc' },
                take: 50
            }
        }
    });

    if (!pipeline) return notFound();

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
                <Link href={`/workspace/${params.workspaceId}/pipelines`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {pipeline.name}
                        {pipeline.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Paused</Badge>}
                    </h1>
                    <p className="text-muted-foreground">{pipeline.description || "No description"}</p>
                </div>
                <div className="ml-auto">
                    {/* Run Button (Client Component Trigger needed for interactivity here, but simplified link/action for now) */}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-1 border rounded p-4 bg-muted/20 space-y-4">
                    <h3 className="font-semibold">Configuration</h3>
                    <div className="text-sm grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Source:</span>
                        <span className="font-medium">{pipeline.sourceType}</span>

                        <span className="text-muted-foreground">Schedule:</span>
                        <span className="font-medium">{pipeline.scheduleCron || "Manual"}</span>

                        <span className="text-muted-foreground">Last Run:</span>
                        <span className="font-medium">{pipeline.lastRunAt?.toLocaleString() || "Never"}</span>

                        <span className="text-muted-foreground">Last Status:</span>
                        <span className="font-medium">{pipeline.lastStatus || "-"}</span>
                    </div>
                </div>

                <div className="col-span-2">
                    <h3 className="font-semibold mb-4">Run History</h3>
                    <PipelineHistory executions={pipeline.executions} />
                </div>
            </div>
        </div>
    );
}
