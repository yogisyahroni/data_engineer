import type { Comment, CreateCommentRequest } from '@/lib/types/batch3';

const API_BASE = '/api/go';

export const commentApi = {
    // GET /api/go/comments?entityType=pipeline&entityId=xxx
    list: async (entityType: string, entityId: string): Promise<Comment[]> => {
        const params = new URLSearchParams({ entityType, entityId });
        const res = await fetch(`${API_BASE}/comments?${params.toString()}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch comments');
        }
        return res.json();
    },

    // POST /api/go/comments
    create: async (data: CreateCommentRequest): Promise<Comment> => {
        const res = await fetch(`${API_BASE}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create comment');
        }
        return res.json();
    },

    // PUT /api/go/comments/:id
    update: async (id: string, content: string): Promise<Comment> => {
        const res = await fetch(`${API_BASE}/comments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update comment');
        }
        return res.json();
    },

    // DELETE /api/go/comments/:id
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/comments/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete comment');
        }
    },
};
