'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulerApi } from '@/lib/api/scheduler';
import { toast } from 'sonner';
import type { CreateSchedulerJobInput, UpdateSchedulerJobInput, SchedulerJob } from '@/lib/types/notifications';

export function useSchedulerJobs() {
    const queryClient = useQueryClient();

    // Query: List all jobs
    const { data: jobs = [], isLoading, error } = useQuery({
        queryKey: ['scheduler', 'jobs'],
        queryFn: schedulerApi.listJobs,
    });

    // Mutation: Create job
    const createJobMutation = useMutation({
        mutationFn: schedulerApi.createJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduler', 'jobs'] });
            toast.success('Scheduler job created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create job: ${error.message}`);
        },
    });

    // Mutation: Update job
    const updateJobMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSchedulerJobInput }) =>
            schedulerApi.updateJob(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['scheduler', 'jobs'] });

            const previousJobs = queryClient.getQueryData(['scheduler', 'jobs']);

            // Optimistically update job
            queryClient.setQueryData(['scheduler', 'jobs'], (old: SchedulerJob[] = []) =>
                old.map((job) => (job.id === id ? { ...job, ...data, updatedAt: new Date() } : job))
            );

            return { previousJobs };
        },
        onSuccess: () => {
            toast.success('Job updated successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousJobs) {
                queryClient.setQueryData(['scheduler', 'jobs'], context.previousJobs);
            }
            toast.error(`Failed to update job: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduler', 'jobs'] });
        },
    });

    // Mutation: Delete job
    const deleteJobMutation = useMutation({
        mutationFn: schedulerApi.deleteJob,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['scheduler', 'jobs'] });

            const previousJobs = queryClient.getQueryData(['scheduler', 'jobs']);

            // Optimistically remove job
            queryClient.setQueryData(['scheduler', 'jobs'], (old: SchedulerJob[] = []) =>
                old.filter((job) => job.id !== id)
            );

            return { previousJobs };
        },
        onSuccess: () => {
            toast.success('Job deleted successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousJobs) {
                queryClient.setQueryData(['scheduler', 'jobs'], context.previousJobs);
            }
            toast.error(`Failed to delete job: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduler', 'jobs'] });
        },
    });

    // Mutation: Pause job
    const pauseJobMutation = useMutation({
        mutationFn: schedulerApi.pauseJob,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['scheduler', 'jobs'] });

            const previousJobs = queryClient.getQueryData(['scheduler', 'jobs']);

            // Optimistically update status
            queryClient.setQueryData(['scheduler', 'jobs'], (old: SchedulerJob[] = []) =>
                old.map((job) => (job.id === id ? { ...job, status: 'paused' as const } : job))
            );

            return { previousJobs };
        },
        onSuccess: () => {
            toast.success('Job paused');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousJobs) {
                queryClient.setQueryData(['scheduler', 'jobs'], context.previousJobs);
            }
            toast.error(`Failed to pause job: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduler', 'jobs'] });
        },
    });

    // Mutation: Resume job
    const resumeJobMutation = useMutation({
        mutationFn: schedulerApi.resumeJob,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['scheduler', 'jobs'] });

            const previousJobs = queryClient.getQueryData(['scheduler', 'jobs']);

            // Optimistically update status
            queryClient.setQueryData(['scheduler', 'jobs'], (old: SchedulerJob[] = []) =>
                old.map((job) => (job.id === id ? { ...job, status: 'active' as const } : job))
            );

            return { previousJobs };
        },
        onSuccess: () => {
            toast.success('Job resumed');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousJobs) {
                queryClient.setQueryData(['scheduler', 'jobs'], context.previousJobs);
            }
            toast.error(`Failed to resume job: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduler', 'jobs'] });
        },
    });

    // Mutation: Trigger job manually
    const triggerJobMutation = useMutation({
        mutationFn: schedulerApi.triggerJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scheduler', 'jobs'] });
            toast.success('Job triggered successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to trigger job: ${error.message}`);
        },
    });

    return {
        jobs,
        isLoading,
        error,
        createJob: createJobMutation.mutate,
        updateJob: (id: string, data: UpdateSchedulerJobInput) => updateJobMutation.mutate({ id, data }),
        deleteJob: deleteJobMutation.mutate,
        pauseJob: pauseJobMutation.mutate,
        resumeJob: resumeJobMutation.mutate,
        triggerJob: triggerJobMutation.mutate,
        isCreating: createJobMutation.isPending,
        isUpdating: updateJobMutation.isPending,
        isDeleting: deleteJobMutation.isPending,
    };
}

export function useSchedulerJob(id: string) {
    // Query: Get single job details
    const { data: job, isLoading, error } = useQuery({
        queryKey: ['scheduler', 'jobs', id],
        queryFn: () => schedulerApi.getJob(id),
        enabled: !!id,
    });

    return {
        job,
        isLoading,
        error,
    };
}
