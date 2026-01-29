import {
    QueryBuilderState,
    ColumnSelection,
    FilterGroup,
    FilterCondition,
    isFilterGroup,
    isFilterCondition,
    SortRule,
} from './types';

/**
 * SQL Generator - Converts QueryBuilderState to executable SQL
 */
export class SQLGenerator {
    /**
     * Generate SQL from query builder state
     * @param state The query builder state
     * @param virtualColumns Optional map of virtual column names to their SQL expressions
     */
    static generate(state: QueryBuilderState, virtualColumns?: Record<string, string>): string {
        const { table, columns, filters, sorts, limit } = state;

        if (!table) {
            throw new Error('No table selected');
        }

        if (columns.length === 0) {
            throw new Error('No columns selected');
        }

        const parts: string[] = [];

        // SELECT clause
        parts.push(this.buildSelectClause(columns, virtualColumns));

        // FROM clause
        parts.push(`FROM ${this.escapeIdentifier(table)}`);

        // WHERE clause
        // WHERE clause
        if (filters.conditions.length > 0) {
            parts.push(`WHERE ${this.buildFilterClause(filters, virtualColumns)}`);
        }

        // GROUP BY clause (if any aggregations)
        const hasAggregations = columns.some((c) => c.aggregation);
        if (hasAggregations) {
            const groupByColumns = columns
                .filter((c) => !c.aggregation)
                .map((c) => this.escapeIdentifier(c.column));

            if (groupByColumns.length > 0) {
                parts.push(`GROUP BY ${groupByColumns.join(', ')}`);
            }
        }

        // ORDER BY clause
        if (sorts.length > 0) {
            // ORDER BY clause
            if (sorts.length > 0) {
                parts.push(this.buildOrderByClause(sorts, virtualColumns));
            }
        }

        // LIMIT clause
        if (limit > 0) {
            parts.push(`LIMIT ${limit}`);
        }

        return parts.join('\n');
    }

    /**
     * Build SELECT clause
     */
    private static buildSelectClause(columns: ColumnSelection[], virtualColumns?: Record<string, string>): string {
        const fields = columns.map((col) => {
            // Check if column is virtual
            const resolvedColumn = this.resolveColumn(col.column, virtualColumns);

            if (col.aggregation) {
                const aggregated = `${col.aggregation}(${resolvedColumn})`;
                return col.alias
                    ? `${aggregated} AS ${this.escapeIdentifier(col.alias)}`
                    : aggregated;
            }

            return col.alias
                ? `${resolvedColumn} AS ${this.escapeIdentifier(col.alias)}`
                : resolvedColumn;
        });

        return `SELECT ${fields.join(', ')}`;
    }

    /**
     * Build WHERE clause from filter group
     */
    private static buildFilterClause(group: FilterGroup, virtualColumns?: Record<string, string>): string {
        if (group.conditions.length === 0) {
            return '1=1'; // Empty group
        }

        const clauses = group.conditions.map((condition) => {
            if (isFilterGroup(condition)) {
                // Nested group - wrap in parentheses
                return `(${this.buildFilterClause(condition, virtualColumns)})`;
            }

            if (isFilterCondition(condition)) {
                return this.buildCondition(condition, virtualColumns);
            }

            return '1=1';
        });

        return clauses.join(` ${group.operator} `);
    }

    /**
     * Build a single filter condition
     */
    private static buildCondition(condition: FilterCondition, virtualColumns?: Record<string, string>): string {
        const { column, operator, value } = condition;
        const resolvedColumn = this.resolveColumn(column, virtualColumns);

        switch (operator) {
            case 'IS NULL':
                return `${resolvedColumn} IS NULL`;

            case 'IS NOT NULL':
                return `${resolvedColumn} IS NOT NULL`;

            case 'IN':
            case 'NOT IN': {
                const values = Array.isArray(value) ? value : [value];
                const escapedValues = values
                    .map((v) => this.escapeLiteral(String(v)))
                    .join(', ');
                return `${resolvedColumn} ${operator} (${escapedValues})`;
            }

            case 'LIKE': {
                const escapedValue = this.escapeLiteral(`%${value}%`);
                return `${resolvedColumn} LIKE ${escapedValue}`;
            }

            case 'BETWEEN': {
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('BETWEEN operator requires array of 2 values');
                }
                const [start, end] = value.map((v) => this.escapeLiteral(String(v)));
                return `${resolvedColumn} BETWEEN ${start} AND ${end}`;
            }

            default: {
                // Standard comparison: =, !=, >, <, >=, <=
                const escapedValue = this.escapeLiteral(String(value));
                return `${resolvedColumn} ${operator} ${escapedValue}`;
            }
        }
    }

    /**
     * Build ORDER BY clause
     */
    private static buildOrderByClause(sorts: SortRule[], virtualColumns?: Record<string, string>): string {
        const sortClauses = sorts.map(
            (sort) =>
                `${this.resolveColumn(sort.column, virtualColumns)} ${sort.direction}`
        );
        return `ORDER BY ${sortClauses.join(', ')}`;
    }

    /**
     * Resolve a column to its SQL expression (if virtual) or escaped identifier
     */
    /**
     * Resolve a column to its SQL expression (if virtual) or escaped identifier
     * Supports recursive expansion of dependencies (e.g. ${Metric})
     */
    private static resolveColumn(column: string, virtualColumns?: Record<string, string>, depth = 0): string {
        const MAX_DEPTH = 10;
        if (depth > MAX_DEPTH) {
            throw new Error(`Circular dependency or max depth exceeded resolving column: ${column}`);
        }

        // 1. If column is a known virtual metric, get its raw expression
        if (virtualColumns && virtualColumns[column]) {
            const rawExpression = virtualColumns[column];

            // 2. Recursively expand any ${Variable} placeholders in the expression
            // Regex matches ${SomeName}
            const expanded = rawExpression.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
                // Recursive call with incremented depth (treating the variable as a column)
                // We don't wrap in quotes here because resolveColumn returns an escaped/valid SQL fragment
                return this.resolveColumn(variableName, virtualColumns, depth + 1);
            });

            return `(${expanded})`;
        }

        // 3. If not virtual, treat as physical column
        return this.escapeIdentifier(column);
    }

    /**
     * Escape SQL identifier (table/column name)
     */
    private static escapeIdentifier(identifier: string): string {
        // Remove any existing quotes and re-quote
        const clean = identifier.replace(/"/g, '');
        return `"${clean}"`;
    }

    /**
     * Escape SQL literal value
     */
    private static escapeLiteral(value: string): string {
        // Escape single quotes by doubling them
        const escaped = value.replace(/'/g, "''");
        return `'${escaped}'`;
    }

    /**
     * Format generated SQL for readability
     */
    static format(sql: string): string {
        return sql
            .split('\n')
            .map((line) => line.trim())
            .join('\n');
    }

    /**
     * Validate generated SQL for security
     * Ensures no destructive operations
     */
    static validate(sql: string): { valid: boolean; error?: string } {
        const forbidden = [
            /\bDROP\b/i,
            /\bDELETE\b/i,
            /\bUPDATE\b/i,
            /\bINSERT\b/i,
            /\bALTER\b/i,
            /\bTRUNCATE\b/i,
            /\bGRANT\b/i,
            /\bREVOKE\b/i,
        ];

        for (const pattern of forbidden) {
            if (pattern.test(sql)) {
                return {
                    valid: false,
                    error: `Forbidden SQL keyword detected: ${pattern.source}`,
                };
            }
        }

        // Must start with SELECT
        if (!/^\s*SELECT\b/i.test(sql)) {
            return {
                valid: false,
                error: 'Query must start with SELECT',
            };
        }

        return { valid: true };
    }
}
