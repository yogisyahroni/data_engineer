import type { Workspace, WorkspaceMember } from '@/lib/types/batch3';

const API_BASE = '/api/go';

export const workspaceApi = {
    // GET /api/go/workspaces
    list: async (): Promise<Workspace[]> => {
        const res = await fetch(`${API_BASE}/workspaces`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch workspaces');
        }
        return res.json();
    },

    // POST /api/go/workspaces
    create: async (data: { name: string; description?: string }): Promise<Workspace> => {
        const res = await fetch(`${API_BASE}/workspaces`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create workspace');
        }
        return res.json();
    },

    // GET /api/go/workspaces/:id
    get: async (id: string): Promise<Workspace> => {
        const res = await fetch(`${API_BASE}/workspaces/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch workspace');
        }
        return res.json();
    },

    // PUT /api/go/workspaces/:id
    update: async (id: string, data: Partial<Workspace>): Promise<Workspace> => {
        const res = await fetch(`${API_BASE}/workspaces/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update workspace');
        }
        return res.json();
    },

    // DELETE /api/go/workspaces/:id
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/workspaces/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete workspace');
        }
    },
};

export const workspaceMemberApi = {
    // GET /api/go/workspace-members?workspaceId=xxx
    list: async (workspaceId: string): Promise<WorkspaceMember[]> => {
        const params = new URLSearchParams({ workspaceId });
        const res = await fetch(`${API_BASE}/workspace-members?${params.toString()}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch members');
        }
        return res.json();
    },

    // POST /api/go/workspace-members
    invite: async (data: { workspaceId: string; userId: string; role: string }): Promise<WorkspaceMember> => {
        const res = await fetch(`${API_BASE}/workspace-members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to invite member');
        }
        return res.json();
    },

    // PUT /api/go/workspace-members/:id
    updateRole: async (id: string, role: string): Promise<WorkspaceMember> => {
        const res = await fetch(`${API_BASE}/workspace-members/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update member role');
        }
        return res.json();
    },

    // DELETE /api/go/workspace-members/:id
    remove: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/workspace-members/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to remove member');
        }
    },
};
