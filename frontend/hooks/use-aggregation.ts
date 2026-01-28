
'use client';

import { useState, useCallback } from 'react';
import { AggregationRequest, AggregationResult } from '@/lib/services/aggregation-service';
import { toast } from 'sonner';

interface UseAggregationOptions {
    onSuccess?: (data: any[]) => void;
    onError?: (error: string) => void;
}

export function useAggregation(options?: UseAggregationOptions) {
    const [data, setData] = useState<any[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [executionTime, setExecutionTime] = useState(0);

    const executeAggregation = useCallback(async (request: Omit<AggregationRequest, 'context'>) => {
        setIsLoading(true);
        setError(null);
        setData(null);

        try {
            const response = await fetch('/api/engine/aggregate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            const result: AggregationResult = await response.json();

            if (!response.ok || !result.success) {
                const errorMsg = result.error || 'Failed to fetch aggregation';
                setError(errorMsg);
                if (options?.onError) options.onError(errorMsg);
                else toast.error(errorMsg);
                return;
            }

            setData(result.data || []);
            setExecutionTime(result.executionTime || 0);

            if (options?.onSuccess) {
                options.onSuccess(result.data || []);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setError(msg);
            if (options?.onError) options.onError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [options]);

    return {
        data,
        isLoading,
        error,
        executionTime,
        executeAggregation,
    };
}
