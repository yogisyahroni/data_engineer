import type {
    IngestionRequest,
    IngestionPreviewRequest,
    IngestionPreview,
    IngestionResult,
} from '@/lib/types/batch2';

const API_BASE = '/api/go';

export const ingestionApi = {
    // POST /api/go/ingest/preview
    preview: async (request: IngestionPreviewRequest): Promise<IngestionPreview> => {
        const res = await fetch(`${API_BASE}/ingest/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to preview ingestion');
        }
        return res.json();
    },

    // POST /api/go/ingest
    ingest: async (request: IngestionRequest): Promise<IngestionResult> => {
        const res = await fetch(`${API_BASE}/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to ingest data');
        }
        return res.json();
    },
};
