
"use client";

import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface JobExecution {
    id: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    durationMs: number | null;
    rowsProcessed: number;
    error: string | null;
    logs: any;
}

interface PipelineHistoryProps {
    executions: JobExecution[];
}

export function PipelineHistory({ executions }: PipelineHistoryProps) {
    if (executions.length === 0) {
        return <div className="text-muted-foreground p-4">No run history available.</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead className="text-right">Logs</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {executions.map((job) => (
                        <TableRow key={job.id}>
                            <TableCell>
                                <Badge variant={job.status === 'COMPLETED' ? 'default' : job.status === 'FAILED' ? 'destructive' : 'secondary'}>
                                    {job.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(job.startedAt), "PP p")}</TableCell>
                            <TableCell>{job.durationMs ? `${(job.durationMs / 1000).toFixed(2)}s` : '-'}</TableCell>
                            <TableCell>{job.rowsProcessed}</TableCell>
                            <TableCell className="text-right">
                                <LogViewer logs={job.logs} error={job.error} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function LogViewer({ logs, error }: { logs: any, error: string | null }) {
    const [isOpen, setIsOpen] = useState(false);

    // Parse logs if it's JSON string, otherwise use as is
    const logLines = Array.isArray(logs) ? logs : (typeof logs === 'string' ? [logs] : []);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">View Logs</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Execution Logs</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] w-full rounded border p-4 font-mono text-sm bg-muted/50">
                    {error && (
                        <div className="text-destructive font-bold mb-2">Error: {error}</div>
                    )}
                    {logLines.map((line: string, i: number) => (
                        <div key={i} className="mb-1 border-b border-border/10 pb-1 last:border-0">
                            {line}
                        </div>
                    ))}
                    {logLines.length === 0 && !error && <div className="text-muted-foreground italic">No logs generated.</div>}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
