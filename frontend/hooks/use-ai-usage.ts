'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiUsageApi } from '@/lib/api/ai-usage';
import { toast } from 'sonner';
import type {
    GetUsageStatsParams,
    GetRequestHistoryParams,
    CreateBudgetRequest,
    UpdateBudgetRequest,
    CreateRateLimitRequest,
    UpdateRateLimitRequest,
} from '@/lib/types/ai-usage';

// Usage Statistics
export function useUsageStats(params?: GetUsageStatsParams) {
    return useQuery({
        queryKey: ['ai-usage-stats', params],
        queryFn: () => aiUsageApi.getUsageStats(params),
    });
}

// Request History
export function useRequestHistory(params?: GetRequestHistoryParams) {
    return useQuery({
        queryKey: ['ai-request-history', params],
        queryFn: () => aiUsageApi.getRequestHistory(params),
    });
}

// Budgets
export function useBudgets() {
    return useQuery({
        queryKey: ['ai-budgets'],
        queryFn: aiUsageApi.getBudgets,
    });
}

export function useCreateBudget() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateBudgetRequest) => aiUsageApi.createBudget(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-budgets'] });
            toast.success('Budget created successfully');
        },
        onError: (error: Error) => {
            toast.error('Failed to create budget', {
                description: error.message,
            });
        },
    });
}

export function useUpdateBudget() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateBudgetRequest }) =>
            aiUsageApi.updateBudget(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-budgets'] });
            toast.success('Budget updated successfully');
        },
        onError: (error: Error) => {
            toast.error('Failed to update budget', {
                description: error.message,
            });
        },
    });
}

export function useDeleteBudget() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => aiUsageApi.deleteBudget(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-budgets'] });
            toast.success('Budget deleted successfully');
        },
        onError: (error: Error) => {
            toast.error('Failed to delete budget', {
                description: error.message,
            });
        },
    });
}

// Alerts
export function useAlerts(limit = 50) {
    return useQuery({
        queryKey: ['ai-alerts', limit],
        queryFn: () => aiUsageApi.getAlerts(limit),
    });
}

export function useAcknowledgeAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => aiUsageApi.acknowledgeAlert(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ai-alerts'] });
            toast.success('Alert acknowledged');
        },
        onError: (error: Error) => {
            toast.error('Failed to acknowledge alert', {
                description: error.message,
            });
        },
    });
}

// Rate Limits
export function useRateLimits() {
    return useQuery({
        queryKey: ['rate-limits'],
        queryFn: aiUsageApi.getRateLimits,
    });
}

export function useRateLimit(id: string) {
    return useQuery({
        queryKey: ['rate-limits', id],
        queryFn: () => aiUsageApi.getRateLimit(id),
        enabled: !!id,
    });
}

export function useCreateRateLimit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateRateLimitRequest) => aiUsageApi.createRateLimit(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rate-limits'] });
            toast.success('Rate limit created successfully');
        },
        onError: (error: Error) => {
            toast.error('Failed to create rate limit', {
                description: error.message,
            });
        },
    });
}

export function useUpdateRateLimit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateRateLimitRequest }) =>
            aiUsageApi.updateRateLimit(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rate-limits'] });
            toast.success('Rate limit updated successfully');
        },
        onError: (error: Error) => {
            toast.error('Failed to update rate limit', {
                description: error.message,
            });
        },
    });
}

export function useDeleteRateLimit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => aiUsageApi.deleteRateLimit(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rate-limits'] });
            toast.success('Rate limit deleted successfully');
        },
        onError: (error: Error) => {
            toast.error('Failed to delete rate limit', {
                description: error.message,
            });
        },
    });
}

// Violations
export function useViolations(limit = 50) {
    return useQuery({
        queryKey: ['rate-limit-violations', limit],
        queryFn: () => aiUsageApi.getViolations(limit),
    });
}
