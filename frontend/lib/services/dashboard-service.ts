import { Dashboard, DashboardCard, VisualizationConfig } from '@/lib/types';

export interface CreateDashboardInput {
    name: string;
    description?: string;
    collectionId: string;
    tags?: string[];
}

export interface UpdateDashboardInput {
    name?: string;
    description?: string;
    isPublic?: boolean;
    collectionId?: string;
    tags?: string[];
    filters?: any[];
    cards?: DashboardCard[]; // Full sync of layout
}

export const dashboardService = {
    async getAll(): Promise<Dashboard[]> {
        const response = await fetch('/api/go/dashboards');
        if (!response.ok) throw new Error('Failed to fetch dashboards');
        const json = await response.json();
        return json.data;
    },

    async getById(id: string): Promise<Dashboard> {
        const response = await fetch(`/api/go/dashboards/${id}`);
        if (!response.ok) throw new Error('Failed to fetch dashboard');
        const json = await response.json();
        return json.data;
    },

    async create(input: CreateDashboardInput): Promise<Dashboard> {
        const response = await fetch('/api/go/dashboards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error('Failed to create dashboard');
        const json = await response.json();
        return json.data;
    },

    async update(id: string, updates: UpdateDashboardInput): Promise<Dashboard> {
        const response = await fetch(`/api/go/dashboards/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error('Failed to update dashboard');
        const json = await response.json();
        return json.data;
    },

    async delete(id: string): Promise<void> {
        const response = await fetch(`/api/go/dashboards/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete dashboard');
    }
};
