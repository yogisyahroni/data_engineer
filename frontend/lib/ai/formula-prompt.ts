/**
 * AI Prompt Builder for Formula Generation
 * Constructs specialized prompts for generating SQL metric expressions
 */

export interface FormulaGenerationContext {
    modelName: string;
    tableName?: string;
    availableColumns: string[];
    existingMetrics: Array<{ name: string; expression: string; description?: string }>;
    userPrompt: string;
}

/**
 * Build the system prompt for formula generation
 */
export function buildFormulaSystemPrompt(): string {
    return `You are a Business Intelligence metric formula generator. Your task is to generate valid SQL expressions for calculated metrics.

RULES:
1. Use SQL syntax (SUM, AVG, COUNT, CASE WHEN, etc.)
2. Reference other metrics using \${MetricName} syntax
3. Reference physical columns directly (no special syntax)
4. Return ONLY the SQL expression, no explanations
5. Keep expressions concise and efficient
6. Use proper SQL functions for aggregations

EXAMPLES:
User: "profit margin as percentage"
Available Metrics: Revenue, Cost
Output: ((\${Revenue} - \${Cost}) / \${Revenue}) * 100

User: "average order value"
Available Columns: total_amount, order_id
Output: AVG(total_amount)

User: "customer lifetime value"
Available Metrics: TotalRevenue
Available Columns: customer_id
Output: \${TotalRevenue} / COUNT(DISTINCT customer_id)`;
}

/**
 * Build the user prompt with context
 */
export function buildFormulaUserPrompt(context: FormulaGenerationContext): string {
    const { modelName, tableName, availableColumns, existingMetrics, userPrompt } = context;

    let prompt = `Generate a SQL metric expression for: "${userPrompt}"\n\n`;
    prompt += `MODEL: ${modelName}\n`;
    if (tableName) {
        prompt += `SOURCE TABLE: ${tableName}\n`;
    }

    if (availableColumns.length > 0) {
        prompt += `\nAVAILABLE COLUMNS:\n`;
        prompt += availableColumns.map(col => `- ${col}`).join('\n');
    }

    if (existingMetrics.length > 0) {
        prompt += `\n\nEXISTING METRICS (use \${Name} to reference):\n`;
        prompt += existingMetrics.map(m => {
            const desc = m.description ? ` (${m.description})` : '';
            return `- \${${m.name}}${desc}: ${m.expression}`;
        }).join('\n');
    }

    prompt += `\n\nGENERATE THE SQL EXPRESSION:`;
    return prompt;
}

/**
 * Parse AI response and extract expression
 */
export function parseFormulaResponse(response: string): { expression: string; explanation?: string } {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    cleaned = cleaned.replace(/```sql\n?/g, '');
    cleaned = cleaned.replace(/```\n?/g, '');
    cleaned = cleaned.trim();

    // If response contains explanation, try to extract just the expression
    const lines = cleaned.split('\n');
    if (lines.length > 1) {
        // Assume first non-empty line is the expression
        const expression = lines.find(line => line.trim().length > 0) || cleaned;
        const explanation = lines.slice(1).join('\n').trim();
        return { expression, explanation: explanation || undefined };
    }

    return { expression: cleaned };
}
