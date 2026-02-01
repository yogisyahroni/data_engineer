import type {
    Dataflow,
    DataflowRun,
    CreateDataflowRequest,
    PaginationParams,
    PaginatedResponse,
} from '@/lib/types/batch2';

const API_BASE = '/api/go';

export const dataflowApi = {
    // GET /api/go/dataflows (with optional pagination)
    list: async (params: PaginationParams = {}): Promise<PaginatedResponse<Dataflow>> => {
        const { limit = 20, offset = 0 } = params;

        const res = await fetch(`${API_BASE}/dataflows?limit=${limit}&offset=${offset}`);

        if (!res.ok) throw new Error(`Failed to fetch dataflows: ${res.status}`);

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

    // POST /api/go/dataflows
    create: async (data: CreateDataflowRequest): Promise<Dataflow> => {
        const res = await fetch(`${API_BASE}/dataflows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create dataflow');
        }
        return res.json();
    },

    // POST /api/go/dataflows/:id/run
    run: async (id: string): Promise<DataflowRun> => {
        const res = await fetch(`${API_BASE}/dataflows/${id}/run`, {
            method: 'POST',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to run dataflow');
        }
        return res.json();
    },

    // PUT /api/go/dataflows/:id
    update: async (id: string, data: Partial<Dataflow>): Promise<Dataflow> => {
        const res = await fetch(`${API_BASE}/dataflows/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update dataflow');
        }
        return res.json();
    },

    // DELETE /api/go/dataflows/:id
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/dataflows/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete dataflow');
        }
    },
};
