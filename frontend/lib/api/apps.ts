import type { App } from '@/lib/types/batch3';

const API_BASE = '/api/go';

export const appApi = {
    // GET /api/go/apps
    list: async (): Promise<App[]> => {
        const res = await fetch(`${API_BASE}/apps`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch apps');
        }
        return res.json();
    },

    // POST /api/go/apps
    create: async (data: { name: string; description?: string; workspaceId?: string }): Promise<App> => {
        const res = await fetch(`${API_BASE}/apps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create app');
        }
        return res.json();
    },

    // GET /api/go/apps/:id
    get: async (id: string): Promise<App> => {
        const res = await fetch(`${API_BASE}/apps/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch app');
        }
        return res.json();
    },

    // PUT /api/go/apps/:id
    update: async (id: string, data: Partial<App>): Promise<App> => {
        const res = await fetch(`${API_BASE}/apps/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update app');
        }
        return res.json();
    },

    // DELETE /api/go/apps/:id
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/apps/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete app');
        }
    },
};
