import * as monaco from 'monaco-editor';
import { SQL_KEYWORDS, SQL_DATA_TYPES, SQL_FUNCTIONS } from './monaco-config';

/**
 * Schema information for autocomplete
 */
export interface TableSchema {
    name: string;
    schema?: string;
    columns: ColumnSchema[];
}

export interface ColumnSchema {
    name: string;
    type: string;
    nullable?: boolean;
    isPrimary?: boolean;
    isForeign?: boolean;
}

/**
 * Context-aware SQL autocomplete provider
 * Provides intelligent suggestions based on cursor position and SQL context
 */
export function createSQLCompletionProvider(
    schemas: TableSchema[]
): monaco.languages.CompletionItemProvider {
    return {
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range: monaco.IRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            // Get text before cursor
            const textBeforeCursor = model
                .getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                })
                .toUpperCase();

            const suggestions: monaco.languages.CompletionItem[] = [];

            // Determine context
            const context = determineContext(textBeforeCursor);

            // Add context-aware suggestions
            if (context.afterFROM || context.afterJOIN) {
                // Suggest tables after FROM or JOIN
                addTableSuggestions(suggestions, schemas, range);
            }

            if (context.afterSELECT || context.afterWHERE || context.afterON) {
                // Suggest columns and tables
                addColumnSuggestions(suggestions, schemas, range, context.currentTable);
                addTableSuggestions(suggestions, schemas, range);
            }

            if (context.afterGROUP || context.afterORDER) {
                // Suggest columns
                addColumnSuggestions(suggestions, schemas, range, context.currentTable);
            }

            // Always add keywords
            addKeywordSuggestions(suggestions, range);

            // Always add data types (useful for CREATE TABLE, CAST, etc.)
            addDataTypeSuggestions(suggestions, range);

            // Add function suggestions
            addFunctionSuggestions(suggestions, range, context);

            return { suggestions };
        },
    };
}

/**
 * Determine SQL context from text before cursor
 */
function determineContext(text: string) {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'GROUP BY', 'ORDER BY'];
    const lastKeywordPos = keywords.map((kw) => ({ kw, pos: text.lastIndexOf(kw) }));
    const lastKeyword = lastKeywordPos.reduce((max, curr) => (curr.pos > max.pos ? curr : max));

    // Try to extract current table name
    const fromMatch = text.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    const currentTable = fromMatch ? fromMatch[1] : null;

    return {
        afterSELECT: lastKeyword.kw === 'SELECT',
        afterFROM: lastKeyword.kw === 'FROM',
        afterWHERE: lastKeyword.kw === 'WHERE',
        afterJOIN: lastKeyword.kw === 'JOIN',
        afterON: lastKeyword.kw === 'ON',
        afterGROUP: lastKeyword.kw === 'GROUP BY',
        afterORDER: lastKeyword.kw === 'ORDER BY',
        currentTable,
    };
}

/**
 * Add table name suggestions
 */
function addTableSuggestions(
    suggestions: monaco.languages.CompletionItem[],
    schemas: TableSchema[],
    range: monaco.IRange
) {
    schemas.forEach((table) => {
        suggestions.push({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.name,
            range,
            detail: 'Table',
            documentation: table.schema
                ? `Schema: ${table.schema}\nColumns: ${table.columns.length}`
                : `Columns: ${table.columns.length}`,
            sortText: `0_${table.name}`, // Prioritize tables
        });
    });
}

/**
 * Add column name suggestions
 */
function addColumnSuggestions(
    suggestions: monaco.languages.CompletionItem[],
    schemas: TableSchema[],
    range: monaco.IRange,
    currentTable: string | null
) {
    schemas.forEach((table) => {
        table.columns.forEach((col) => {
            // Unqualified column
            suggestions.push({
                label: col.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                range,
                detail: `${table.name}.${col.name}`,
                documentation: `Type: ${col.type}${col.nullable ? ' (nullable)' : ''}${col.isPrimary ? ' [PK]' : ''
                    }${col.isForeign ? ' [FK]' : ''}`,
                sortText:
                    currentTable === table.name
                        ? `1_${col.name}` // Prioritize current table columns
                        : `2_${col.name}`,
            });

            // Qualified column (table.column)
            suggestions.push({
                label: `${table.name}.${col.name}`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: `${table.name}.${col.name}`,
                range,
                detail: `${col.type}`,
                documentation: `Qualified column: ${table.name}.${col.name}${col.nullable ? ' (nullable)' : ''
                    }`,
                sortText: `3_${table.name}_${col.name}`,
            });
        });
    });
}

/**
 * Add SQL keyword suggestions
 */
function addKeywordSuggestions(
    suggestions: monaco.languages.CompletionItem[],
    range: monaco.IRange
) {
    SQL_KEYWORDS.forEach((keyword) => {
        suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
            detail: 'Keyword',
            sortText: `4_${keyword}`,
        });
    });
}

/**
 * Add data type suggestions
 */
function addDataTypeSuggestions(
    suggestions: monaco.languages.CompletionItem[],
    range: monaco.IRange
) {
    SQL_DATA_TYPES.forEach((type) => {
        suggestions.push({
            label: type,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: type,
            range,
            detail: 'Data Type',
            sortText: `5_${type}`,
        });
    });
}

/**
 * Add function suggestions with snippets
 */
function addFunctionSuggestions(
    suggestions: monaco.languages.CompletionItem[],
    range: monaco.IRange,
    context: ReturnType<typeof determineContext>
) {
    // Aggregate functions (prioritize after SELECT)
    if (context.afterSELECT) {
        SQL_FUNCTIONS.aggregate.forEach((func) => {
            suggestions.push({
                label: func,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${func}($1)`,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
                detail: 'Aggregate Function',
                documentation: getFunctionDocumentation(func),
                sortText: `6_${func}`,
            });
        });
    }

    // String functions
    SQL_FUNCTIONS.string.forEach((func) => {
        suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}($1)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'String Function',
            documentation: getFunctionDocumentation(func),
            sortText: `7_${func}`,
        });
    });

    // Date/Time functions
    SQL_FUNCTIONS.datetime.forEach((func) => {
        suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func === 'NOW' || func.startsWith('CURRENT_') ? func : `${func}($1)`,
            insertTextRules:
                func === 'NOW' || func.startsWith('CURRENT_')
                    ? undefined
                    : monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'Date/Time Function',
            documentation: getFunctionDocumentation(func),
            sortText: `8_${func}`,
        });
    });

    // Math functions
    SQL_FUNCTIONS.math.forEach((func) => {
        suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}($1)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'Math Function',
            documentation: getFunctionDocumentation(func),
            sortText: `9_${func}`,
        });
    });

    // Window functions
    SQL_FUNCTIONS.window.forEach((func) => {
        suggestions.push({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}() OVER ($1)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            detail: 'Window Function',
            documentation: getFunctionDocumentation(func),
            sortText: `10_${func}`,
        });
    });
}

/**
 * Get function documentation (simplified)
 */
function getFunctionDocumentation(func: string): string {
    const docs: Record<string, string> = {
        COUNT: 'Returns the number of rows',
        SUM: 'Returns the sum of values',
        AVG: 'Returns the average of values',
        MIN: 'Returns the minimum value',
        MAX: 'Returns the maximum value',
        CONCAT: 'Concatenates strings',
        UPPER: 'Converts string to uppercase',
        LOWER: 'Converts string to lowercase',
        NOW: 'Returns current timestamp',
        EXTRACT: 'Extracts part of date/time',
        CAST: 'Converts value to specified type',
        COALESCE: 'Returns first non-null value',
        ROW_NUMBER: 'Assigns unique row number within partition',
        RANK: 'Assigns rank with gaps',
        DENSE_RANK: 'Assigns rank without gaps',
    };

    return docs[func] || `SQL function: ${func}`;
}
