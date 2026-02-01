'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetApi } from '@/lib/api/widgets';
import { toast } from 'sonner';
import type { Widget } from '@/lib/types/batch3';

export function useWidgets(canvasId: string) {
    const queryClient = useQueryClient();
    const queryKey = ['widgets', canvasId];

    // Query: List widgets for canvas
    const { data: widgets = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: () => widgetApi.list(canvasId),
        enabled: !!canvasId,
    });

    // Mutation: Create widget (with optimistic update)
    const createMutation = useMutation({
        mutationFn: widgetApi.create,
        onMutate: async (newWidget) => {
            await queryClient.cancelQueries({ queryKey });
            const previousWidgets = queryClient.getQueryData(queryKey);

            const tempId = `temp-${Date.now()}`;
            const optimisticWidget: any = {
                id: tempId,
                ...newWidget,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _optimistic: true,
                _status: 'pending',
            };

            queryClient.setQueryData(queryKey, (old: any) => [...(old || []), optimisticWidget]);

            return { previousWidgets, tempId };
        },
        onSuccess: (realWidget, variables, context) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === context?.tempId ? { ...realWidget, _optimistic: false } : item
                )
            );
            toast.success('Widget created successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousWidgets) {
                queryClient.setQueryData(queryKey, context.previousWidgets);
            }
            toast.error(`Failed to create widget: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Update widget (with optimistic update)
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Widget> }) =>
            widgetApi.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousWidgets = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...item, ...data, _optimistic: true, _status: 'pending' } : item
                )
            );

            return { previousWidgets };
        },
        onSuccess: (updatedWidget, { id }) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...updatedWidget, _optimistic: false } : item
                )
            );
            toast.success('Widget updated successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousWidgets) {
                queryClient.setQueryData(queryKey, context.previousWidgets);
            }
            toast.error(`Failed to update widget: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Delete widget (with optimistic update)
    const deleteMutation = useMutation({
        mutationFn: widgetApi.delete,
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey });
            const previousWidgets = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).filter((item: any) => item.id !== id)
            );

            return { previousWidgets };
        },
        onSuccess: () => {
            toast.success('Widget deleted successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousWidgets) {
                queryClient.setQueryData(queryKey, context.previousWidgets);
            }
            toast.error(`Failed to delete widget: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        // Data
        widgets,
        isLoading,
        error: error?.message || null,

        // Mutations
        createWidget: async (data: { canvasId: string; type: string; config?: Record<string, any>; position?: Record<string, any> }) => {
            try {
                await createMutation.mutateAsync(data);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        updateWidget: async (id: string, data: Partial<Widget>) => {
            try {
                await updateMutation.mutateAsync({ id, data });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        deleteWidget: async (id: string) => {
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
