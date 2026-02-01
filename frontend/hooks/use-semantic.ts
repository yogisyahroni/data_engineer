'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { semanticApi } from '@/lib/api/semantic';
import { toast } from 'sonner';
import type {
    ExplainDataRequest,
    GenerateQueryRequest,
    GenerateFormulaRequest,
    ChatRequest,
    SemanticRequestsParams,
} from '@/lib/types/semantic';

// Hook for AI data explanation
export function useExplainData() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: semanticApi.explainData,
        onSuccess: (data) => {
            // Invalidate requests list
            queryClient.invalidateQueries({ queryKey: ['semantic-requests'] });

            if (data.error) {
                toast.error('Explanation failed', {
                    description: data.error,
                });
            } else {
                toast.success('Data explained successfully');
            }
        },
        onError: (error: Error) => {
            toast.error('Failed to explain data', {
                description: error.message,
            });
        },
    });

    return {
        explainData: mutation.mutate,
        explainDataAsync: mutation.mutateAsync,
        isExplaining: mutation.isPending,
        explanation: mutation.data,
        error: mutation.error,
    };
}

// Hook for AI query generation
export function useGenerateQuery() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: semanticApi.generateQuery,
        onSuccess: (data) => {
            // Invalidate requests list
            queryClient.invalidateQueries({ queryKey: ['semantic-requests'] });

            if (!data.isValid || data.error) {
                toast.error('Query generation failed', {
                    description: data.error || 'Generated query is invalid',
                });
            } else {
                toast.success('Query generated successfully');
            }
        },
        onError: (error: Error) => {
            toast.error('Failed to generate query', {
                description: error.message,
            });
        },
    });

    return {
        generateQuery: mutation.mutate,
        generateQueryAsync: mutation.mutateAsync,
        isGenerating: mutation.isPending,
        generatedQuery: mutation.data,
        error: mutation.error,
    };
}

// Hook for AI formula generation
export function useGenerateFormula() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: semanticApi.generateFormula,
        onSuccess: (data) => {
            // Invalidate requests list
            queryClient.invalidateQueries({ queryKey: ['semantic-requests'] });

            if (!data.isValid || data.error) {
                toast.error('Formula generation failed', {
                    description: data.error || 'Generated formula is invalid',
                });
            } else {
                toast.success('Formula generated successfully');
            }
        },
        onError: (error: Error) => {
            toast.error('Failed to generate formula', {
                description: error.message,
            });
        },
    });

    return {
        generateFormula: mutation.mutate,
        generateFormulaAsync: mutation.mutateAsync,
        isGenerating: mutation.isPending,
        generatedFormula: mutation.data,
        error: mutation.error,
    };
}

// Hook for AI chat
export function useSemanticChat() {
    const queryClient = useQueryClient();
    const [isStreaming, setIsStreaming] = React.useState(false);
    const [streamedResponse, setStreamedResponse] = React.useState('');

    const mutation = useMutation({
        mutationFn: semanticApi.chat,
        onSuccess: (data) => {
            // Invalidate requests list
            queryClient.invalidateQueries({ queryKey: ['semantic-requests'] });
            // Invalidate conversation-specific queries
            if (data.conversationId) {
                queryClient.invalidateQueries({
                    queryKey: ['semantic-conversation', data.conversationId],
                });
            }

            if (data.error) {
                toast.error('Chat failed', {
                    description: data.error,
                });
            }
        },
        onError: (error: Error) => {
            toast.error('Failed to send message', {
                description: error.message,
            });
        },
    });

    // Streaming function
    const streamMessage = async (data: ChatRequest) => {
        setIsStreaming(true);
        setStreamedResponse('');

        try {
            await semanticApi.chatStream(data, (chunk) => {
                setStreamedResponse((prev) => prev + chunk);
            });

            // After stream completes, invalidate queries to fetch the saved record
            // Note: The backend saves the record at the end of streaming.
            // We might want to wait a bit or just invalidate.
            // But we already have the full response in `streamedResponse`.
            // We can optimistic update or just fetch.
            // Let's invalidate.
            if (data.conversationId) {
                queryClient.invalidateQueries({
                    queryKey: ['semantic-conversation', data.conversationId],
                });
            }
            queryClient.invalidateQueries({ queryKey: ['semantic-requests'] });

        } catch (error: any) {
            toast.error('Streaming failed', {
                description: error.message || 'Unknown error',
            });
        } finally {
            setIsStreaming(false);
        }
    };

    return {
        sendMessage: mutation.mutate,
        sendMessageAsync: mutation.mutateAsync,
        streamMessage,
        isSending: mutation.isPending,
        isStreaming,
        response: mutation.data,
        streamedResponse,
        error: mutation.error,
    };
}

// Hook for semantic request history
export function useSemanticRequests(params?: SemanticRequestsParams) {
    return useQuery({
        queryKey: ['semantic-requests', params],
        queryFn: () => semanticApi.getRequests(params),
    });
}

// Hook for single semantic request
export function useSemanticRequest(id: string) {
    return useQuery({
        queryKey: ['semantic-requests', id],
        queryFn: () => semanticApi.getRequest(id),
        enabled: !!id,
    });
}

// Hook for conversation history (filtered by conversationId)
export function useSemanticConversation(conversationId: string) {
    return useQuery({
        queryKey: ['semantic-conversation', conversationId],
        queryFn: () =>
            semanticApi.getRequests({
                type: 'chat',
                limit: 100, // Get full conversation
            }),
        select: (data) => {
            // Filter by conversationId
            return data.data.filter((req) => req.conversationId === conversationId);
        },
        enabled: !!conversationId,
    });
}
