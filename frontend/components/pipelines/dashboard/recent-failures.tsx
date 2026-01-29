"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Failure {
    id: string;
    pipelineName: string;
    startedAt: string;
    error: string;
}

interface RecentFailuresProps {
    failures: Failure[];
}

export function RecentFailures({ failures }: RecentFailuresProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Recent Failures
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="space-y-4">
                    {failures.map((f) => (
                        <div key={f.id} className="flex flex-col space-y-1 border-b pb-2 last:border-0 last:pb-0">
                            <div className="flex justify-between items-start">
                                <span className="font-medium text-sm">{f.pipelineName}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(new Date(f.startedAt))} ago
                                </span>
                            </div>
                            <div className="text-xs text-destructive font-mono bg-destructive/10 p-1 rounded px-2 truncate">
                                {f.error}
                            </div>
                        </div>
                    ))}
                    {failures.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-2">
                            No recent failures. Systems nominal.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
