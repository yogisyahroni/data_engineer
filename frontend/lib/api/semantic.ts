import type {
    ExplainDataRequest,
    ExplainDataResponse,
    GenerateQueryRequest,
    GenerateQueryResponse,
    GenerateFormulaRequest,
    GenerateFormulaResponse,
    ChatRequest,
    ChatResponse,
    SemanticRequest,
    SemanticRequestsParams,
    SemanticRequestsResponse,
    EstimateCostRequest,
    EstimateCostResponse,
    AnalyzeQueryRequest,
    QueryAnalysisResult,
    AutocompleteRequest,
    AutocompleteResponse,
} from '@/lib/types/semantic';

const API_BASE = '/api/v1';

export const semanticApi = {
    // POST /api/semantic/explain - AI data explanation
    explainData: async (data: ExplainDataRequest): Promise<ExplainDataResponse> => {
        const res = await fetch(`${API_BASE}/semantic/explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to explain data');
        }
        return res.json();
    },

    // POST /api/semantic/generate-query - AI query generation
    generateQuery: async (data: GenerateQueryRequest): Promise<GenerateQueryResponse> => {
        const res = await fetch(`${API_BASE}/semantic/generate-query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to generate query');
        }
        return res.json();
    },

    // POST /api/semantic/generate-formula - AI formula generation
    generateFormula: async (data: GenerateFormulaRequest): Promise<GenerateFormulaResponse> => {
        const res = await fetch(`${API_BASE}/semantic/generate-formula`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to generate formula');
        }
        return res.json();
    },

    // POST /api/semantic/chat - AI chat
    chat: async (data: ChatRequest): Promise<ChatResponse> => {
        const res = await fetch(`${API_BASE}/semantic/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to send chat message');
        }
        return res.json();
    },

    // POST /api/semantic/chat/stream - AI chat with streaming (SSE)
    chatStream: async (data: ChatRequest, onChunk: (chunk: string) => void): Promise<void> => {
        const res = await fetch(`${API_BASE}/semantic/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to start stream');
        }

        if (!res.body) throw new Error('ReadableStream not supported');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // SSE format: "data: <content>\n\n"
            // We need to parse this.
            // Split by double newlines to get events
            const events = chunk.split('\n\n');

            for (const event of events) {
                if (event.startsWith('data: ')) {
                    const data = event.substring(6);
                    if (data) {
                        onChunk(data);
                    }
                } else if (event.trim() !== '') {
                    // Handle fragmented data or other events if needed
                    // For now, assume simple "data: " prefix strictly
                }
            }
        }
    },

    // GET /api/semantic/requests - Get request history
    getRequests: async (params?: SemanticRequestsParams): Promise<SemanticRequestsResponse> => {
        const queryParams = new URLSearchParams();
        if (params?.type) queryParams.append('type', params.type);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());

        const url = queryParams.toString()
            ? `${API_BASE}/semantic/requests?${queryParams.toString()}`
            : `${API_BASE}/semantic/requests`;

        const res = await fetch(url);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch semantic requests');
        }
        return res.json();
    },

    // GET /api/semantic/requests/:id - Get single request
    getRequest: async (id: string): Promise<SemanticRequest> => {
        const res = await fetch(`${API_BASE}/semantic/requests/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch semantic request');
        }
        return res.json();
    },

    // POST /api/semantic/estimate-cost - Estimate cost before sending
    estimateCost: async (data: EstimateCostRequest): Promise<EstimateCostResponse> => {
        const res = await fetch(`${API_BASE}/semantic/estimate-cost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to estimate cost');
        }
        return res.json();
    },

    // POST /api/semantic/analyze-query - Analyze query for optimization
    analyzeQuery: async (data: AnalyzeQueryRequest): Promise<QueryAnalysisResult> => {
        const res = await fetch(`${API_BASE}/semantic/analyze-query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to analyze query');
        }
        return res.json();
    },

    // POST /api/semantic/formula-autocomplete - Get autocomplete suggestions
    formulaAutocomplete: async (data: AutocompleteRequest): Promise<AutocompleteResponse> => {
        const res = await fetch(`${API_BASE}/semantic/formula-autocomplete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to get autocomplete suggestions');
        }
        return res.json();
    },
};

