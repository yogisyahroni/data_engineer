
/**
 * Validates generated SQL to ensure it is safe to execute.
 * Blocks destructive commands like DROP, DELETE, etc.
 */

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

const FORBIDDEN_KEYWORDS = [
    'DROP', 'DELETE', 'TRUNCATE', 'UPDATE', 'INSERT', 'ALTER', 'GRANT', 'REVOKE',
    'CREATE', 'REPLACE', 'EXEC', 'EXECUTE', 'MERGE', 'UPSERT'
];

export function validateGeneratedSql(sql: string): ValidationResult {
    if (!sql || !sql.trim()) {
        return { valid: false, error: 'Empty SQL generated' };
    }

    const upperSql = sql.toUpperCase();

    // 1. Check for forbidden keywords
    // We look for whole words to avoid false positives (e.g. "update_date" column)
    for (const keyword of FORBIDDEN_KEYWORDS) {
        // Regex to match whole word boundaries
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(sql)) {
            // Exceptions: CREATE TEMP TABLE might be okay in some advanced flows, but blocking for now.
            // Check if it's inside a string literal? Too complex for regex, but basic check is safer.
            return { valid: false, error: `Generated SQL contains forbidden keyword: ${keyword}` };
        }
    }

    // 2. Must start with SELECT or WITH
    const cleanSql = sql.trim().toUpperCase();
    if (!cleanSql.startsWith('SELECT') && !cleanSql.startsWith('WITH')) {
        // Allow purely comment lines? Maybe. But safest is to strictly enforce DQL.
        return { valid: false, error: 'SQL must start with SELECT or WITH' };
    }

    return { valid: true };
}

/**
 * Basic sanitizer to remove markdown code blocks if the LLM adds them
 * despite instructions.
 */
export function sanitizeSqlOutput(text: string): string {
    // Remove ```sql ... ```
    let cleaned = text.replace(/```sql/gi, '').replace(/```/g, '');

    // Remove "Here is the SQL:" prefixes if present (simple heuristic)
    cleaned = cleaned.replace(/^Here is the SQL:?/i, '');

    return cleaned.trim();
}
