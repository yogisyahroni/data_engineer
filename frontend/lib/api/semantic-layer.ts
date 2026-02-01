import type {
    SemanticModel,
    SemanticMetric,
    CreateSemanticModelRequest,
    SemanticQueryRequest,
    SemanticQueryResponse,
} from '../types/semantic-layer';

const API_BASE = '/api/v1';

export const semanticLayerApi = {
    // Models
    listModels: async (): Promise<SemanticModel[]> => {
        const res = await fetch(`${API_BASE}/semantic/models`, {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch semantic models');
        }

        return res.json();
    },

    createModel: async (data: CreateSemanticModelRequest): Promise<SemanticModel> => {
        const res = await fetch(`${API_BASE}/semantic/models`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create semantic model');
        }

        return res.json();
    },

    // Metrics
    listMetrics: async (modelId?: string): Promise<SemanticMetric[]> => {
        const url = modelId
            ? `${API_BASE}/semantic/metrics?modelId=${encodeURIComponent(modelId)}`
            : `${API_BASE}/semantic/metrics`;

        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch metrics');
        }

        return res.json();
    },

    // Query
    executeQuery: async (query: SemanticQueryRequest): Promise<SemanticQueryResponse> => {
        const res = await fetch(`${API_BASE}/semantic/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(query),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to execute semantic query');
        }

        return res.json();
    },
};
