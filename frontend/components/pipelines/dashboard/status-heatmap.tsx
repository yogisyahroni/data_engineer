"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface PipelineStatus {
    id: string;
    name: string;
    lastStatus: string | null;
    lastRunAt: string | null;
}

interface StatusHeatmapProps {
    pipelines: PipelineStatus[];
}

export function StatusHeatmap({ pipelines }: StatusHeatmapProps) {
    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Pipeline Health Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    <TooltipProvider>
                        {pipelines.map((p) => (
                            <Tooltip key={p.id}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "h-8 w-8 rounded-md cursor-help transition-opacity hover:opacity-80",
                                            p.lastStatus === 'SUCCESS' ? "bg-green-500" :
                                                p.lastStatus === 'FAILED' ? "bg-red-500" :
                                                    "bg-gray-200 dark:bg-gray-700"
                                        )}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-xs">
                                        <div className="font-semibold">{p.name}</div>
                                        <div>Status: {p.lastStatus || 'Never Run'}</div>
                                        {p.lastRunAt && <div>Last Run: {formatDistanceToNow(new Date(p.lastRunAt))} ago</div>}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </TooltipProvider>
                    {pipelines.length === 0 && (
                        <div className="col-span-full text-sm text-muted-foreground text-center py-4">
                            No pipelines found.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
