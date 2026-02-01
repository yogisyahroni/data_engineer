'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionApi } from '@/lib/api/collections';
import { toast } from 'sonner';
import type { CreateCollectionRequest, Collection } from '@/lib/types/batch3';

export function useCollections() {
  const queryClient = useQueryClient();

  // Query: List collections
  const { data: collections = [], isLoading, error } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionApi.list,
  });

  // Mutation: Create collection (with optimistic update)
  const createMutation = useMutation({
    mutationFn: collectionApi.create,
    onMutate: async (newCollection) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      const previousCollections = queryClient.getQueryData(['collections']);

      const tempId = `temp-${Date.now()}`;
      const optimisticCollection: any = {
        id: tempId,
        ...newCollection,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _optimistic: true,
        _status: 'pending',
      };

      queryClient.setQueryData(['collections'], (old: any) => [optimisticCollection, ...(old || [])]);

      return { previousCollections, tempId };
    },
    onSuccess: (realCollection, variables, context) => {
      queryClient.setQueryData(['collections'], (old: any) =>
        (old || []).map((item: any) =>
          item.id === context?.tempId ? { ...realCollection, _optimistic: false } : item
        )
      );
      toast.success('Collection created successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(['collections'], context.previousCollections);
      }
      toast.error(`Failed to create collection: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  // Mutation: Update collection (with optimistic update)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Collection> }) =>
      collectionApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      const previousCollections = queryClient.getQueryData(['collections']);

      queryClient.setQueryData(['collections'], (old: any) =>
        (old || []).map((item: any) =>
          item.id === id ? { ...item, ...data, _optimistic: true, _status: 'pending' } : item
        )
      );

      return { previousCollections };
    },
    onSuccess: (updatedCollection, { id }) => {
      queryClient.setQueryData(['collections'], (old: any) =>
        (old || []).map((item: any) =>
          item.id === id ? { ...updatedCollection, _optimistic: false } : item
        )
      );
      toast.success('Collection updated successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(['collections'], context.previousCollections);
      }
      toast.error(`Failed to update collection: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  // Mutation: Delete collection (with optimistic update)
  const deleteMutation = useMutation({
    mutationFn: collectionApi.delete,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['collections'] });
      const previousCollections = queryClient.getQueryData(['collections']);

      queryClient.setQueryData(['collections'], (old: any) =>
        (old || []).filter((item: any) => item.id !== id)
      );

      return { previousCollections };
    },
    onSuccess: () => {
      toast.success('Collection deleted successfully');
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(['collections'], context.previousCollections);
      }
      toast.error(`Failed to delete collection: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  // Mutation: Add item to collection
  const addItemMutation = useMutation({
    mutationFn: ({ collectionId, itemType, itemId }: { collectionId: string; itemType: 'pipeline' | 'dataflow'; itemId: string }) =>
      collectionApi.addItem(collectionId, itemType, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Item added to collection');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

  // Mutation: Remove item from collection
  const removeItemMutation = useMutation({
    mutationFn: ({ collectionId, itemId }: { collectionId: string; itemId: string }) =>
      collectionApi.removeItem(collectionId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Item removed from collection');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove item: ${error.message}`);
    },
  });

  return {
    // Data
    collections,
    isLoading,
    error: error?.message || null,

    // Mutations
    createCollection: async (data: CreateCollectionRequest) => {
      try {
        await createMutation.mutateAsync(data);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    updateCollection: async (id: string, data: Partial<Collection>) => {
      try {
        await updateMutation.mutateAsync({ id, data });
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    deleteCollection: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    addItem: async (collectionId: string, itemType: 'pipeline' | 'dataflow', itemId: string) => {
      try {
        await addItemMutation.mutateAsync({ collectionId, itemType, itemId });
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    removeItem: async (collectionId: string, itemId: string) => {
      try {
        await removeItemMutation.mutateAsync({ collectionId, itemId });
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },

    // Helper function to build tree structure
    getCollectionTree: () => {
      const collectionMap = new Map<string, any>();
      const rootCollections: any[] = [];

      // First pass: create map of all collections with children array
      collections.forEach((collection: any) => {
        collectionMap.set(collection.id, { ...collection, children: [] });
      });

      // Second pass: build tree structure
      collections.forEach((collection: any) => {
        const node = collectionMap.get(collection.id);
        if (collection.parentId && collectionMap.has(collection.parentId)) {
          // Add to parent's children
          const parent = collectionMap.get(collection.parentId);
          parent.children.push(node);
        } else {
          // Root level collection (no parent or parent not found)
          rootCollections.push(node);
        }
      });

      return rootCollections;
    },

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingItem: addItemMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
  };
}
