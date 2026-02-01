import type { Canvas } from '@/lib/types/batch3';

const API_BASE = '/api/go';

export const canvasApi = {
    // GET /api/go/canvases?appId=xxx
    list: async (appId: string): Promise<Canvas[]> => {
        const params = new URLSearchParams({ appId });
        const res = await fetch(`${API_BASE}/canvases?${params.toString()}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch canvases');
        }
        return res.json();
    },

    // POST /api/go/canvases
    create: async (data: { appId: string; name: string; config?: Record<string, any> }): Promise<Canvas> => {
        const res = await fetch(`${API_BASE}/canvases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create canvas');
        }
        return res.json();
    },

    // GET /api/go/canvases/:id
    get: async (id: string): Promise<Canvas> => {
        const res = await fetch(`${API_BASE}/canvases/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch canvas');
        }
        return res.json();
    },

    // PUT /api/go/canvases/:id
    update: async (id: string, data: Partial<Canvas>): Promise<Canvas> => {
        const res = await fetch(`${API_BASE}/canvases/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update canvas');
        }
        return res.json();
    },

    // DELETE /api/go/canvases/:id
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/canvases/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete canvas');
        }
    },
};
