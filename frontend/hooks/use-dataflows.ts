'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataflowApi } from '@/lib/api/dataflows';
import { toast } from 'sonner';
import type { CreateDataflowRequest, Dataflow } from '@/lib/types/batch2';

interface UseDataflowsOptions {
    pageSize?: number;
}

export function useDataflows(options: UseDataflowsOptions = {}) {
    const queryClient = useQueryClient();
    const { pageSize = 20 } = options;

    // Query: List Dataflows (with infinite pagination)
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error,
        refetch: fetchDataflows,
    } = useInfiniteQuery({
        queryKey: ['dataflows'],
        queryFn: ({ pageParam = 0 }) =>
            dataflowApi.list({ limit: pageSize, offset: pageParam }),
        getNextPageParam: (lastPage) =>
            lastPage.pagination.hasMore
                ? lastPage.pagination.offset + lastPage.pagination.limit
                : undefined,
        initialPageParam: 0,
    });

    // Flatten all pages into single array
    const dataflows = data?.pages.flatMap((page) => page.data) ?? [];

    // Get total from first page
    const total = data?.pages[0]?.pagination.total ?? 0;

    // Mutation: Create Dataflow (with optimistic update)
    const createMutation = useMutation({
        mutationFn: dataflowApi.create,

        // OPTIMISTIC UPDATE: Add to cache immediately
        onMutate: async (newDataflow) => {
            // 1. Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['dataflows'] });

            // 2. Snapshot previous value
            const previousData = queryClient.getQueryData(['dataflows']);

            // 3. Generate temporary ID
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // 4. Create optimistic dataflow
            const optimisticDataflow: any = {
                id: tempId,
                ...newDataflow,
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true,
                _status: 'pending',
            };

            // 5. Optimistically update cache (add to FIRST page)
            queryClient.setQueryData(['dataflows'], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: [
                        {
                            data: [optimisticDataflow, ...old.pages[0].data],
                            pagination: {
                                ...old.pages[0].pagination,
                                total: old.pages[0].pagination.total + 1,
                            },
                        },
                        ...old.pages.slice(1),
                    ],
                };
            });

            return { previousData, tempId };
        },

        // SUCCESS: Replace temp ID with real ID
        onSuccess: (realDataflow, variables, context) => {
            queryClient.setQueryData(['dataflows'], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((item: any) =>
                            item.id === context?.tempId
                                ? { ...realDataflow, _optimistic: false, _status: 'success' }
                                : item
                        ),
                    })),
                };
            });

            toast.success('Dataflow created successfully');
        },

        // ERROR: Rollback
        onError: (error: Error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['dataflows'], context.previousData);
            }

            toast.error(`Failed to create dataflow: ${error.message}`);
        },

        // SETTLED: Refetch
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dataflows'] });
        },
    });

    // Mutation: Run Dataflow
    const runMutation = useMutation({
        mutationFn: dataflowApi.run,
        onSuccess: () => {
            toast.success('Dataflow started successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Mutation: Update Dataflow (with optimistic update)
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Dataflow> }) =>
            dataflowApi.update(id, data),

        // OPTIMISTIC UPDATE: Update in cache immediately
        onMutate: async ({ id, data }) => {
            // 1. Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['dataflows'] });

            // 2. Snapshot previous value
            const previousData = queryClient.getQueryData(['dataflows']);

            // 3. Optimistically update cache (ALL pages)
            queryClient.setQueryData(['dataflows'], (old: any) => {
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

        // SUCCESS: Mark as success
        onSuccess: (updatedDataflow, { id }) => {
            queryClient.setQueryData(['dataflows'], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.map((item: any) =>
                            item.id === id
                                ? { ...updatedDataflow, _optimistic: false, _status: 'success' }
                                : item
                        ),
                    })),
                };
            });

            toast.success('Dataflow updated successfully');
        },

        // ERROR: Rollback
        onError: (error: Error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['dataflows'], context.previousData);
            }

            toast.error(`Failed to update dataflow: ${error.message}`);
        },

        // SETTLED: Refetch
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dataflows'] });
        },
    });

    // Mutation: Delete Dataflow (with optimistic update)
    const deleteMutation = useMutation({
        mutationFn: dataflowApi.delete,

        // OPTIMISTIC UPDATE: Remove from cache immediately
        onMutate: async (id: string) => {
            // 1. Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['dataflows'] });

            // 2. Snapshot previous value
            const previousData = queryClient.getQueryData(['dataflows']);

            // 3. Optimistically remove from cache (ALL pages)
            queryClient.setQueryData(['dataflows'], (old: any) => {
                if (!old) return old;

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: page.data.filter((item: any) => item.id !== id),
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
        onSuccess: () => {
            toast.success('Dataflow deleted successfully');
        },

        // ERROR: Rollback
        onError: (error: Error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['dataflows'], context.previousData);
            }

            toast.error(`Failed to delete dataflow: ${error.message}`);
        },

        // SETTLED: Refetch
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dataflows'] });
        },
    });

    return {
        // Data
        dataflows,
        total, // NEW: Total count

        // Loading states
        isLoading,
        isFetchingNextPage, // NEW: Loading next page

        // Pagination
        hasNextPage, // NEW: Has more pages
        fetchNextPage, // NEW: Load next page

        // Error
        error: error?.message || null,

        // Query methods
        fetchDataflows,

        // Mutation methods (wrapped for backward compatibility)
        createDataflow: async (data: CreateDataflowRequest) => {
            try {
                await createMutation.mutateAsync(data);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        runDataflow: async (id: string) => {
            try {
                const run = await runMutation.mutateAsync(id);
                return { success: true, data: run };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        updateDataflow: async (id: string, data: Partial<Dataflow>) => {
            try {
                await updateMutation.mutateAsync({ id, data });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        deleteDataflow: async (id: string) => {
            try {
                await deleteMutation.mutateAsync(id);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        // Mutation states (for advanced usage)
        isCreating: createMutation.isPending,
        isRunning: runMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
