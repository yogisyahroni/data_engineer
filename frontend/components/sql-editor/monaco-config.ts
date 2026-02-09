import * as monaco from 'monaco-editor';

/**
 * Monaco SQL Language Configuration
 * Enhanced syntax highlighting for multiple SQL dialects
 */

// Comprehensive SQL Keywords
export const SQL_KEYWORDS = [
    // DML
    'SELECT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'MERGE',
    'UPSERT',
    // DDL
    'CREATE',
    'ALTER',
    'DROP',
    'TRUNCATE',
    'RENAME',
    // Table/View/Index
    'TABLE',
    'VIEW',
    'INDEX',
    'SCHEMA',
    'DATABASE',
    'SEQUENCE',
    'TRIGGER',
    'PROCEDURE',
    'FUNCTION',
    // Constraints
    'PRIMARY',
    'FOREIGN',
    'KEY',
    'UNIQUE',
    'CHECK',
    'DEFAULT',
    'NOT',
    'NULL',
    // Clauses
    'FROM',
    'WHERE',
    'GROUP',
    'HAVING',
    'ORDER',
    'BY',
    'LIMIT',
    'OFFSET',
    'FETCH',
    'FIRST',
    'NEXT',
    'ROWS',
    'ONLY',
    // Joins
    'JOIN',
    'INNER',
    'LEFT',
    'RIGHT',
    'FULL',
    'OUTER',
    'CROSS',
    'ON',
    'USING',
    // Set Operations
    'UNION',
    'INTERSECT',
    'EXCEPT',
    'ALL',
    'DISTINCT',
    // Operators
    'AND',
    'OR',
    'IN',
    'BETWEEN',
    'LIKE',
    'IS',
    'EXISTS',
    'ANY',
    'SOME',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    // Window Functions
    'OVER',
    'PARTITION',
    'RANGE',
    'ROWS',
    'UNBOUNDED',
    'PRECEDING',
    'FOLLOWING',
    'CURRENT',
    'ROW',
    // CTEs
    'WITH',
    'RECURSIVE',
    'AS',
    // Transaction
    'BEGIN',
    'COMMIT',
    'ROLLBACK',
    'SAVEPOINT',
    'TRANSACTION',
    // Access Control
    'GRANT',
    'REVOKE',
    'PRIVILEGES',
    'TO',
    'FROM',
    // Other
    'INTO',
    'VALUES',
    'SET',
    'CASCADE',
    'RESTRICT',
    'RETURNING',
];

// SQL Data Types
export const SQL_DATA_TYPES = [
    // Numeric
    'INTEGER',
    'INT',
    'SMALLINT',
    'BIGINT',
    'DECIMAL',
    'NUMERIC',
    'REAL',
    'DOUBLE',
    'PRECISION',
    'FLOAT',
    'SERIAL',
    'BIGSERIAL',
    // String
    'CHAR',
    'VARCHAR',
    'TEXT',
    'NCHAR',
    'NVARCHAR',
    'CLOB',
    // Date/Time
    'DATE',
    'TIME',
    'TIMESTAMP',
    'TIMESTAMPTZ',
    'INTERVAL',
    'YEAR',
    'MONTH',
    'DAY',
    // Boolean
    'BOOLEAN',
    'BOOL',
    // Binary
    'BLOB',
    'BYTEA',
    'BINARY',
    'VARBINARY',
    // JSON
    'JSON',
    'JSONB',
    // UUID
    'UUID',
    // Array
    'ARRAY',
    // Other
    'ENUM',
    'XML',
];

// SQL Built-in Functions
export const SQL_FUNCTIONS = {
    // Aggregate Functions
    aggregate: [
        'COUNT',
        'SUM',
        'AVG',
        'MIN',
        'MAX',
        'STDDEV',
        'VARIANCE',
        'ARRAY_AGG',
        'STRING_AGG',
        'JSON_AGG',
        'PERCENTILE_CONT',
        'PERCENTILE_DISC',
    ],
    // String Functions
    string: [
        'CONCAT',
        'SUBSTRING',
        'SUBSTR',
        'LENGTH',
        'UPPER',
        'LOWER',
        'TRIM',
        'LTRIM',
        'RTRIM',
        'REPLACE',
        'POSITION',
        'STRPOS',
        'LEFT',
        'RIGHT',
        'SPLIT_PART',
        'REGEXP_REPLACE',
        'REGEXP_MATCHES',
    ],
    // Date/Time Functions
    datetime: [
        'NOW',
        'CURRENT_DATE',
        'CURRENT_TIME',
        'CURRENT_TIMESTAMP',
        'EXTRACT',
        'DATE_PART',
        'DATE_TRUNC',
        'AGE',
        'TO_CHAR',
        'TO_DATE',
        'TO_TIMESTAMP',
        'INTERVAL',
    ],
    // Math Functions
    math: [
        'ABS',
        'CEIL',
        'CEILING',
        'FLOOR',
        'ROUND',
        'TRUNC',
        'MOD',
        'POWER',
        'SQRT',
        'EXP',
        'LN',
        'LOG',
        'RANDOM',
    ],
    // Conditional Functions
    conditional: ['COALESCE', 'NULLIF', 'GREATEST', 'LEAST'],
    // Type Conversion
    conversion: ['CAST', 'CONVERT', 'TRY_CAST'],
    // Window Functions
    window: ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE'],
};

// Flatten all functions
export const ALL_SQL_FUNCTIONS = Object.values(SQL_FUNCTIONS).flat();

/**
 * Register enhanced SQL language configuration for Monaco Editor
 */
export function registerSQLLanguage(monacoInstance: typeof monaco) {
    // Language configuration (brackets, comments, etc.)
    monacoInstance.languages.setLanguageConfiguration('sql', {
        comments: {
            lineComment: '--',
            blockComment: ['/*', '*/'],
        },
        brackets: [
            ['(', ')'],
            ['[', ']'],
        ],
        autoClosingPairs: [
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: "'", close: "'", notIn: ['string'] },
            { open: '"', close: '"', notIn: ['string'] },
        ],
        surroundingPairs: [
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: "'", close: "'" },
            { open: '"', close: '"' },
        ],
    });

    // Monarch tokenizer for syntax highlighting
    monacoInstance.languages.setMonarchTokensProvider('sql', {
        defaultToken: '',
        tokenPostfix: '.sql',
        ignoreCase: true,

        keywords: SQL_KEYWORDS,
        dataTypes: SQL_DATA_TYPES,
        functions: ALL_SQL_FUNCTIONS,

        operators: [
            '=',
            '>',
            '<',
            '!',
            '~',
            '?',
            ':',
            '==',
            '<=',
            '>=',
            '!=',
            '<>',
            '&&',
            '||',
            '++',
            '--',
            '+',
            '-',
            '*',
            '/',
            '%',
            '<<',
            '>>',
            '&',
            '|',
            '^',
        ],

        brackets: [
            { open: '(', close: ')', token: 'delimiter.parenthesis' },
            { open: '[', close: ']', token: 'delimiter.square' },
        ],

        tokenizer: {
            root: [
                // Comments
                [/--.*$/, 'comment'],
                [/\/\*/, 'comment', '@comment'],

                // Strings
                [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-terminated string
                [/'/, 'string', '@string_single'],
                [/"/, 'string', '@string_double'],

                // Numbers
                [/\d+\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                [/\d+/, 'number'],

                // Keywords
                [
                    /[a-zA-Z_][\w]*/,
                    {
                        cases: {
                            '@keywords': 'keyword',
                            '@dataTypes': 'type',
                            '@functions': 'predefined',
                            '@default': 'identifier',
                        },
                    },
                ],

                // Delimiters and operators
                [/[;,.]/, 'delimiter'],
                [/[()]/, '@brackets'],
                [
                    /[<>=!~?:&|+\-*/^%]+/,
                    {
                        cases: {
                            '@operators': 'operator',
                            '@default': '',
                        },
                    },
                ],
            ],

            comment: [
                [/[^\/*]+/, 'comment'],
                [/\*\//, 'comment', '@pop'],
                [/[\/*]/, 'comment'],
            ],

            string_single: [
                [/[^\\']+/, 'string'],
                [/\\./, 'string.escape'],
                [/'/, 'string', '@pop'],
            ],

            string_double: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, 'string', '@pop'],
            ],
        },
    });
}

/**
 * Custom theme for SQL highlighting
 */
export function defineSQLTheme(monacoInstance: typeof monaco, isDark: boolean) {
    const themeName = isDark ? 'sql-dark' : 'sql-light';

    monacoInstance.editor.defineTheme(themeName, {
        base: isDark ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: isDark ? 'C586C0' : '8F08C4', fontStyle: 'bold' },
            { token: 'type', foreground: isDark ? '4EC9B0' : '267F99', fontStyle: 'bold' },
            { token: 'predefined', foreground: isDark ? 'DCDCAA' : '795E26' },
            { token: 'string', foreground: isDark ? 'CE9178' : 'A31515' },
            { token: 'number', foreground: isDark ? 'B5CEA8' : '098658' },
            { token: 'comment', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },
            { token: 'operator', foreground: isDark ? 'D4D4D4' : '000000' },
        ],
        colors: {},
    });

    return themeName;
}
