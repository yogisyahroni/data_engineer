import type {
    AIProvider,
    CreateAIProviderInput,
    UpdateAIProviderInput,
} from '@/lib/types/ai';

const API_BASE = '/api/go/ai-providers';

export const aiProviderApi = {
    // Get all providers
    getAll: async (): Promise<AIProvider[]> => {
        const res = await fetch(API_BASE);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch providers');
        }
        return res.json();
    },

    // Get single provider
    get: async (id: string): Promise<AIProvider> => {
        const res = await fetch(`${API_BASE}/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch provider');
        }
        return res.json();
    },

    // Create provider
    create: async (data: CreateAIProviderInput): Promise<AIProvider> => {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create provider');
        }
        return res.json();
    },

    // Update provider
    update: async (id: string, data: UpdateAIProviderInput): Promise<AIProvider> => {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update provider');
        }
        return res.json();
    },

    // Delete provider
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete provider');
        }
    },

    // Test provider connection
    test: async (id: string): Promise<{ success: boolean; message?: string; error?: string }> => {
        const res = await fetch(`${API_BASE}/${id}/test`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to test provider');
        }
        return res.json();
    },
};

