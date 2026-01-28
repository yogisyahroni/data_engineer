import { z } from 'zod';

// ============================================================================
// SHARED TYPES
// ============================================================================

export const DatabaseDialectSchema = z.enum(['postgres', 'mysql', 'snowflake', 'bigquery']);
export type DatabaseDialect = z.infer<typeof DatabaseDialectSchema>;

export interface DatabaseSchema {
    tables: TableSchema[];
    relationships?: RelationshipSchema[];
}

export interface TableSchema {
    name: string;
    columns: ColumnSchema[];
    primaryKey?: string;
}

export interface ColumnSchema {
    name: string;
    type: string;
    nullable?: boolean;
    description?: string;
}

export interface RelationshipSchema {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// ============================================================================
// QUERY GENERATION
// ============================================================================

export interface QueryGenerationInput {
    prompt: string;
    schema: DatabaseSchema;
    dialect: DatabaseDialect;
    conversationHistory?: Message[];
    mode?: 'safe' | 'advanced';
}

export interface QueryGenerationResult {
    sql: string;
    explanation: string;
    confidence: number;
    suggestedVisualizations?: ChartType[];
    warnings?: string[];
    metadata?: {
        tablesUsed: string[];
        columnsUsed: string[];
        aggregations?: string[];
    };
}

export type ChartType =
    | 'bar'
    | 'line'
    | 'pie'
    | 'area'
    | 'scatter'
    | 'table'
    | 'number'
    | 'gauge';

// ============================================================================
// LLM PROVIDER INTERFACE
// ============================================================================

export interface LLMProvider {
    /**
     * Generate SQL query from natural language prompt
     */
    generateQuery(input: QueryGenerationInput): Promise<QueryGenerationResult>;

    /**
     * Explain an existing SQL query in plain English
     */
    explainQuery(sql: string, schema: DatabaseSchema): Promise<string>;

    /**
     * Stream response for real-time UI updates
     */
    streamResponse(input: QueryGenerationInput): AsyncIterator<string>;

    /**
     * Suggest optimizations for a query
     */
    optimizeQuery?(sql: string, schema: DatabaseSchema): Promise<{
        optimizedSql: string;
        improvements: string[];
        estimatedSpeedup?: number;
    }>;
}

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

export type ProviderType = 'groq' | 'openai' | 'openrouter' | 'anthropic';

export interface ProviderConfig {
    provider: ProviderType;
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    baseURL?: string;
}

export interface GroqConfig extends ProviderConfig {
    provider: 'groq';
    model?: 'llama-3.1-70b-versatile' | 'llama-3.1-8b-instant' | 'mixtral-8x7b-32768';
}

export interface OpenAIConfig extends ProviderConfig {
    provider: 'openai';
    model?: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
    streaming?: boolean;
}

export interface OpenRouterConfig extends ProviderConfig {
    provider: 'openrouter';
    model?: string; // User can specify any model
}

export interface AnthropicConfig extends ProviderConfig {
    provider: 'anthropic';
    model?: 'claude-3-5-sonnet-20241022' | 'claude-3-haiku-20240307';
}

export type AnyProviderConfig = GroqConfig | OpenAIConfig | OpenRouterConfig | AnthropicConfig;
