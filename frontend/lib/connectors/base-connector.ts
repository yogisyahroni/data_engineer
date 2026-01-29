/**
 * Base Connector Interface (Adapter Pattern)
 * 
 * This is the foundation for supporting 100+ data sources.
 * Each connector implements this interface and provides source-specific logic.
 */

export interface ConnectionConfig {
    type: DataSourceType;
    name: string;
    // Common config
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean;

    // Cloud-specific
    warehouse?: string; // Snowflake
    project?: string; // BigQuery
    cluster?: string; // Redshift/Databricks

    // File-based
    filePath?: string;
    fileUrl?: string;

    // API-based
    apiKey?: string;
    apiUrl?: string;
    authToken?: string;

    // Extended config (JSON)
    extraConfig?: Record<string, any>;
}

export type DataSourceType =
    // SQL Databases
    | 'postgres' | 'mysql' | 'sqlite' | 'mssql' | 'oracle'
    // Cloud Data Warehouses
    | 'snowflake' | 'bigquery' | 'redshift' | 'databricks'
    // NoSQL
    | 'mongodb' | 'dynamodb' | 'cassandra'
    // Files
    | 'csv' | 'excel' | 'json' | 'parquet'
    // APIs
    | 'rest' | 'graphql' | 'salesforce' | 'hubspot' | 'stripe';

export interface SchemaInfo {
    tables: TableInfo[];
}

export interface TableInfo {
    name: string;
    schema?: string;
    rowCount?: number;
    columns: ColumnInfo[];
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    isPrimary: boolean;
    isForeign: boolean;
    description?: string;
}

export interface QueryResult {
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
    executionTime: number;
}

/**
 * Base Connector Interface
 * All connectors MUST implement these methods
 */
export abstract class BaseConnector {
    protected config: ConnectionConfig;

    constructor(config: ConnectionConfig) {
        this.config = config;
    }

    /**
     * Test if connection is valid
     */
    abstract testConnection(): Promise<{ success: boolean; error?: string }>;

    /**
     * Fetch schema information (tables, columns)
     */
    abstract fetchSchema(): Promise<SchemaInfo>;

    /**
     * Execute a raw query
     */
    abstract executeQuery(sql: string): Promise<QueryResult>;

    /**
     * Close connection (cleanup)
     */
    abstract disconnect(): Promise<void>;

    /**
     * Extract data for ETL pipelines
     * Yields batches of rows [row1, row2, ..., rowN]
     */
    async *extractData(config: any): AsyncGenerator<any[], void, unknown> {
        // Default implementation (can be overridden)
        // If not implemented, one-shot fetch via executeQuery might be used
        yield [];
    }

    /**
     * Get connector display name
     */
    getDisplayName(): string {
        return this.config.name || this.config.type;
    }

    /**
     * Validate configuration
     */
    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.type) {
            errors.push('Data source type is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
