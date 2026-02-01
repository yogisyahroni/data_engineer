import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelingApi } from '@/lib/api/modeling';
import type {
    ModelDefinition,
    MetricDefinition,
    CreateModelDefinitionRequest,
    UpdateModelDefinitionRequest,
    CreateMetricDefinitionRequest,
    UpdateMetricDefinitionRequest,
} from '@/lib/types/modeling';

// Query Keys
export const modelingKeys = {
    all: ['modeling'] as const,
    models: () => [...modelingKeys.all, 'models'] as const,
    model: (id: string) => [...modelingKeys.models(), id] as const,
    metrics: () => [...modelingKeys.all, 'metrics'] as const,
    metric: (id: string) => [...modelingKeys.metrics(), id] as const,
    metricsByModel: (modelId: string) => [...modelingKeys.metrics(), 'by-model', modelId] as const,
};

// Model Definitions Hooks

export function useModelDefinitions() {
    return useQuery({
        queryKey: modelingKeys.models(),
        queryFn: () => modelingApi.listModelDefinitions(),
    });
}

export function useModelDefinition(id: string) {
    return useQuery({
        queryKey: modelingKeys.model(id),
        queryFn: () => modelingApi.getModelDefinition(id),
        enabled: !!id,
    });
}

export function useCreateModelDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateModelDefinitionRequest) =>
            modelingApi.createModelDefinition(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: modelingKeys.models() });
        },
    });
}

export function useUpdateModelDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateModelDefinitionRequest }) =>
            modelingApi.updateModelDefinition(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: modelingKeys.models() });
            queryClient.invalidateQueries({ queryKey: modelingKeys.model(variables.id) });
        },
    });
}

export function useDeleteModelDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => modelingApi.deleteModelDefinition(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: modelingKeys.models() });
        },
    });
}

// Metric Definitions Hooks

export function useMetricDefinitions(modelId?: string) {
    return useQuery({
        queryKey: modelId ? modelingKeys.metricsByModel(modelId) : modelingKeys.metrics(),
        queryFn: () => modelingApi.listMetricDefinitions(modelId),
    });
}

export function useMetricDefinition(id: string) {
    return useQuery({
        queryKey: modelingKeys.metric(id),
        queryFn: () => modelingApi.getMetricDefinition(id),
        enabled: !!id,
    });
}

export function useCreateMetricDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateMetricDefinitionRequest) =>
            modelingApi.createMetricDefinition(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: modelingKeys.metrics() });
        },
    });
}

export function useUpdateMetricDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateMetricDefinitionRequest }) =>
            modelingApi.updateMetricDefinition(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: modelingKeys.metrics() });
            queryClient.invalidateQueries({ queryKey: modelingKeys.metric(variables.id) });
        },
    });
}

export function useDeleteMetricDefinition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => modelingApi.deleteMetricDefinition(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: modelingKeys.metrics() });
        },
    });
}
