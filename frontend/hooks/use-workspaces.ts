'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '@/lib/api/workspaces';
import { toast } from 'sonner';
import type { Workspace } from '@/lib/types/batch3';

export function useWorkspaces() {
    const queryClient = useQueryClient();

    // Query: List workspaces
    const { data: workspaces = [], isLoading, error } = useQuery({
        queryKey: ['workspaces'],
        queryFn: workspaceApi.list,
    });

    // Mutation: Create workspace (with optimistic update)
    const createMutation = useMutation({
        mutationFn: workspaceApi.create,
        onMutate: async (newWorkspace) => {
            await queryClient.cancelQueries({ queryKey: ['workspaces'] });
            const previousWorkspaces = queryClient.getQueryData(['workspaces']);

            const tempId = `temp-${Date.now()}`;
            const optimisticWorkspace: any = {
                id: tempId,
                ...newWorkspace,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _optimistic: true,
                _status: 'pending',
            };

            queryClient.setQueryData(['workspaces'], (old: any) => [optimisticWorkspace, ...(old || [])]);

            return { previousWorkspaces, tempId };
        },
        onSuccess: (realWorkspace, variables, context) => {
            queryClient.setQueryData(['workspaces'], (old: any) =>
                (old || []).map((item: any) =>
                    item.id === context?.tempId ? { ...realWorkspace, _optimistic: false } : item
                )
            );
            toast.success('Workspace created successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousWorkspaces) {
                queryClient.setQueryData(['workspaces'], context.previousWorkspaces);
            }
            toast.error(`Failed to create workspace: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        },
    });

    // Mutation: Update workspace (with optimistic update)
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Workspace> }) =>
            workspaceApi.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['workspaces'] });
            const previousWorkspaces = queryClient.getQueryData(['workspaces']);

            queryClient.setQueryData(['workspaces'], (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...item, ...data, _optimistic: true, _status: 'pending' } : item
                )
            );

            return { previousWorkspaces };
        },
        onSuccess: (updatedWorkspace, { id }) => {
            queryClient.setQueryData(['workspaces'], (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...updatedWorkspace, _optimistic: false } : item
                )
            );
            toast.success('Workspace updated successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousWorkspaces) {
                queryClient.setQueryData(['workspaces'], context.previousWorkspaces);
            }
            toast.error(`Failed to update workspace: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        },
    });

    // Mutation: Delete workspace (with optimistic update)
    const deleteMutation = useMutation({
        mutationFn: workspaceApi.delete,
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey: ['workspaces'] });
            const previousWorkspaces = queryClient.getQueryData(['workspaces']);

            queryClient.setQueryData(['workspaces'], (old: any) =>
                (old || []).filter((item: any) => item.id !== id)
            );

            return { previousWorkspaces };
        },
        onSuccess: () => {
            toast.success('Workspace deleted successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousWorkspaces) {
                queryClient.setQueryData(['workspaces'], context.previousWorkspaces);
            }
            toast.error(`Failed to delete workspace: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
        },
    });

    return {
        // Data
        workspaces,
        isLoading,
        error: error?.message || null,

        // Mutations
        createWorkspace: async (data: { name: string; description?: string }) => {
            try {
                await createMutation.mutateAsync(data);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        updateWorkspace: async (id: string, data: Partial<Workspace>) => {
            try {
                await updateMutation.mutateAsync({ id, data });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        deleteWorkspace: async (id: string) => {
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
