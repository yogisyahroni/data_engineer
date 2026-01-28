/**
 * SQL Formatting Utility
 * Prettifies SQL queries for better readability
 */

// Keywords that should be uppercase
const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON',
    'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'ASC', 'DESC',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE',
    'TABLE', 'INDEX', 'VIEW', 'ALTER', 'DROP', 'TRUNCATE', 'AS',
    'DISTINCT', 'ALL', 'UNION', 'INTERSECT', 'EXCEPT', 'CASE', 'WHEN',
    'THEN', 'ELSE', 'END', 'CAST', 'CONVERT', 'COALESCE', 'NULLIF',
    'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE', 'COUNT', 'SUM', 'AVG', 'MIN',
    'MAX', 'WITH', 'OVER', 'PARTITION', 'ROW_NUMBER', 'RANK', 'DENSE_RANK',
    'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NOW', 'CURRENT_TIMESTAMP',
    'DATE_TRUNC', 'EXTRACT', 'INTERVAL', 'TRUE', 'FALSE', 'RETURNING'
];

// Keywords that start a new line
const NEWLINE_BEFORE = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'INNER JOIN', 'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'GROUP BY',
    'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER',
    'DROP', 'WITH', 'RETURNING'
];

/**
 * Format SQL query with proper indentation and casing
 */
export function formatSQL(sql: string): string {
    if (!sql || !sql.trim()) return sql;

    let formatted = sql.trim();

    // Normalize whitespace
    formatted = formatted.replace(/\s+/g, ' ');

    // Uppercase keywords
    SQL_KEYWORDS.forEach((keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        formatted = formatted.replace(regex, keyword);
    });

    // Add newlines before major clauses
    NEWLINE_BEFORE.forEach((keyword) => {
        const regex = new RegExp(`\\s+(${keyword})\\s+`, 'gi');
        formatted = formatted.replace(regex, `\n${keyword} `);
    });

    // Handle SELECT columns - add newlines after commas in SELECT
    formatted = formatted.replace(
        /SELECT\s+(.+?)\s+FROM/gi,
        (match, columns) => {
            const formattedColumns = columns
                .split(',')
                .map((col: string) => '  ' + col.trim())
                .join(',\n');
            return `SELECT\n${formattedColumns}\nFROM`;
        }
    );

    // Indent AND/OR in WHERE clause
    formatted = formatted.replace(/\n(AND|OR)\s+/gi, '\n  $1 ');

    // Add newline after opening parenthesis for subqueries
    formatted = formatted.replace(/\(\s*SELECT/gi, '(\n  SELECT');

    // Clean up multiple newlines
    formatted = formatted.replace(/\n\s*\n/g, '\n');

    // Trim each line
    formatted = formatted
        .split('\n')
        .map((line) => line.trim())
        .join('\n');

    return formatted;
}

/**
 * Minify SQL query (remove extra whitespace)
 */
export function minifySQL(sql: string): string {
    if (!sql) return sql;
    return sql.replace(/\s+/g, ' ').trim();
}

/**
 * Extract table names from SQL query
 */
export function extractTableNames(sql: string): string[] {
    const tables: string[] = [];

    // Match FROM table
    const fromMatch = sql.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (fromMatch) {
        fromMatch.forEach((m) => {
            const table = m.replace(/FROM\s+/i, '');
            if (!tables.includes(table)) tables.push(table);
        });
    }

    // Match JOIN table
    const joinMatch = sql.match(/JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (joinMatch) {
        joinMatch.forEach((m) => {
            const table = m.replace(/JOIN\s+/i, '');
            if (!tables.includes(table)) tables.push(table);
        });
    }

    return tables;
}

/**
 * Validate SQL syntax (basic validation)
 */
export function validateSQL(sql: string): { valid: boolean; error?: string } {
    if (!sql || !sql.trim()) {
        return { valid: false, error: 'Query cannot be empty' };
    }

    const trimmed = sql.trim().toUpperCase();

    // Check for dangerous operations (for UI warning)
    if (trimmed.startsWith('DROP ') || trimmed.startsWith('TRUNCATE ')) {
        return { valid: true, error: 'Warning: This is a destructive operation' };
    }

    // Basic structure checks
    if (trimmed.startsWith('SELECT')) {
        if (!trimmed.includes('FROM') && !trimmed.includes('(')) {
            // Allow SELECT without FROM for expressions like SELECT 1+1
            if (!/SELECT\s+\d/.test(trimmed) && !trimmed.includes('NOW()')) {
                return { valid: false, error: 'SELECT statement requires FROM clause' };
            }
        }
    }

    // Check for unbalanced parentheses
    const openCount = (sql.match(/\(/g) || []).length;
    const closeCount = (sql.match(/\)/g) || []).length;
    if (openCount !== closeCount) {
        return { valid: false, error: 'Unbalanced parentheses' };
    }

    // Check for unclosed quotes
    const singleQuotes = (sql.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
        return { valid: false, error: 'Unclosed string literal' };
    }

    return { valid: true };
}

/**
 * Get SQL query type
 */
export function getQueryType(sql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'OTHER' {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('CREATE') || trimmed.startsWith('ALTER') || trimmed.startsWith('DROP')) return 'DDL';

    return 'OTHER';
}

/**
 * Replace query parameters/variables with values
 * Supports {{variable}} and :variable syntax
 */
export function replaceQueryVariables(
    sql: string,
    variables: Record<string, string | number | boolean | null>
): string {
    let result = sql;

    // Replace {{variable}} syntax
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        if (varName in variables) {
            const value = variables[varName];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
            return String(value);
        }
        return match;
    });

    // Replace :variable syntax
    result = result.replace(/:(\w+)/g, (match, varName) => {
        if (varName in variables) {
            const value = variables[varName];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
            return String(value);
        }
        return match;
    });

    return result;
}

/**
 * Extract variable names from SQL query
 */
export function extractQueryVariables(sql: string): string[] {
    const variables: string[] = [];

    // Match {{variable}} syntax
    const doubleBrace = sql.match(/\{\{(\w+)\}\}/g);
    if (doubleBrace) {
        doubleBrace.forEach((m) => {
            const varName = m.replace(/\{\{|\}\}/g, '');
            if (!variables.includes(varName)) variables.push(varName);
        });
    }

    // Match :variable syntax (but not ::type casts)
    const colonVar = sql.match(/(?<!:):(\w+)/g);
    if (colonVar) {
        colonVar.forEach((m) => {
            const varName = m.replace(':', '');
            if (!variables.includes(varName)) variables.push(varName);
        });
    }

    return variables;
}

/**
 * Wraps an existing SQL query with a generic WHERE clause
 * Uses the wrapper pattern: SELECT * FROM (original_query) AS _base WHERE ...
 */
export function applyFiltersToSql(
    sql: string,
    filters: Record<string, any>
): string {
    if (!sql || !filters || Object.keys(filters).length === 0) {
        return sql;
    }

    // 1. Remove trailing semicolon
    const cleanSql = sql.trim().replace(/;$/, '');

    // 2. Build WHERE conditions
    const conditions: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
        if (value === null || value === undefined) return;

        // Sanitization: Only allow alphanumeric and underscores for column names
        // This prevents SQL injection via column names
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_.]/g, '');
        if (!sanitizedKey) return;

        if (typeof value === 'string') {
            // Escape single quotes in value
            const safeValue = value.replace(/'/g, "''");
            conditions.push(`${sanitizedKey} = '${safeValue}'`);
        } else if (typeof value === 'number') {
            conditions.push(`${sanitizedKey} = ${value}`);
        } else if (typeof value === 'boolean') {
            conditions.push(`${sanitizedKey} = ${value ? 'TRUE' : 'FALSE'}`);
        }
        // TODO: Handle arrays like IN ('a', 'b') if needed
    });

    if (conditions.length === 0) return sql;

    const whereClause = conditions.join(' AND ');

    // 3. Wrap
    return `SELECT * FROM (\n${cleanSql}\n) AS _filtered_view WHERE ${whereClause}`;
}
