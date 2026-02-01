'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiProviderApi } from '@/lib/api/ai-providers';
import { toast } from 'sonner';
import type { AIProvider, CreateAIProviderInput, UpdateAIProviderInput } from '@/lib/types/ai';

export function useAIProviders() {
    const queryClient = useQueryClient();

    // Get all providers
    const { data: providers = [], isLoading, error } = useQuery({
        queryKey: ['ai-providers'],
        queryFn: aiProviderApi.getAll,
    });

    // Create provider
    const createMutation = useMutation({
        mutationFn: aiProviderApi.create,
        onMutate: async (newProvider) => {
            await queryClient.cancelQueries({ queryKey: ['ai-providers'] });
            const previous = queryClient.getQueryData<AIProvider[]>(['ai-providers']);

            // Optimistic update
            const optimisticProvider: AIProvider = {
                id: `temp-${Date.now()}`,
                userId: '',
                name: newProvider.name,
                providerType: newProvider.providerType,
                baseUrl: newProvider.baseUrl,
                apiKeyMasked: '***',
                model: newProvider.model,
                isActive: true,
                isDefault: newProvider.isDefault || false,
                config: newProvider.config,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            queryClient.setQueryData<AIProvider[]>(['ai-providers'], (old = []) => [
                ...old,
                optimisticProvider,
            ]);

            return { previous };
        },
        onError: (error, _, context) => {
            queryClient.setQueryData(['ai-providers'], context?.previous);
            toast.error('Failed to create provider', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
        onSuccess: () => {
            toast.success('Provider created successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
        },
    });

    // Update provider
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateAIProviderInput }) =>
            aiProviderApi.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['ai-providers'] });
            const previous = queryClient.getQueryData<AIProvider[]>(['ai-providers']);

            // Optimistic update
            queryClient.setQueryData<AIProvider[]>(['ai-providers'], (old = []) =>
                old.map((provider) =>
                    provider.id === id
                        ? { ...provider, ...data, updatedAt: new Date().toISOString() }
                        : provider
                )
            );

            return { previous };
        },
        onError: (error, _, context) => {
            queryClient.setQueryData(['ai-providers'], context?.previous);
            toast.error('Failed to update provider', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
        onSuccess: () => {
            toast.success('Provider updated successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
        },
    });

    // Delete provider
    const deleteMutation = useMutation({
        mutationFn: aiProviderApi.delete,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['ai-providers'] });
            const previous = queryClient.getQueryData<AIProvider[]>(['ai-providers']);

            // Optimistic update
            queryClient.setQueryData<AIProvider[]>(['ai-providers'], (old = []) =>
                old.filter((provider) => provider.id !== id)
            );

            return { previous };
        },
        onError: (error, _, context) => {
            queryClient.setQueryData(['ai-providers'], context?.previous);
            toast.error('Failed to delete provider', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
        onSuccess: () => {
            toast.success('Provider deleted successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
        },
    });

    // Test provider
    const testMutation = useMutation({
        mutationFn: aiProviderApi.test,
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Connection successful', {
                    description: data.message || 'Provider is working correctly',
                });
            } else {
                toast.error('Connection failed', {
                    description: data.error || 'Unknown error',
                });
            }
        },
        onError: (error) => {
            toast.error('Connection test failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    return {
        providers,
        isLoading,
        error,
        createProvider: createMutation.mutate,
        updateProvider: updateMutation.mutate,
        deleteProvider: deleteMutation.mutate,
        testProvider: testMutation.mutate,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isTesting: testMutation.isPending,
    };
}

// Hook for single provider
export function useAIProvider(id: string) {
    return useQuery({
        queryKey: ['ai-providers', id],
        queryFn: () => aiProviderApi.get(id),
        enabled: !!id,
    });
}
