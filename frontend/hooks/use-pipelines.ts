'use client';

import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { pipelineApi } from '@/lib/api/pipelines';
import { toast } from 'sonner';
import type {
    Pipeline,
    CreatePipelineRequest,
    UpdatePipelineRequest,
} from '@/lib/types/batch2';

interface UsePipelinesOptions {
    workspaceId?: string;
    pageSize?: number; // New option for pagination
}

export function usePipelines(options: UsePipelinesOptions = {}) {
    const queryClient = useQueryClient();
    const { workspaceId, pageSize = 20 } = options;

    // Query: List Pipelines (with infinite pagination)
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error,
        refetch: fetchPipelines,
    } = useInfiniteQuery({
        queryKey: ['pipelines', workspaceId],
        queryFn: ({ pageParam = 0 }) =>
            pipelineApi.list(workspaceId!, { limit: pageSize, offset: pageParam }),
        getNextPageParam: (lastPage) =>
            lastPage.pagination.hasMore
                ? lastPage.pagination.offset + lastPage.pagination.limit
                : undefined,
        enabled: !!workspaceId,
        initialPageParam: 0, // Required in React Query v5
    });

    // Flatten all pages into single array
    const pipelines = data?.pages.flatMap((page) => page.data) ?? [];

    // Get total from first page
    const total = data?.pages[0]?.pagination.total ?? 0;

    // Query: Get Single Pipeline
    const getPipeline = (id: string) => {
        return queryClient.fetchQuery({
            queryKey: ['pipeline', id],
            queryFn: () => pipelineApi.get(id),
        });
    };

    // Mutation: Create Pipeline (with optimistic update)
    const createMutation = useMutation({
        mutationFn: pipelineApi.create,

        // OPTIMISTIC UPDATE: Add to cache immediately
        onMutate: async (newPipeline) => {
            // 1. Cancel outgoing refetches (avoid race conditions)
            await queryClient.cancelQueries({ queryKey: ['pipelines', workspaceId] });

            // 2. Snapshot previous value (for rollback)
            const previousData = queryClient.getQueryData(['pipelines', workspaceId]);

            // 3. Generate temporary ID
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // 4. Create optimistic pipeline
            const optimisticPipeline: any = {
                id: tempId,
                ...newPipeline,
                isActive: true,
                lastRunAt: null,
                lastStatus: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true, // Flag for UI
                _status: 'pending', // pending | success | error
            };

            // 5. Optimistically update cache (add to FIRST page)
            queryClient.setQueryData(['pipelines', workspaceId], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: [
                        {
                            data: [optimisticPipeline, ...old.pages[0].data],
                            pagination: {
                                ...old.pages[0].pagination,
                                total: old.pages[0].pagination.total + 1,
                            },
                        },
                        ...old.pages.slice(1),
                    ],
                };
            });

            // 6. Return context for onError/onSuccess
            return { previousData, tempId };
        },

        // SUCCESS: Replace temp ID with real ID
        onSuccess: (realPipeline, variables, context) => {
            queryClient.setQueryData(['pipelines', workspaceId], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((item: any) =>
                            item.id === context?.tempId
                                ? { ...realPipeline, _optimistic: false, _status: 'success' }
                                : item
                        ),
                    })),
                };
            });

            toast.success('Pipeline created successfully');
        },

        // ERROR: Rollback to previous state
        onError: (error: Error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['pipelines', workspaceId], context.previousData);
            }

            toast.error(`Failed to create pipeline: ${error.message}`);
        },

        // SETTLED: Refetch to ensure consistency
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['pipelines', workspaceId] });
        },
    });

    // Mutation: Update Pipeline (with optimistic update)
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdatePipelineRequest }) =>
            pipelineApi.update(id, data),

        // OPTIMISTIC UPDATE: Update in cache immediately
        onMutate: async ({ id, data }) => {
            // 1. Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['pipelines', workspaceId] });

            // 2. Snapshot previous value
            const previousData = queryClient.getQueryData(['pipelines', workspaceId]);

            // 3. Optimistically update in ALL pages
            queryClient.setQueryData(['pipelines', workspaceId], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((item: any) =>
                            item.id === id
                                ? {
                                    ...item,
                                    ...data,
                                    updatedAt: new Date(),
                                    _optimistic: true,
                                    _status: 'pending',
                                }
                                : item
                        ),
                    })),
                };
            });

            return { previousData };
        },

        // SUCCESS: Update with real data
        onSuccess: (updatedPipeline, variables, context) => {
            queryClient.setQueryData(['pipelines', workspaceId], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((item: any) =>
                            item.id === updatedPipeline.id
                                ? { ...updatedPipeline, _optimistic: false, _status: 'success' }
                                : item
                        ),
                    })),
                };
            });

            // Also update single pipeline cache
            queryClient.setQueryData(['pipeline', updatedPipeline.id], updatedPipeline);

            toast.success('Pipeline updated successfully');
        },

        // ERROR: Rollback
        onError: (error: Error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['pipelines', workspaceId], context.previousData);
            }

            toast.error(`Failed to update pipeline: ${error.message}`);
        },

        // SETTLED: Refetch
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['pipelines', workspaceId] });
        },
    });

    // Mutation: Delete Pipeline (with optimistic update)
    const deleteMutation = useMutation({
        mutationFn: pipelineApi.delete,

        // OPTIMISTIC UPDATE: Remove from cache immediately
        onMutate: async (pipelineId) => {
            // 1. Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['pipelines', workspaceId] });

            // 2. Snapshot previous value
            const previousData = queryClient.getQueryData(['pipelines', workspaceId]);

            // 3. Optimistically remove from ALL pages
            queryClient.setQueryData(['pipelines', workspaceId], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.filter((item: any) => item.id !== pipelineId),
                        pagination: {
                            ...page.pagination,
                            total: page.pagination.total - 1,
                        },
                    })),
                };
            });

            return { previousData };
        },

        // SUCCESS
        onSuccess: (_, deletedId) => {
            queryClient.removeQueries({ queryKey: ['pipeline', deletedId] });
            toast.success('Pipeline deleted successfully');
        },

        // ERROR: Rollback
        onError: (error: Error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['pipelines', workspaceId], context.previousData);
            }

            toast.error(`Failed to delete pipeline: ${error.message}`);
        },

        // SETTLED: Refetch
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['pipelines', workspaceId] });
        },
    });

    // Mutation: Run Pipeline
    const runMutation = useMutation({
        mutationFn: pipelineApi.run,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipelines', workspaceId] });
            toast.success('Pipeline started successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Query: Get Stats
    const {
        data: stats,
        isLoading: isLoadingStats,
    } = useQuery({
        queryKey: ['pipeline-stats', workspaceId],
        queryFn: () => pipelineApi.stats(workspaceId!),
        enabled: !!workspaceId,
    });

    return {
        // Data
        pipelines,
        total, // NEW: Total count
        stats,

        // Loading states
        isLoading,
        isLoadingStats,
        isFetchingNextPage, // NEW: Loading next page

        // Pagination
        hasNextPage, // NEW: Has more pages
        fetchNextPage, // NEW: Load next page

        // Error
        error: error?.message || null,

        // Query methods
        fetchPipelines,
        getPipeline,

        // Mutation methods (wrapped for backward compatibility)
        createPipeline: async (data: CreatePipelineRequest) => {
            try {
                await createMutation.mutateAsync(data);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        updatePipeline: async (id: string, data: UpdatePipelineRequest) => {
            try {
                await updateMutation.mutateAsync({ id, data });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        deletePipeline: async (id: string) => {
            try {
                await deleteMutation.mutateAsync(id);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        runPipeline: async (id: string) => {
            try {
                const execution = await runMutation.mutateAsync(id);
                return { success: true, data: execution };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        // Mutation states (for advanced usage)
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isRunning: runMutation.isPending,
    };
}
