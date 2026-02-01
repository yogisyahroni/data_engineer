import type {
    AIRequest,
    AIGenerateRequest,
    AIUsageStats,
} from '@/lib/types/ai';

const API_BASE = '/api/go/ai';

export const aiApi = {
    // Generate content
    generate: async (data: AIGenerateRequest): Promise<AIRequest> => {
        const res = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to generate content');
        }
        return res.json();
    },

    // Get request history
    getRequests: async (params?: {
        limit?: number;
        offset?: number;
        providerId?: string;
    }): Promise<{
        data: AIRequest[];
        total: number;
        limit: number;
        offset: number;
    }> => {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.set('limit', params.limit.toString());
        if (params?.offset) queryParams.set('offset', params.offset.toString());
        if (params?.providerId) queryParams.set('providerId', params.providerId);

        const res = await fetch(`${API_BASE}/requests?${queryParams.toString()}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch requests');
        }
        return res.json();
    },

    // Get single request
    getRequest: async (id: string): Promise<AIRequest> => {
        const res = await fetch(`${API_BASE}/requests/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch request');
        }
        return res.json();
    },

    // Get usage stats
    getStats: async (): Promise<AIUsageStats> => {
        const res = await fetch(`${API_BASE}/stats`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch stats');
        }
        return res.json();
    },
};

