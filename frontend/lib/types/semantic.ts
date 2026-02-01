// Semantic Layer Types
// Matches backend Go structs for semantic operations

export type SemanticOperationType = 'explain' | 'query' | 'formula' | 'chat';

// SemanticRequest - Matches backend models/semantic_request.go
export interface SemanticRequest {
    id: string;
    userId: string;
    workspaceId?: string;
    providerId: string;
    dataSourceId?: string;
    conversationId?: string;
    type: SemanticOperationType;
    prompt: string;
    context?: Record<string, any>;
    response: string;
    generatedSql?: string;
    generatedFormula?: string;
    isValid: boolean;
    error?: string;
    tokensUsed: number;
    cost: number;
    durationMs: number;
    createdAt: string;
    updatedAt: string;
}

// Request types for each semantic operation

export interface ExplainDataRequest {
    providerId?: string; // Optional, uses default if not provided
    type: 'data' | 'query' | 'chart';
    prompt: string;
    context: Record<string, any>;
}

export interface GenerateQueryRequest {
    providerId?: string;
    prompt: string;
    dataSourceId: string;
}

export interface GenerateFormulaRequest {
    providerId?: string;
    description?: string; // Legacy support
    prompt: string;
    dataSourceId?: string;
    context?: Record<string, any>;
    availableColumns?: string[];
}

export interface ChatRequest {
    providerId?: string;
    message: string;
    conversationId?: string;
    context?: Record<string, any>;
}

// Response types

export interface ExplainDataResponse extends SemanticRequest {
    type: 'explain';
}

export interface GenerateQueryResponse extends SemanticRequest {
    type: 'query';
    generatedSql: string;
    isValid: boolean;
}

export interface GenerateFormulaResponse extends SemanticRequest {
    type: 'formula';
    generatedFormula: string;
    isValid: boolean;
}

export interface ChatResponse extends SemanticRequest {
    type: 'chat';
    conversationId: string;
}

// Request history pagination
export interface SemanticRequestsParams {
    type?: SemanticOperationType;
    limit?: number;
    offset?: number;
}

export interface SemanticRequestsResponse {
    data: SemanticRequest[];
    total: number;
    limit: number;
    offset: number;
}

// Conversation history for chat context
export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}

// Cost estimation
export interface EstimateCostRequest {
    prompt: string;
    systemPrompt?: string;
    model: string;
    expectedOutputTokens?: number;
}

export interface EstimateCostResponse {
    estimatedTokens: number;
    estimatedCost: number;
    inputTokens: number;
    outputTokens: number;
    model: string;
}

// Query optimization
export interface OptimizationSuggestion {
    type: 'index' | 'join' | 'select' | 'where' | 'subquery' | 'general';
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    original: string;
    optimized: string;
    impact: string;
    example: string;
}

export interface QueryAnalysisResult {
    query: string;
    suggestions: OptimizationSuggestion[];
    performanceScore: number; // 0-100
    complexityLevel: 'low' | 'medium' | 'high';
    estimatedImprovement: string;
}

export interface AnalyzeQueryRequest {
    query: string;
}

// Formula autocomplete
export interface AutocompleteSuggestion {
    type: 'function' | 'column' | 'operator' | 'keyword';
    value: string;
    label: string;
    description: string;
    signature?: string;
    example: string;
    category: string;
}

export interface AutocompleteRequest {
    input: string;
    cursorPos: number;
    dataSourceId?: string;
}

export interface AutocompleteResponse {
    suggestions: AutocompleteSuggestion[];
    prefix: string;
}



