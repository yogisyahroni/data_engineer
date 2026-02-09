'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSchedulerJobs } from '@/hooks/use-scheduler';
import {
    Clock,
    Play,
    Pause,
    Trash2,
    Plus,
    RefreshCw,
    AlertCircle,
    CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { SchedulerJob, CreateSchedulerJobRequest } from '@/lib/types/notifications';
import { toast } from 'sonner';

interface SchedulerManagerProps {
    className?: string;
}

export function SchedulerManager({ className }: SchedulerManagerProps) {
    const {
        jobs,
        isLoading,
        createJob,
        updateJob,
        deleteJob,
        pauseJob,
        resumeJob,
        triggerJob,
    } = useSchedulerJobs();

    const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
    const [editingJob, setEditingJob] = React.useState<SchedulerJob | null>(null);

    const [formData, setFormData] = React.useState<CreateSchedulerJobRequest>({
        name: '',
        schedule: '',
        jobType: 'notification',
        payload: {},
        enabled: true,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            schedule: '',
            jobType: 'notification',
            payload: {},
            enabled: true,
        });
        setEditingJob(null);
    };

    const handleCreate = async () => {
        try {
            await createJob(formData);
            setCreateDialogOpen(false);
            resetForm();
            toast.success('Job created successfully');
        } catch (error) {
            toast.error('Failed to create job');
        }
    };

    const handleUpdate = async () => {
        if (!editingJob) return;

        setEditingJob(null);
        try {
            await updateJob(editingJob.id, formData);
            toast.success('Job updated successfully');
        } catch (err: Error | unknown) {
            toast.error(`Failed to update job: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this job?')) return;
        try {
            await deleteJob(id);
            toast.success('Job deleted successfully');
        } catch (error) {
            toast.error('Failed to delete job');
        }
    };

    const handlePauseResume = async (job: SchedulerJob) => {
        try {
            if (job.enabled) {
                await pauseJob(job.id);
                toast.success('Job paused');
            } else {
                await resumeJob(job.id);
                toast.success('Job resumed');
            }
        } catch (error) {
            toast.error(`Failed to ${job.enabled ? 'pause' : 'resume'} job`);
        }
    };

    const handleTrigger = async (id: string) => {
        try {
            await triggerJob(id);
            toast.success('Job triggered successfully');
        } catch (error) {
            toast.error('Failed to trigger job');
        }
    };

    const openEditDialog = (job: SchedulerJob) => {
        setEditingJob(job);
        setFormData({
            name: job.name,
            schedule: job.schedule,
            jobType: job.jobType,
            payload: job.payload || {},
            enabled: job.enabled,
        });
        setCreateDialogOpen(true);
    };

    const getStatusBadge = (job: SchedulerJob) => {
        if (!job.enabled) {
            return (
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    <Pause className="w-3 h-3 mr-1" />
                    Paused
                </Badge>
            );
        }
        if (job.lastRun && job.lastError) {
            return (
                <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Error
                </Badge>
            );
        }
        return (
            <Badge variant="default" className="bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
            </Badge>
        );
    };

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Scheduler Manager
                        </CardTitle>
                        <CardDescription>
                            Manage scheduled jobs and cron tasks
                        </CardDescription>
                    </div>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={resetForm}>
                                <Plus className="w-4 h-4 mr-2" />
                                New Job
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingJob ? 'Edit Job' : 'Create New Job'}
                                </DialogTitle>
                                <DialogDescription>
                                    Configure a scheduled job with cron expression
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Job Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="e.g., Daily Report Generation"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="schedule">Cron Schedule</Label>
                                    <Input
                                        id="schedule"
                                        value={formData.schedule}
                                        onChange={(e) =>
                                            setFormData({ ...formData, schedule: e.target.value })
                                        }
                                        placeholder="e.g., 0 0 * * * (every day at midnight)"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Format: second minute hour day month weekday
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="jobType">Job Type</Label>
                                    <Select
                                        value={formData.jobType}
                                        onValueChange={(value) =>
                                            setFormData({
                                                ...formData,
                                                jobType: value as SchedulerJob['jobType'],
                                            })
                                        }
                                    >
                                        <SelectTrigger id="jobType">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="notification">Notification</SelectItem>
                                            <SelectItem value="data_sync">Data Sync</SelectItem>
                                            <SelectItem value="cleanup">Cleanup</SelectItem>
                                            <SelectItem value="report">Report</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="payload">Payload (JSON)</Label>
                                    <Textarea
                                        id="payload"
                                        value={JSON.stringify(formData.payload, null, 2)}
                                        onChange={(e) => {
                                            try {
                                                const parsed = JSON.parse(e.target.value);
                                                setFormData({ ...formData, payload: parsed });
                                            } catch {
                                                // Invalid JSON, ignore
                                            }
                                        }}
                                        placeholder='{"key": "value"}'
                                        className="font-mono text-sm"
                                        rows={6}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setCreateDialogOpen(false);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={editingJob ? handleUpdate : handleCreate}>
                                    {editingJob ? 'Update' : 'Create'} Job
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Clock className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
                        <p className="text-lg font-medium">No scheduled jobs</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create your first scheduled job to get started
                        </p>
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Job
                        </Button>
                    </div>
                ) : (
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Run</TableHead>
                                    <TableHead>Next Run</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell className="font-medium">{job.name}</TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {job.schedule}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {job.jobType?.replace('_', ' ') || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(job)}</TableCell>
                                        <TableCell>
                                            {job.lastRun ? (
                                                <div className="text-sm">
                                                    <p>
                                                        {formatDistanceToNow(new Date(job.lastRun), {
                                                            addSuffix: true,
                                                        })}
                                                    </p>
                                                    {job.lastError && (
                                                        <p className="text-xs text-red-600 truncate max-w-[150px]">
                                                            {job.lastError}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Never</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {job.nextRun ? (
                                                <span className="text-sm">
                                                    {formatDistanceToNow(new Date(job.nextRun), {
                                                        addSuffix: true,
                                                    })}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handlePauseResume(job)}
                                                    title={job.enabled ? 'Pause' : 'Resume'}
                                                >
                                                    {job.enabled ? (
                                                        <Pause className="w-4 h-4" />
                                                    ) : (
                                                        <Play className="w-4 h-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleTrigger(job.id)}
                                                    title="Trigger now"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => openEditDialog(job)}
                                                    title="Edit"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleDelete(job.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
