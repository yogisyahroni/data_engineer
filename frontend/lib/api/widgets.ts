import type { Widget } from '@/lib/types/batch3';

const API_BASE = '/api/go';

export const widgetApi = {
    // GET /api/go/widgets?canvasId=xxx
    list: async (canvasId: string): Promise<Widget[]> => {
        const params = new URLSearchParams({ canvasId });
        const res = await fetch(`${API_BASE}/widgets?${params.toString()}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch widgets');
        }
        return res.json();
    },

    // POST /api/go/widgets
    create: async (data: { canvasId: string; type: string; config?: Record<string, any>; position?: Record<string, any> }): Promise<Widget> => {
        const res = await fetch(`${API_BASE}/widgets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create widget');
        }
        return res.json();
    },

    // PUT /api/go/widgets/:id
    update: async (id: string, data: Partial<Widget>): Promise<Widget> => {
        const res = await fetch(`${API_BASE}/widgets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update widget');
        }
        return res.json();
    },

    // DELETE /api/go/widgets/:id
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/widgets/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete widget');
        }
    },
};
