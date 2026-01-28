'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Dashboard, QueryResult } from '@/lib/types';
import { useQueryExecution } from './use-query-execution';

import { replaceQueryVariables, applyFiltersToSql } from '@/lib/sql-utils';

interface UseDashboardDataOptions {
    autoFetch?: boolean;
    globalFilters?: Record<string, any>; // variableName -> value
}

interface DashboardDataState {
    results: Record<string, QueryResult>; // queryId -> Result
    isLoading: boolean;
    errors: Record<string, string>;
    lastRefreshed: Date | null;
}

export function useDashboardData(dashboard: Dashboard | null, options: UseDashboardDataOptions = {}) {
    const [state, setState] = useState<DashboardDataState>({
        results: {},
        isLoading: false,
        errors: {},
        lastRefreshed: null
    });

    const { execute } = useQueryExecution();
    const abortControllerRef = useRef<AbortController | null>(null);

    const refreshDashboard = useCallback(async () => {
        if (!dashboard || !dashboard.cards.length) return;

        // Cancel previous requests if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setState(prev => ({ ...prev, isLoading: true, errors: {} }));

        try {
            // Identify cards with queries
            const queryCards = dashboard.cards.filter(c => c.queryId && c.query);

            if (queryCards.length === 0) {
                setState(prev => ({ ...prev, isLoading: false, lastRefreshed: new Date() }));
                return;
            }

            console.log(`[DashboardData] Fetching data for ${queryCards.length} cards...`);

            // Execute queries in parallel
            // Note: In a real production app, we should batch this or use a specialized bulk endpoint
            const promises = queryCards.map(async (card) => {
                if (!card.query) return null;

                try {
                    // Inject Global Filters
                    let finalSql = card.query.sql;
                    if (options.globalFilters && Object.keys(options.globalFilters).length > 0) {
                        // 1. Replace variables (e.g. {{param}} or :param)
                        finalSql = replaceQueryVariables(finalSql, options.globalFilters);

                        // 2. Inject WHERE clauses (Cross-filtering wrapper)
                        finalSql = applyFiltersToSql(finalSql, options.globalFilters);
                    }

                    const result = await execute({
                        sql: finalSql,
                        connectionId: card.query.connectionId,
                        limit: 1000 // Dashboard limit
                    });

                    return {
                        queryId: card.queryId!,
                        result: {
                            id: `exec_${Date.now()}`,
                            queryId: card.queryId!,
                            status: result.success ? 'success' : 'error',
                            data: result.data,
                            columns: result.columns,
                            rowCount: result.rowCount,
                            executionTime: result.executionTime,
                            error: result.error,
                            createdAt: new Date()
                        } as QueryResult
                    };
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    return {
                        queryId: card.queryId!,
                        result: {
                            id: `err_${Date.now()}`,
                            queryId: card.queryId!,
                            status: 'error',
                            rowCount: 0,
                            executionTime: 0,
                            error: msg,
                            createdAt: new Date()
                        } as QueryResult
                    };
                }
            });

            const results = await Promise.all(promises);

            // Update state
            const newResults: Record<string, QueryResult> = {};
            const newErrors: Record<string, string> = {};

            results.forEach(item => {
                if (item) {
                    newResults[item.queryId] = item.result;
                    if (item.result.error) {
                        newErrors[item.queryId] = item.result.error;
                    }
                }
            });

            setState(prev => ({
                ...prev,
                results: { ...prev.results, ...newResults },
                isLoading: false,
                lastRefreshed: new Date(),
                errors: newErrors
            }));

        } catch (error) {
            console.error('[DashboardData] Critical error fetching dashboard data:', error);
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [dashboard, execute]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Auto Fetch when dashboard loads
    useEffect(() => {
        if (options.autoFetch !== false && dashboard) {
            refreshDashboard();
        }
        // ESLint warning about dependencies: strictly we want to run when dashboard ID changes
        // or when explicitly asked. Adding 'dashboard' here might trigger too often if object ref changes.
        // Better to rely on dashboard.id
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashboard?.id, JSON.stringify(options.globalFilters)]);

    return {
        ...state,
        refresh: refreshDashboard
    };
}
