import { useMutation } from '@tanstack/react-query';
import { semanticApi } from '@/lib/api/semantic';
import type { QueryAnalysisResult } from '@/lib/types/semantic';

export function useAnalyzeQuery() {
    const mutation = useMutation({
        mutationFn: (query: string) => semanticApi.analyzeQuery({ query }),
    });

    return {
        analyzeQuery: mutation.mutate,
        analyzeQueryAsync: mutation.mutateAsync,
        analysis: mutation.data as QueryAnalysisResult | undefined,
        isAnalyzing: mutation.isPending,
        error: mutation.error,
        reset: mutation.reset,
    };
}
