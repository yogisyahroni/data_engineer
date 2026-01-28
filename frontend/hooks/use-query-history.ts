'use client';

import { useState, useCallback } from 'react';
import { type QueryHistory } from '@/lib/types';

export function useQueryHistory() {
  const [history, setHistory] = useState<QueryHistory[]>([]);

  const addToHistory = useCallback(
    (
      sql: string,
      connectionId: string,
      status: 'success' | 'error',
      executionTime: number,
      rowsReturned: number,
      error?: string,
      aiPrompt?: string
    ) => {
      const entry: QueryHistory = {
        id: `history_${Date.now()}`,
        userId: 'current_user', // TODO: Get from context
        connectionId,
        sql,
        aiPrompt,
        status,
        error,
        executionTime,
        rowsReturned,
        createdAt: new Date(),
      };

      setHistory((prev) => [entry, ...prev].slice(0, 100)); // Keep last 100
      console.log('[v0] Added to history:', {
        status,
        executionTime,
        rowsReturned,
      });

      // Save to localStorage for persistence
      try {
        const historyData = localStorage.getItem('insightengine_history');
        const parsed = historyData ? JSON.parse(historyData) : [];
        const updated = [entry, ...parsed].slice(0, 100);
        localStorage.setItem('insightengine_history', JSON.stringify(updated));
      } catch (e) {
        console.error('[v0] Failed to save history:', e);
      }
    },
    []
  );

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);

      // Update localStorage
      try {
        localStorage.setItem('insightengine_history', JSON.stringify(updated));
      } catch (e) {
        console.error('[v0] Failed to save history after delete:', e);
      }

      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('insightengine_history');
    console.log('[v0] History cleared');
  }, []);

  const loadHistory = useCallback(() => {
    try {
      const historyData = localStorage.getItem('insightengine_history');
      if (historyData) {
        const parsed = JSON.parse(historyData);
        setHistory(parsed);
        console.log('[v0] Loaded history:', parsed.length, 'entries');
        return parsed;
      }
    } catch (e) {
      console.error('[v0] Failed to load history:', e);
    }
    return [];
  }, []);

  const getRecentQueries = useCallback((limit: number = 10) => {
    return history.slice(0, limit);
  }, [history]);

  const getQueryStats = useCallback(() => {
    const successful = history.filter((h) => h.status === 'success').length;
    const failed = history.filter((h) => h.status === 'error').length;
    const avgExecutionTime =
      history.length > 0
        ? history.reduce((sum, h) => sum + h.executionTime, 0) / history.length
        : 0;

    return {
      total: history.length,
      successful,
      failed,
      avgExecutionTime: Math.round(avgExecutionTime),
    };
  }, [history]);

  return {
    history,
    addToHistory,
    clearHistory,
    deleteHistoryItem,
    loadHistory,
    getRecentQueries,
    getQueryStats,
  };
}
