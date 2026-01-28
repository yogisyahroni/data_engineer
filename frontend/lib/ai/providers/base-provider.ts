import { AIModel, AIProvider } from "../registry";

export interface AIRequest {
    prompt: string;
    schemaDDL?: string;
    databaseType: string;
    model: AIModel;
}

export interface AIResponse {
    sql: string;
    explanation: string;
    confidence: number;
    suggestedVisualization?: 'bar' | 'line' | 'pie' | 'table' | 'metric';
    insights: string[];
}

export interface IAIProvider {
    /**
     * Generate SQL/Query based on natural language and schema context
     */
    generateQuery(request: AIRequest): Promise<AIResponse>;

    /**
     * Analyze query results and provide human-readable insights
     */
    analyzeResults(data: any[], sql: string): Promise<string[]>;
}
