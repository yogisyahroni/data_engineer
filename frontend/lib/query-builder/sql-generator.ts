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
     */
    static generate(state: QueryBuilderState): string {
        const { table, columns, filters, sorts, limit } = state;

        if (!table) {
            throw new Error('No table selected');
        }

        if (columns.length === 0) {
            throw new Error('No columns selected');
        }

        const parts: string[] = [];

        // SELECT clause
        parts.push(this.buildSelectClause(columns));

        // FROM clause
        parts.push(`FROM ${this.escapeIdentifier(table)}`);

        // WHERE clause
        if (filters.conditions.length > 0) {
            parts.push(`WHERE ${this.buildFilterClause(filters)}`);
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
            parts.push(this.buildOrderByClause(sorts));
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
    private static buildSelectClause(columns: ColumnSelection[]): string {
        const fields = columns.map((col) => {
            const escapedColumn = this.escapeIdentifier(col.column);

            if (col.aggregation) {
                const aggregated = `${col.aggregation}(${escapedColumn})`;
                return col.alias
                    ? `${aggregated} AS ${this.escapeIdentifier(col.alias)}`
                    : aggregated;
            }

            return col.alias
                ? `${escapedColumn} AS ${this.escapeIdentifier(col.alias)}`
                : escapedColumn;
        });

        return `SELECT ${fields.join(', ')}`;
    }

    /**
     * Build WHERE clause from filter group
     */
    private static buildFilterClause(group: FilterGroup): string {
        if (group.conditions.length === 0) {
            return '1=1'; // Empty group
        }

        const clauses = group.conditions.map((condition) => {
            if (isFilterGroup(condition)) {
                // Nested group - wrap in parentheses
                return `(${this.buildFilterClause(condition)})`;
            }

            if (isFilterCondition(condition)) {
                return this.buildCondition(condition);
            }

            return '1=1';
        });

        return clauses.join(` ${group.operator} `);
    }

    /**
     * Build a single filter condition
     */
    private static buildCondition(condition: FilterCondition): string {
        const { column, operator, value } = condition;
        const escapedColumn = this.escapeIdentifier(column);

        switch (operator) {
            case 'IS NULL':
                return `${escapedColumn} IS NULL`;

            case 'IS NOT NULL':
                return `${escapedColumn} IS NOT NULL`;

            case 'IN':
            case 'NOT IN': {
                const values = Array.isArray(value) ? value : [value];
                const escapedValues = values
                    .map((v) => this.escapeLiteral(String(v)))
                    .join(', ');
                return `${escapedColumn} ${operator} (${escapedValues})`;
            }

            case 'LIKE': {
                const escapedValue = this.escapeLiteral(`%${value}%`);
                return `${escapedColumn} LIKE ${escapedValue}`;
            }

            case 'BETWEEN': {
                if (!Array.isArray(value) || value.length !== 2) {
                    throw new Error('BETWEEN operator requires array of 2 values');
                }
                const [start, end] = value.map((v) => this.escapeLiteral(String(v)));
                return `${escapedColumn} BETWEEN ${start} AND ${end}`;
            }

            default: {
                // Standard comparison: =, !=, >, <, >=, <=
                const escapedValue = this.escapeLiteral(String(value));
                return `${escapedColumn} ${operator} ${escapedValue}`;
            }
        }
    }

    /**
     * Build ORDER BY clause
     */
    private static buildOrderByClause(sorts: SortRule[]): string {
        const sortClauses = sorts.map(
            (sort) =>
                `${this.escapeIdentifier(sort.column)} ${sort.direction}`
        );
        return `ORDER BY ${sortClauses.join(', ')}`;
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
