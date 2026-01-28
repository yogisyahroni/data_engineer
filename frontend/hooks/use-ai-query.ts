'use client';

import { useState, useCallback } from 'react';

interface AIQueryResult {
    sql: string;
    explanation: string;
    prompt: string;
    confidence: number;
    suggestedVisualization: string;
}

interface UseAIQueryOptions {
    connectionId?: string;
    schema?: {
        tables: Array<{
            name: string;
            columns: Array<{ name: string; type: string }>;
        }>;
    };
}

export function useAIQuery(options: UseAIQueryOptions = {}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastResult, setLastResult] = useState<AIQueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Generate SQL from natural language prompt
    const generateSQL = useCallback(async (prompt: string, aiOptions?: { modelId: string, providerId: string }): Promise<AIQueryResult | null> => {
        if (!prompt.trim()) {
            setError('Please enter a prompt');
            return null;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    connectionId: options.connectionId,
                    schema: options.schema,
                    aiOptions, // Pass provider/model selection
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to generate SQL');
            }

            setLastResult(result.data);
            return result.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('[Hooks] AI query error:', errorMessage);
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [options.connectionId, options.schema]);

    // Refine/modify existing SQL
    const refineSQL = useCallback(async (currentSQL: string, modification: string): Promise<AIQueryResult | null> => {
        const prompt = `Modify this SQL query: ${modification}\n\nCurrent query:\n${currentSQL}`;
        return generateSQL(prompt);
    }, [generateSQL]);

    // Explain existing SQL
    const explainSQL = useCallback(async (sql: string): Promise<string | null> => {
        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Explain this SQL query in simple terms:\n\n${sql}`,
                    connectionId: options.connectionId,
                }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to explain SQL');
            }

            return result.data.explanation;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [options.connectionId]);

    // Suggest optimizations for SQL
    const suggestOptimizations = useCallback(async (sql: string): Promise<string[]> => {
        // Mock optimization suggestions
        const suggestions: string[] = [];

        if (sql.includes('SELECT *')) {
            suggestions.push('Consider selecting only the columns you need instead of using SELECT *');
        }
        if (!sql.toLowerCase().includes('limit')) {
            suggestions.push('Add a LIMIT clause to prevent fetching too many rows');
        }
        if (sql.toLowerCase().includes('like') && sql.includes('%')) {
            suggestions.push('Leading wildcards in LIKE patterns can prevent index usage');
        }
        if (sql.toLowerCase().includes('order by') && !sql.toLowerCase().includes('limit')) {
            suggestions.push('Sorting without LIMIT can be expensive on large tables');
        }

        return suggestions;
    }, []);

    // Clear state
    const clearResult = useCallback(() => {
        setLastResult(null);
        setError(null);
    }, []);

    return {
        // State
        isGenerating,
        lastResult,
        error,

        // Actions
        generateSQL,
        refineSQL,
        explainSQL,
        suggestOptimizations,
        clearResult,
    };
}
