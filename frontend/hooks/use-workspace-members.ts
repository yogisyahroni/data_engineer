'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceMemberApi } from '@/lib/api/workspaces';
import { toast } from 'sonner';
import type { WorkspaceMember } from '@/lib/types/batch3';

export function useWorkspaceMembers(workspaceId: string) {
    const queryClient = useQueryClient();
    const queryKey = ['workspace-members', workspaceId];

    // Query: List members for workspace
    const { data: members = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: () => workspaceMemberApi.list(workspaceId),
        enabled: !!workspaceId,
    });

    // Mutation: Invite member (with optimistic update)
    const inviteMutation = useMutation({
        mutationFn: workspaceMemberApi.invite,
        onMutate: async (newMember) => {
            await queryClient.cancelQueries({ queryKey });
            const previousMembers = queryClient.getQueryData(queryKey);

            const tempId = `temp-${Date.now()}`;
            const optimisticMember: any = {
                id: tempId,
                ...newMember,
                invitedAt: new Date().toISOString(),
                joinedAt: new Date().toISOString(),
                _optimistic: true,
                _status: 'pending',
            };

            queryClient.setQueryData(queryKey, (old: any) => [...(old || []), optimisticMember]);

            return { previousMembers, tempId };
        },
        onSuccess: (realMember, variables, context) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === context?.tempId ? { ...realMember, _optimistic: false } : item
                )
            );
            toast.success('Member invited successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousMembers) {
                queryClient.setQueryData(queryKey, context.previousMembers);
            }
            toast.error(`Failed to invite member: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Update member role (with optimistic update)
    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }: { id: string; role: string }) =>
            workspaceMemberApi.updateRole(id, role),
        onMutate: async ({ id, role }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousMembers = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...item, role, _optimistic: true, _status: 'pending' } : item
                )
            );

            return { previousMembers };
        },
        onSuccess: (updatedMember, { id }) => {
            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).map((item: any) =>
                    item.id === id ? { ...updatedMember, _optimistic: false } : item
                )
            );
            toast.success('Member role updated successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousMembers) {
                queryClient.setQueryData(queryKey, context.previousMembers);
            }
            toast.error(`Failed to update member role: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    // Mutation: Remove member (with optimistic update)
    const removeMutation = useMutation({
        mutationFn: workspaceMemberApi.remove,
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({ queryKey });
            const previousMembers = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) =>
                (old || []).filter((item: any) => item.id !== id)
            );

            return { previousMembers };
        },
        onSuccess: () => {
            toast.success('Member removed successfully');
        },
        onError: (error: Error, variables, context) => {
            if (context?.previousMembers) {
                queryClient.setQueryData(queryKey, context.previousMembers);
            }
            toast.error(`Failed to remove member: ${error.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        // Data
        members,
        isLoading,
        error: error?.message || null,

        // Mutations
        inviteMember: async (data: { workspaceId: string; userId: string; role: string }) => {
            try {
                await inviteMutation.mutateAsync(data);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        updateMemberRole: async (id: string, role: string) => {
            try {
                await updateRoleMutation.mutateAsync({ id, role });
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        removeMember: async (id: string) => {
            try {
                await removeMutation.mutateAsync(id);
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },

        // Loading states
        isInviting: inviteMutation.isPending,
        isUpdatingRole: updateRoleMutation.isPending,
        isRemoving: removeMutation.isPending,
    };
}
