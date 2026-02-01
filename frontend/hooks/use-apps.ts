'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appApi } from '@/lib/api/apps';
import { toast } from 'sonner';
import type { App } from '@/lib/types/batch3';

export function useApps() {
    const queryClient = useQueryClient();

    // Query: List apps
    const { data: apps = [], isLoading, error } = useQuery({
        queryKey: ['apps'],
        queryFn: appApi.list,
    });

    // Mutation: Create app (with optimistic update)
    const createMutation = useMutation({
        mutationFn: appApi.create,
        onMutate: async (newApp) => {
            await queryClient.cancelQueries({ queryKey: ['apps'] });
            const previousApps = queryClient.getQueryData(['apps']);

            const tempId = `temp-${Date.now()}`;
            const optimisticApp: any = {
                id: tempId,
                ...newApp,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _optimistic: true,
                _status: 'pending',
            };

            queryClient.setQueryData(['apps'], (old: any) => [optimisticApp, ...(old || [])]);

            return { previousApps, tempId };
        },
        onSuccess: (realApp, variables, context) => {
            queryClient.setQueryData(['apps'], (old: any) =>
                (old || []).map((item: any) =>
                    item.id === context?.tempId ? { ...realApp, _optimistic: false } : item
                )
            );
            toast.success('App created successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousApps) {
                queryClient.setQueryData(['apps'], context.previousApps);
            }
            toast.error(`Failed to create app: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['apps'] });
        },
    });

    // Mutation: Update app (with optimistic update)
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<App> }) =>
            appApi.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['apps'] });
            const previousApps = queryClient.getQueryData(['apps']);

            queryClient.setQueryData(['apps'], (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...item, ...data, _optimistic: true, _status: 'pending' } : item
                )
            );

            return { previousApps };
        },
        onSuccess: (updatedApp, { id }) => {
            queryClient.setQueryData(['apps'], (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...updatedApp, _optimistic: false } : item
                )
            );
            toast.success('App updated successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousApps) {
                queryClient.setQueryData(['apps'], context.previousApps);
            }
            toast.error(`Failed to update app: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['apps'] });
        },
    });

    // Mutation: Delete app (with optimistic update)
    const deleteMutation = useMutation({
        mutationFn: appApi.delete,
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey: ['apps'] });
            const previousApps = queryClient.getQueryData(['apps']);

            queryClient.setQueryData(['apps'], (old: any) =>
                (old || []).filter((item: any) => item.id !== id)
            );

            return { previousApps };
        },
        onSuccess: () => {
            toast.success('App deleted successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousApps) {
                queryClient.setQueryData(['apps'], context.previousApps);
            }
            toast.error(`Failed to delete app: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['apps'] });
        },
    });

    return {
        // Data
        apps,
        isLoading,
        error: error?.message || null,

        // Mutations
        createApp: async (data: { name: string; description?: string; workspaceId?: string }) => {
            try {
                await createMutation.mutateAsync(data);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        updateApp: async (id: string, data: Partial<App>) => {
            try {
                await updateMutation.mutateAsync({ id, data });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        deleteApp: async (id: string) => {
            try {
                await deleteMutation.mutateAsync(id);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        // Loading states
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
