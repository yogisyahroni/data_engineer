'use client';

import { useState, useCallback, useEffect } from 'react';
import { type BusinessMetric } from '@/lib/types';

interface UseBusinessMetricsOptions {
    status?: string;
    autoFetch?: boolean;
}

export function useBusinessMetrics(options: UseBusinessMetricsOptions = {}) {
    const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (options.status) params.append('status', options.status);

            const response = await fetch(`/api/metrics?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch metrics: ${response.status}`);
            }

            const data = (await response.json()) as { success: boolean; data: BusinessMetric[] };

            if (data.success) {
                setMetrics(data.data);
            } else {
                throw new Error('Failed to fetch metrics');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('[Hooks] Error fetching metrics:', errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [options.status]);

    const saveMetric = useCallback(async (metric: Omit<BusinessMetric, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const response = await fetch('/api/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metric),
            });

            if (!response.ok) throw new Error('Failed to save metric');

            const data = await response.json();
            if (data.success) {
                setMetrics(prev => [data.data, ...prev]);
                return { success: true, data: data.data };
            }
            throw new Error(data.error || 'Failed to save metric');
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    }, []);

    useEffect(() => {
        if (options.autoFetch !== false) {
            fetchMetrics();
        }
    }, [fetchMetrics, options.autoFetch]);

    return {
        metrics,
        isLoading,
        error,
        fetchMetrics,
        saveMetric
    };
}
