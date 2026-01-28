'use client';

import { useState, useCallback, useEffect } from 'react';
import { type Collection } from '@/lib/types';

interface UseCollectionsOptions {
  userId?: string;
  autoFetch?: boolean;
}

export function useCollections(options: UseCollectionsOptions = {}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.userId) params.append('userId', options.userId);

      const response = await fetch(`/api/collections?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch collections: ${response.status}`);
      }

      const data = (await response.json()) as { success: boolean; data: Collection[] };

      if (data.success) {
        setCollections(data.data);
        console.log('[v0] Loaded collections:', data.data.length);
      } else {
        throw new Error('Failed to fetch collections');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[v0] Error fetching collections:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [options.userId]);

  const createCollection = useCallback(
    async (collection: Omit<Collection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      try {
        const response = await fetch('/api/collections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(collection),
        });

        if (!response.ok) {
          throw new Error(`Failed to create collection: ${response.status}`);
        }

        const data = (await response.json()) as { success: boolean; data: Collection };

        if (data.success) {
          setCollections((prev) => [...prev, data.data]);
          console.log('[v0] Collection created:', data.data.id);
          return { success: true, data: data.data };
        } else {
          throw new Error('Failed to create collection');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[v0] Error creating collection:', errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  const updateCollection = useCallback(async (collectionId: string, updates: Partial<Collection>) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update collection');

      const data = await response.json();
      if (data.success) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collectionId ? { ...c, ...data.data } : c
          )
        );
      }
    } catch (error) {
      console.error('Failed to update collection', error);
    }
  }, []);

  const deleteCollection = useCallback(async (collectionId: string) => {
    try {
      await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
      setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    } catch (error) {
      console.error('Failed to delete collection', error);
    }
  }, []);

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchCollections();
    }
  }, [fetchCollections, options.autoFetch]);

  return {
    collections,
    isLoading,
    error,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    // Build a tree structure for nested collections
    getCollectionTree: () => {
      const map = new Map<string, any>();
      collections.forEach((c) => map.set(c.id, { ...c, children: [] }));
      const tree: any[] = [];
      map.forEach((node) => {
        if (node.parentId && map.has(node.parentId)) {
          map.get(node.parentId).children.push(node);
        } else {
          tree.push(node);
        }
      });
      return tree;
    },
  };
}
