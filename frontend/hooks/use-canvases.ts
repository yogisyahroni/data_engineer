'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { canvasApi } from '@/lib/api/canvases';
import { toast } from 'sonner';
import type { Canvas } from '@/lib/types/batch3';

export function useCanvases(appId: string) {
    const queryClient = useQueryClient();
    const queryKey = ['canvases', appId];

    // Query: List canvases for app
    const { data: canvases = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: () => canvasApi.list(appId),
        enabled: !!appId,
    });

    // Mutation: Create canvas (with optimistic update)
    const createMutation = useMutation({
        mutationFn: canvasApi.create,
        onMutate: async (newCanvas) => {
            await queryClient.cancelQueries({ queryKey });
            const previousCanvases = queryClient.getQueryData(queryKey);

            const tempId = `temp-${Date.now()}`;
            const optimisticCanvas: any = {
                id: tempId,
                ...newCanvas,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _optimistic: true,
                _status: 'pending',
            };

            queryClient.setQueryData(queryKey, (old: any) => [optimisticCanvas, ...(old || [])]);

            return { previousCanvases, tempId };
        },
        onSuccess: (realCanvas, variables, context) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === context?.tempId ? { ...realCanvas, _optimistic: false } : item
                )
            );
            toast.success('Canvas created successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousCanvases) {
                queryClient.setQueryData(queryKey, context.previousCanvases);
            }
            toast.error(`Failed to create canvas: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Update canvas (with optimistic update)
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Canvas> }) =>
            canvasApi.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousCanvases = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...item, ...data, _optimistic: true, _status: 'pending' } : item
                )
            );

            return { previousCanvases };
        },
        onSuccess: (updatedCanvas, { id }) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...updatedCanvas, _optimistic: false } : item
                )
            );
            toast.success('Canvas updated successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousCanvases) {
                queryClient.setQueryData(queryKey, context.previousCanvases);
            }
            toast.error(`Failed to update canvas: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Delete canvas (with optimistic update)
    const deleteMutation = useMutation({
        mutationFn: canvasApi.delete,
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey });
            const previousCanvases = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).filter((item: any) => item.id !== id)
            );

            return { previousCanvases };
        },
        onSuccess: () => {
            toast.success('Canvas deleted successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousCanvases) {
                queryClient.setQueryData(queryKey, context.previousCanvases);
            }
            toast.error(`Failed to delete canvas: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        // Data
        canvases,
        isLoading,
        error: error?.message || null,

        // Mutations
        createCanvas: async (data: { appId: string; name: string; config?: Record<string, any> }) => {
            try {
                await createMutation.mutateAsync(data);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        updateCanvas: async (id: string, data: Partial<Canvas>) => {
            try {
                await updateMutation.mutateAsync({ id, data });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        deleteCanvas: async (id: string) => {
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
