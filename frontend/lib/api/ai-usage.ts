import type {
    UsageStats,
    AIUsageRequest,
    AIBudget,
    BudgetAlert,
    RateLimitConfig,
    RateLimitViolation,
    GetUsageStatsParams,
    GetRequestHistoryParams,
    RequestHistoryResponse,
    CreateBudgetRequest,
    UpdateBudgetRequest,
    CreateRateLimitRequest,
    UpdateRateLimitRequest,
} from '@/lib/types/ai-usage';

const API_BASE = '/api/v1';

export const aiUsageApi = {
    // Usage Statistics
    getUsageStats: async (params?: GetUsageStatsParams): Promise<UsageStats> => {
        const queryParams = new URLSearchParams();
        if (params?.period) queryParams.append('period', params.period);

        const url = queryParams.toString()
            ? `${API_BASE}/ai/usage?${queryParams.toString()}`
            : `${API_BASE}/ai/usage`;

        const res = await fetch(url);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch usage stats');
        }
        return res.json();
    },

    // Request History
    getRequestHistory: async (params?: GetRequestHistoryParams): Promise<RequestHistoryResponse> => {
        const queryParams = new URLSearchParams();
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());
        if (params?.provider) queryParams.append('provider', params.provider);
        if (params?.status) queryParams.append('status', params.status);
        if (params?.requestType) queryParams.append('requestType', params.requestType);

        const url = queryParams.toString()
            ? `${API_BASE}/ai/request-history?${queryParams.toString()}`
            : `${API_BASE}/ai/request-history`;

        const res = await fetch(url);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch request history');
        }
        return res.json();
    },

    // Budgets
    getBudgets: async (): Promise<AIBudget[]> => {
        const res = await fetch(`${API_BASE}/ai/budgets`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch budgets');
        }
        return res.json();
    },

    createBudget: async (data: CreateBudgetRequest): Promise<AIBudget> => {
        const res = await fetch(`${API_BASE}/ai/budgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create budget');
        }
        return res.json();
    },

    updateBudget: async (id: string, data: UpdateBudgetRequest): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/ai/budgets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update budget');
        }
        return res.json();
    },

    deleteBudget: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/ai/budgets/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete budget');
        }
        return res.json();
    },

    // Alerts
    getAlerts: async (limit = 50): Promise<BudgetAlert[]> => {
        const res = await fetch(`${API_BASE}/ai/alerts?limit=${limit}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch alerts');
        }
        return res.json();
    },

    acknowledgeAlert: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/ai/alerts/${id}/acknowledge`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to acknowledge alert');
        }
        return res.json();
    },

    // Rate Limits
    getRateLimits: async (): Promise<RateLimitConfig[]> => {
        const res = await fetch(`${API_BASE}/rate-limits`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch rate limits');
        }
        return res.json();
    },

    getRateLimit: async (id: string): Promise<RateLimitConfig> => {
        const res = await fetch(`${API_BASE}/rate-limits/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch rate limit');
        }
        return res.json();
    },

    createRateLimit: async (data: CreateRateLimitRequest): Promise<RateLimitConfig> => {
        const res = await fetch(`${API_BASE}/rate-limits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create rate limit');
        }
        return res.json();
    },

    updateRateLimit: async (id: string, data: UpdateRateLimitRequest): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/rate-limits/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update rate limit');
        }
        return res.json();
    },

    deleteRateLimit: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/rate-limits/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete rate limit');
        }
        return res.json();
    },

    getViolations: async (limit = 50): Promise<RateLimitViolation[]> => {
        const res = await fetch(`${API_BASE}/rate-limits/violations?limit=${limit}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch violations');
        }
        return res.json();
    },
};
