import type {
    ModelDefinition,
    MetricDefinition,
    CreateModelDefinitionRequest,
    UpdateModelDefinitionRequest,
    CreateMetricDefinitionRequest,
    UpdateMetricDefinitionRequest,
} from '@/lib/types/modeling';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Model Definitions API

export const modelingApi = {
    // List all model definitions
    listModelDefinitions: async (): Promise<ModelDefinition[]> => {
        const response = await fetch(`${API_BASE_URL}/modeling/definitions`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch model definitions');
        }

        return response.json();
    },

    // Get a single model definition
    getModelDefinition: async (id: string): Promise<ModelDefinition> => {
        const response = await fetch(`${API_BASE_URL}/modeling/definitions/${id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch model definition');
        }

        return response.json();
    },

    // Create a new model definition
    createModelDefinition: async (data: CreateModelDefinitionRequest): Promise<ModelDefinition> => {
        const response = await fetch(`${API_BASE_URL}/modeling/definitions`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create model definition');
        }

        return response.json();
    },

    // Update a model definition
    updateModelDefinition: async (
        id: string,
        data: UpdateModelDefinitionRequest
    ): Promise<ModelDefinition> => {
        const response = await fetch(`${API_BASE_URL}/modeling/definitions/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update model definition');
        }

        return response.json();
    },

    // Delete a model definition
    deleteModelDefinition: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/modeling/definitions/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete model definition');
        }
    },

    // Metric Definitions API

    // List all metric definitions (optionally filtered by model)
    listMetricDefinitions: async (modelId?: string): Promise<MetricDefinition[]> => {
        const url = new URL(`${API_BASE_URL}/modeling/metrics`);
        if (modelId) {
            url.searchParams.append('modelId', modelId);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch metric definitions');
        }

        return response.json();
    },

    // Get a single metric definition
    getMetricDefinition: async (id: string): Promise<MetricDefinition> => {
        const response = await fetch(`${API_BASE_URL}/modeling/metrics/${id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch metric definition');
        }

        return response.json();
    },

    // Create a new metric definition
    createMetricDefinition: async (data: CreateMetricDefinitionRequest): Promise<MetricDefinition> => {
        const response = await fetch(`${API_BASE_URL}/modeling/metrics`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create metric definition');
        }

        return response.json();
    },

    // Update a metric definition
    updateMetricDefinition: async (
        id: string,
        data: UpdateMetricDefinitionRequest
    ): Promise<MetricDefinition> => {
        const response = await fetch(`${API_BASE_URL}/modeling/metrics/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update metric definition');
        }

        return response.json();
    },

    // Delete a metric definition
    deleteMetricDefinition: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/modeling/metrics/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete metric definition');
        }
    },
};
