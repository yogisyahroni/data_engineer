import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { semanticLayerApi } from '../lib/api/semantic-layer';
import type {
    SemanticModel,
    SemanticMetric,
    CreateSemanticModelRequest,
    SemanticQueryRequest,
    SemanticQueryResponse,
} from '../lib/types/semantic-layer';

// Query keys
const QUERY_KEYS = {
    models: ['semantic-models'] as const,
    metrics: (modelId?: string) => ['semantic-metrics', modelId] as const,
    query: (request: SemanticQueryRequest) => ['semantic-query', request] as const,
};

// Hooks

export function useSemanticModels() {
    return useQuery({
        queryKey: QUERY_KEYS.models,
        queryFn: semanticLayerApi.listModels,
    });
}

export function useCreateSemanticModel() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateSemanticModelRequest) => semanticLayerApi.createModel(data),
        onSuccess: () => {
            // Invalidate models list to refetch
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.models });
        },
    });
}

export function useSemanticMetrics(modelId?: string) {
    return useQuery({
        queryKey: QUERY_KEYS.metrics(modelId),
        queryFn: () => semanticLayerApi.listMetrics(modelId),
    });
}

export function useSemanticQuery(request: SemanticQueryRequest | null) {
    return useQuery({
        queryKey: QUERY_KEYS.query(request!),
        queryFn: () => semanticLayerApi.executeQuery(request!),
        enabled: !!request?.modelId && (request.dimensions.length > 0 || request.metrics.length > 0),
    });
}

export function useExecuteSemanticQuery() {
    return useMutation({
        mutationFn: (request: SemanticQueryRequest) => semanticLayerApi.executeQuery(request),
    });
}
