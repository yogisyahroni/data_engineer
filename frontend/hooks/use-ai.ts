'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api/ai';
import { toast } from 'sonner';
import type { AIGenerateRequest, AIRequest } from '@/lib/types/ai';

export function useAI() {
    const queryClient = useQueryClient();

    // Generate content
    const generateMutation = useMutation({
        mutationFn: aiApi.generate,
        onSuccess: (data) => {
            // Invalidate requests list
            queryClient.invalidateQueries({ queryKey: ['ai-requests'] });
            queryClient.invalidateQueries({ queryKey: ['ai-stats'] });

            if (data.status === 'success') {
                toast.success('Content generated successfully');
            } else {
                toast.error('Generation failed', {
                    description: data.error || 'Unknown error',
                });
            }
        },
        onError: (error) => {
            toast.error('Failed to generate content', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        },
    });

    return {
        generate: generateMutation.mutate,
        isGenerating: generateMutation.isPending,
        generatedContent: generateMutation.data,
    };
}

// Hook for request history
export function useAIRequests(params?: {
    limit?: number;
    offset?: number;
    providerId?: string;
}) {
    return useQuery({
        queryKey: ['ai-requests', params],
        queryFn: () => aiApi.getRequests(params),
    });
}

// Hook for single request
export function useAIRequest(id: string) {
    return useQuery({
        queryKey: ['ai-requests', id],
        queryFn: () => aiApi.getRequest(id),
        enabled: !!id,
    });
}

// Hook for usage stats
export function useAIStats() {
    return useQuery({
        queryKey: ['ai-stats'],
        queryFn: aiApi.getStats,
    });
}
