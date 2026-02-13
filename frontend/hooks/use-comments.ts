'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentApi } from '@/lib/api/comments';
import { toast } from 'sonner';
import type { CreateCommentRequest, Comment } from '@/lib/types/batch3';

export function useComments(entityType: string, entityId: string) {
    const queryClient = useQueryClient();
    const queryKey = ['comments', entityType, entityId];

    // Query: List comments for entity
    const { data, isLoading, error } = useQuery({
        queryKey,
        queryFn: () => commentApi.list(entityType, entityId),
        enabled: !!entityType && !!entityId,
    });

    const comments = data?.comments || [];

    // Mutation: Create comment (with optimistic update)
    const createMutation = useMutation({
        mutationFn: commentApi.create,
        onMutate: async (newComment) => {
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);

            const tempId = `temp-${Date.now()}`;
            const optimisticComment: any = {
                id: tempId,
                ...newComment,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                _optimistic: true,
                _status: 'pending',
            };

            queryClient.setQueryData(queryKey, (old: any) => [optimisticComment, ...(old || [])]);

            return { previousComments, tempId };
        },
        onSuccess: (realComment, variables, context) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === context?.tempId ? { ...realComment, _optimistic: false } : item
                )
            );
            toast.success('Comment added successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(queryKey, context.previousComments);
            }
            toast.error(`Failed to add comment: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Update comment (with optimistic update)
    const updateMutation = useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) =>
            commentApi.update(id, { content }),
        onMutate: async ({ id, content }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...item, content, _optimistic: true, _status: 'pending' } : item
                )
            );

            return { previousComments };
        },
        onSuccess: (updatedComment, { id }) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...updatedComment, _optimistic: false } : item
                )
            );
            toast.success('Comment updated successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(queryKey, context.previousComments);
            }
            toast.error(`Failed to update comment: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Delete comment (with optimistic update)
    const deleteMutation = useMutation({
        mutationFn: commentApi.delete,
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).filter((item: any) => item.id !== id)
            );

            return { previousComments };
        },
        onSuccess: () => {
            toast.success('Comment deleted successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(queryKey, context.previousComments);
            }
            toast.error(`Failed to delete comment: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Resolve comment
    const resolveMutation = useMutation({
        mutationFn: ({ id, isResolved }: { id: string; isResolved: boolean }) =>
            isResolved ? commentApi.resolve(id) : commentApi.unresolve(id),
        onMutate: async ({ id, isResolved }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...item, isResolved, _optimistic: true } : item
                )
            );

            return { previousComments };
        },
        onSuccess: (updatedComment, { isResolved }) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === updatedComment.id ? updatedComment : item
                )
            );
            toast.success(isResolved ? 'Comment resolved' : 'Comment unresolved');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(queryKey, context.previousComments);
            }
            toast.error(`Failed to update resolution status: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        // Data
        comments,
        isLoading,
        error: error?.message || null,

        // Mutations
        createComment: async (data: CreateCommentRequest) => {
            try {
                await createMutation.mutateAsync(data);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        updateComment: async (id: string, content: string) => {
            try {
                await updateMutation.mutateAsync({ id, content });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        deleteComment: async (id: string) => {
            try {
                await deleteMutation.mutateAsync(id);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        resolveComment: async (id: string, isResolved: boolean) => {
            try {
                await resolveMutation.mutateAsync({ id, isResolved });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        // Loading states
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isResolving: resolveMutation.isPending,
    };
}
