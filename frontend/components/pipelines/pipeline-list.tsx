
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, Clock, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePipelines } from "@/hooks/use-pipelines";
import { cn } from "@/lib/utils";

interface PipelineListProps {
    workspaceId: string;
}

export function PipelineList({ workspaceId }: PipelineListProps) {
    const router = useRouter();
    const {
        pipelines,
        isLoading,
        error,
        fetchPipelines,
        runPipeline,
    } = usePipelines({ workspaceId });

    useEffect(() => {
        fetchPipelines();
    }, [fetchPipelines]);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    const handleRunNow = async (id: string) => {
        toast.info("Triggering pipeline...");
        const result = await runPipeline(id);

        if (result.success) {
            toast.success("Pipeline started successfully");
        } else {
            toast.error(result.error || "Failed to trigger pipeline");
        }
    };

    if (isLoading) return <div>Loading pipelines...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Data Pipelines</h2>
                <Button onClick={() => router.push(`/workspace/${workspaceId}/pipelines/new`)}>
                    <Plus className="mr-2 h-4 w-4" /> New Pipeline
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Last Run</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pipelines.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">
                                    No pipelines found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pipelines.map((pipeline) => (
                                <TableRow
                                    key={pipeline.id}
                                    className={cn(
                                        (pipeline as any)._optimistic && "opacity-70"
                                    )}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="flex items-center gap-2 cursor-pointer hover:underline"
                                                onClick={() => router.push(`/workspace/${workspaceId}/pipelines/${pipeline.id}`)}
                                            >
                                                {pipeline.name}
                                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                            </div>

                                            {/* Optimistic state badges */}
                                            {(pipeline as any)._optimistic && (pipeline as any)._status === 'pending' && (
                                                <Badge variant="secondary" className="ml-2">
                                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                                    Saving...
                                                </Badge>
                                            )}

                                            {(pipeline as any)._status === 'error' && (
                                                <Badge variant="destructive" className="ml-2">
                                                    Failed
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{pipeline.mode || 'ELT'}</Badge>
                                    </TableCell>
                                    <TableCell>{pipeline.sourceType}</TableCell>
                                    <TableCell>
                                        {pipeline.scheduleCron ? (
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                {pipeline.scheduleCron}
                                            </div>
                                        ) : (
                                            "Manual"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {pipeline.lastRunAt ? format(new Date(pipeline.lastRunAt), "PP p") : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {pipeline.lastStatus && (
                                            <Badge variant={pipeline.lastStatus === 'SUCCESS' ? 'default' : 'destructive'}>
                                                {pipeline.lastStatus}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleRunNow(pipeline.id)}>
                                            <Play className="h-4 w-4 mr-1" /> Run
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
