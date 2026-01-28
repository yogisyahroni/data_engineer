
import { SchemaInfo } from '@/lib/connectors/base-connector';

export type PromptTemplateType = 'generate-sql' | 'explain-sql' | 'suggest-questions';

interface PromptContext {
    schema?: SchemaInfo;
    dialect: string;
    userPrompt: string;
}

/**
 * Generates a prompt for SQL generation based on schema and dialect.
 */
export function buildQueryGenerationPrompt(context: PromptContext): string {
    const { schema, dialect, userPrompt } = context;

    const schemaText = formatSchemaForPrompt(schema);

    return `
You are an expert SQL Data Analyst. Your goal is to generate a valid ${dialect} SQL query to answer the user's question.

### Database Schema
${schemaText}

### Instructions
1. Use the provided schema to answer the question.
2. Return ONLY the SQL query. No markdown formatting, no explanations.
3. Use a single SELECT statement or CTEs if necessary.
4. If the question cannot be answered with the schema, return "ERROR: I cannot answer this question with the available data."
5. Do not hallucinate columns. Only use those listed in the schema.
6. Make sure to CAST columns if necessary for comparison.
7. Use ILIKE for case-insensitive string matching if supported by dialect.

### User Question
"${userPrompt}"

### SQL Query
`;
}

/**
 * Formats SchemaInfo into a compact string representation for the LLM.
 * Format:
 * Table: users (id: string, email: string, created_at: string)
 * Table: orders (id: string, user_id: string, amount: number)
 */
function formatSchemaForPrompt(schema?: SchemaInfo): string {
    if (!schema || !schema.tables.length) {
        return "No schema information available. Do your best to guess standard column names.";
    }

    return schema.tables.map(table => {
        const cols = table.columns.map(c => `${c.name}: ${c.type}`).join(', ');
        return `Table: ${table.name} (${cols})`;
    }).join('\n');
}

/**
 * Prompt for explaining a SQL query in plain English
 */
export function buildExplanationPrompt(sql: string): string {
    return `
You are a helpful Data Assistant. Explain the following SQL query in simple, plain English to a business user.
Avoid technical jargon where possible. Focus on what data is being retrieved and how it is filtered/aggregated.

SQL:
${sql}

Explanation:
`;
}
