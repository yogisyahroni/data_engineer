import type { Collection, CreateCollectionRequest, CollectionItem } from '@/lib/types/batch3';

const API_BASE = '/api/go';

export const collectionApi = {
    // GET /api/go/collections
    list: async (): Promise<Collection[]> => {
        const res = await fetch(`${API_BASE}/collections`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch collections');
        }
        return res.json();
    },

    // POST /api/go/collections
    create: async (data: CreateCollectionRequest): Promise<Collection> => {
        const res = await fetch(`${API_BASE}/collections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create collection');
        }
        return res.json();
    },

    // GET /api/go/collections/:id
    get: async (id: string): Promise<Collection> => {
        const res = await fetch(`${API_BASE}/collections/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch collection');
        }
        return res.json();
    },

    // PUT /api/go/collections/:id
    update: async (id: string, data: Partial<Collection>): Promise<Collection> => {
        const res = await fetch(`${API_BASE}/collections/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update collection');
        }
        return res.json();
    },

    // DELETE /api/go/collections/:id
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/collections/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete collection');
        }
    },

    // POST /api/go/collections/:id/items
    addItem: async (collectionId: string, itemType: 'pipeline' | 'dataflow', itemId: string): Promise<CollectionItem> => {
        const res = await fetch(`${API_BASE}/collections/${collectionId}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemType, itemId }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to add item to collection');
        }
        return res.json();
    },

    // DELETE /api/go/collections/:id/items/:itemId
    removeItem: async (collectionId: string, itemId: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/collections/${collectionId}/items/${itemId}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to remove item from collection');
        }
    },
};
