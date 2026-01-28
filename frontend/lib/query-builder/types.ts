/**
 * Query Builder Type Definitions
 * 
 * Defines the complete state shape for the visual query builder
 */

export type AggregationFunction =
    | 'SUM'
    | 'AVG'
    | 'COUNT'
    | 'MIN'
    | 'MAX'
    | 'COUNT_DISTINCT';

export type ComparisonOperator =
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'LIKE'
    | 'IN'
    | 'NOT IN'
    | 'IS NULL'
    | 'IS NOT NULL'
    | 'BETWEEN';

export type LogicalOperator = 'AND' | 'OR';

export type SortDirection = 'ASC' | 'DESC';

/**
 * Represents a selected column in the query
 */
export interface ColumnSelection {
    table: string;
    column: string;
    alias?: string;
    aggregation?: AggregationFunction;
}

/**
 * Represents a single filter condition
 */
export interface FilterCondition {
    id: string; // For React keys
    column: string;
    operator: ComparisonOperator;
    value: string | number | string[] | null;
}

/**
 * Represents a group of filters with logical operator
 * Supports nesting for complex AND/OR logic
 */
export interface FilterGroup {
    id: string; // For React keys
    operator: LogicalOperator;
    conditions: (FilterCondition | FilterGroup)[];
}

/**
 * Represents a sort rule
 */
export interface SortRule {
    id: string; // For React keys
    column: string;
    direction: SortDirection;
}

/**
 * Complete query builder state
 */
export interface QueryBuilderState {
    connectionId: string;
    table: string | null;
    columns: ColumnSelection[];
    filters: FilterGroup;
    sorts: SortRule[];
    limit: number;
}

/**
 * Schema information for a table column
 */
export interface ColumnSchema {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'unknown';
    nullable: boolean;
}

/**
 * Schema information for a database table
 */
export interface TableSchema {
    name: string;
    schema?: string;
    columns: ColumnSchema[];
    rowCount?: number;
}

/**
 * Database schema (all tables)
 */
export interface DatabaseSchema {
    tables: TableSchema[];
}

/**
 * Query execution result
 */
export interface QueryResult {
    success: boolean;
    data?: any[];
    columns?: string[];
    rowCount?: number;
    executionTime?: number;
    error?: string;
}

/**
 * Helper to create initial empty state
 */
export function createInitialState(connectionId: string): QueryBuilderState {
    return {
        connectionId,
        table: null,
        columns: [],
        filters: {
            id: 'root',
            operator: 'AND',
            conditions: [],
        },
        sorts: [],
        limit: 100,
    };
}

/**
 * Helper to check if a condition is a group
 */
export function isFilterGroup(
    condition: FilterCondition | FilterGroup
): condition is FilterGroup {
    return 'conditions' in condition;
}

/**
 * Helper to check if a condition is a simple condition
 */
export function isFilterCondition(
    condition: FilterCondition | FilterGroup
): condition is FilterCondition {
    return 'column' in condition;
}
