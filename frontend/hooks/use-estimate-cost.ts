import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { semanticApi } from '@/lib/api/semantic';
import type { EstimateCostRequest, EstimateCostResponse } from '@/lib/types/semantic';

interface UseEstimateCostOptions {
    model?: string;
    systemPrompt?: string;
    expectedOutputTokens?: number;
    debounceMs?: number;
}

export function useEstimateCost(options: UseEstimateCostOptions = {}) {
    const {
        model = 'gemini-1.5-flash',
        systemPrompt = '',
        expectedOutputTokens = 150,
        debounceMs = 300,
    } = options;

    const [estimate, setEstimate] = useState<EstimateCostResponse | null>(null);

    const mutation = useMutation({
        mutationFn: (prompt: string) =>
            semanticApi.estimateCost({
                prompt,
                systemPrompt,
                model,
                expectedOutputTokens,
            }),
        onSuccess: (data) => {
            setEstimate(data);
        },
    });

    // Debounced estimate function
    const estimateCost = (prompt: string) => {
        if (!prompt || prompt.trim().length === 0) {
            setEstimate(null);
            return;
        }

        mutation.mutate(prompt);
    };

    // Debounced version
    useEffect(() => {
        const handler = setTimeout(() => {
            // This effect is just for setup, actual debouncing happens in component
        }, debounceMs);

        return () => clearTimeout(handler);
    }, [debounceMs]);

    return {
        estimate,
        estimateCost,
        isEstimating: mutation.isPending,
        error: mutation.error,
    };
}

// Hook for real-time estimation as user types
export function useRealtimeTokenCount(prompt: string, options: UseEstimateCostOptions = {}) {
    const { debounceMs = 300, ...restOptions } = options;
    const { estimateCost, ...rest } = useEstimateCost({ debounceMs, ...restOptions });

    useEffect(() => {
        const handler = setTimeout(() => {
            estimateCost(prompt);
        }, debounceMs);

        return () => clearTimeout(handler);
    }, [prompt, debounceMs, estimateCost]);

    return rest;
}
