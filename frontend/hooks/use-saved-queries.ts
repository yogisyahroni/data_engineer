'use client';

import { useState, useCallback, useEffect } from 'react';
import { type SavedQuery } from '@/lib/types';

interface UseSavedQueriesOptions {
  collectionId?: string;
  userId?: string;
  autoFetch?: boolean;
}

export function useSavedQueries(options: UseSavedQueriesOptions = {}) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.collectionId) params.append('collectionId', options.collectionId);
      if (options.userId) params.append('userId', options.userId);

      const response = await fetch(`/api/queries/saved?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch queries: ${response.status}`);
      }

      const data = (await response.json()) as { success: boolean; data: SavedQuery[] };

      if (data.success) {
        setQueries(data.data);
        console.log('[v0] Loaded queries:', data.data.length);
      } else {
        throw new Error('Failed to fetch queries');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[v0] Error fetching queries:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options.collectionId, options.userId]);

  const saveQuery = useCallback(
    async (query: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'pinned'>) => {
      try {
        const response = await fetch('/api/queries/saved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(query),
        });

        if (!response.ok) {
          throw new Error(`Failed to save query: ${response.status}`);
        }

        const data = (await response.json()) as { success: boolean; data: SavedQuery };

        if (data.success) {
          setQueries((prev) => [data.data, ...prev]);
          console.log('[v0] Query saved:', data.data.id);
          return { success: true, data: data.data };
        } else {
          throw new Error('Failed to save query');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[v0] Error saving query:', errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  const deleteQuery = useCallback(async (queryId: string) => {
    try {
      const response = await fetch(`/api/queries/saved/${queryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete query: ${response.status}`);
      }

      setQueries((prev) => prev.filter((q) => q.id !== queryId));
      console.log('[v0] Query deleted:', queryId);
      return { success: true };
    } catch (err) {
      console.error('[v0] Error deleting query:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  const pinQuery = useCallback(async (queryId: string) => {
    try {
      // Optimistic update
      setQueries((prev) =>
        prev.map((q) =>
          q.id === queryId
            ? { ...q, pinned: !q.pinned, updatedAt: new Date() }
            : q
        )
      );

      const query = queries.find((q) => q.id === queryId);
      if (!query) return;

      const response = await fetch(`/api/queries/saved/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pinned: !query.pinned }),
      });

      if (!response.ok) {
        // Revert on error
        setQueries((prev) =>
          prev.map((q) =>
            q.id === queryId
              ? { ...q, pinned: !q.pinned } // Revert
              : q
          )
        );
        throw new Error('Failed to update pin status');
      }
    } catch (err) {
      console.error('[v0] Error pinning query:', err);
    }
  }, [queries]);

  const updateQuery = useCallback(async (id: string, updates: Partial<SavedQuery>) => {
    try {
      const response = await fetch(`/api/queries/saved/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update query: ${response.status}`);
      }

      const data = (await response.json()) as { success: boolean; data: SavedQuery };

      if (data.success) {
        setQueries((prev) =>
          prev.map((q) => (q.id === id ? data.data : q))
        );
        return { success: true, data: data.data };
      } else {
        throw new Error('Failed to update query');
      }
    } catch (err) {
      console.error('[v0] Error updating query:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, []);

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchQueries();
    }
  }, [options.collectionId, fetchQueries, options.autoFetch]);

  return {
    queries,
    isLoading,
    error,
    fetchQueries,
    saveQuery,
    deleteQuery,
    pinQuery,
    updateQuery,
  };
}
