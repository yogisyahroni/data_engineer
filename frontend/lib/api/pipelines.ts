import type {
    Pipeline,
    PipelineWithRules,
    JobExecution,
    PipelineStats,
    CreatePipelineRequest,
    UpdatePipelineRequest,
    PaginationParams,
    PaginatedResponse,
} from '@/lib/types/batch2';

const API_BASE = '/api/go';

export const pipelineApi = {
    // GET /api/go/pipelines (with optional pagination)
    list: async (
        workspaceId: string,
        params: PaginationParams = {}
    ): Promise<PaginatedResponse<Pipeline>> => {
        const { limit = 20, offset = 0 } = params;

        const res = await fetch(
            `${API_BASE}/pipelines?workspaceId=${workspaceId}&limit=${limit}&offset=${offset}`
        );

        if (!res.ok) throw new Error(`Failed to fetch pipelines: ${res.status}`);

        const json = await res.json();

        // Handle backward compatibility (old format returns array)
        if (Array.isArray(json)) {
            return {
                data: json,
                pagination: {
                    total: json.length,
                    limit: json.length,
                    offset: 0,
                    hasMore: false,
                },
            };
        }

        return json;
    },

    // GET /api/go/pipelines/:id
    get: async (id: string): Promise<PipelineWithRules> => {
        const res = await fetch(`${API_BASE}/pipelines/${id}`);
        if (!res.ok) throw new Error(`Failed to fetch pipeline: ${res.status}`);
        return res.json();
    },

    // POST /api/go/pipelines
    create: async (data: CreatePipelineRequest): Promise<Pipeline> => {
        const res = await fetch(`${API_BASE}/pipelines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create pipeline');
        }
        return res.json();
    },

    // PUT /api/go/pipelines/:id
    update: async (id: string, data: UpdatePipelineRequest): Promise<Pipeline> => {
        const res = await fetch(`${API_BASE}/pipelines/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update pipeline');
        }
        return res.json();
    },

    // DELETE /api/go/pipelines/:id
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/pipelines/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete pipeline');
        }
    },

    // POST /api/go/pipelines/:id/run
    run: async (id: string): Promise<JobExecution> => {
        const res = await fetch(`${API_BASE}/pipelines/${id}/run`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to run pipeline');
        }
        return res.json();
    },

    // GET /api/go/pipelines/stats
    stats: async (workspaceId: string): Promise<PipelineStats> => {
        const res = await fetch(`${API_BASE}/pipelines/stats?workspaceId=${workspaceId}`);
        if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
        return res.json();
    },
};
