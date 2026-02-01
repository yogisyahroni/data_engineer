'use client';

import { useState, useCallback } from 'react';
import { type QueryResult } from '@/lib/types';

interface ExecuteOptions {
  sql: string;
  connectionId: string;
  aiPrompt?: string;
  limit?: number;
  page?: number;     // 1-indexed
  pageSize?: number; // default 50
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalRows: number;
}

interface QueryState {
  isLoading: boolean;
  isExecuting: boolean;
  data: Record<string, any>[] | null;
  columns: string[] | null;
  rowCount: number;
  executionTime: number;
  error: string | null;
  pagination: PaginationState;
}

export function useQueryExecution() {
  // Store the last execution options to support re-running on page change
  const [lastOptions, setLastOptions] = useState<ExecuteOptions | null>(null);

  const [state, setState] = useState<QueryState>({
    isLoading: false,
    isExecuting: false,
    data: null,
    columns: null,
    rowCount: 0,
    executionTime: 0,
    error: null,
    pagination: {
      page: 1,
      pageSize: 50,
      totalRows: 0,
    },
  });

  const execute = useCallback(async (options: ExecuteOptions) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isExecuting: true,
      error: null,
    }));

    try {
      console.log('[v0] Starting query execution:', {
        connectionId: options.connectionId,
        sqlLength: options.sql.length,
        hasAiPrompt: !!options.aiPrompt,
      });

      const response = await fetch('/api/go/queries/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: options.sql,
          connectionId: options.connectionId,
          aiPrompt: options.aiPrompt,
          limit: options.limit || 1000,
          page: options.page || 1,
          pageSize: options.pageSize || 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        data?: Record<string, any>[];
        columns?: string[];
        rowCount: number;
        executionTime: number;
        error?: string;
        totalRows?: number; // Expect from API
      };

      if (!result.success) {
        throw new Error(result.error || 'Query execution failed');
      }

      console.log('[v0] Query executed successfully:', {
        rowCount: result.rowCount,
        executionTime: result.executionTime,
        columns: result.columns?.length,
      });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isExecuting: false,
        data: result.data || null,
        columns: result.columns || null,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
        pagination: {
          page: options.page || 1,
          pageSize: options.pageSize || 50,
          totalRows: result.totalRows || result.rowCount, // Fallback if API doesn't send totalRows
        },
      }));

      // Save options for pagination controls
      setLastOptions({ ...options, page: options.page || 1, pageSize: options.pageSize || 50 });

      return {
        success: true,
        data: result.data,
        columns: result.columns,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[v0] Query execution error:', errorMessage);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isExecuting: false,
        error: errorMessage,
      }));

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const clearResults = useCallback(() => {
    setState({
      isLoading: false,
      isExecuting: false,
      data: null,
      columns: null,
      rowCount: 0,
      executionTime: 0,
      error: null,
      pagination: {
        page: 1,
        pageSize: 50,
        totalRows: 0,
      },
    });
  }, []);

  const setPage = useCallback((newPage: number) => {
    if (lastOptions) {
      execute({ ...lastOptions, page: newPage });
    }
  }, [execute, lastOptions]);

  const setPageSize = useCallback((newSize: number) => {
    if (lastOptions) {
      execute({ ...lastOptions, pageSize: newSize, page: 1 }); // Reset to page 1
    }
  }, [execute, lastOptions]);

  return {
    ...state,
    execute,
    clearResults,
    setPage,
    setPageSize,
  };
}
