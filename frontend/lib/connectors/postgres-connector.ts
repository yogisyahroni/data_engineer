import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult, TableInfo, ColumnInfo } from './base-connector';
import { Client } from 'pg';

/**
 * PostgreSQL Connector Implementation
 * Reference implementation for the Adapter Pattern
 */
export class PostgresConnector extends BaseConnector {
    private client: Client | null = null;

    constructor(config: ConnectionConfig) {
        super(config);
    }

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            await this.connect();
            const result = await this.client!.query('SELECT 1 as test');
            await this.disconnect();
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Connection failed'
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        await this.connect();

        try {
            // Fetch all tables
            const tablesResult = await this.client!.query(`
                SELECT 
                    table_schema,
                    table_name,
                    (SELECT COUNT(*) FROM information_schema.columns 
                     WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
                FROM information_schema.tables t
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY table_schema, table_name
            `);

            const tables: TableInfo[] = [];

            for (const table of tablesResult.rows) {
                // Fetch columns for each table
                const columnsResult = await this.client!.query(`
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default,
                        (SELECT COUNT(*) > 0 
                         FROM information_schema.key_column_usage kcu
                         JOIN information_schema.table_constraints tc 
                           ON kcu.constraint_name = tc.constraint_name
                         WHERE tc.constraint_type = 'PRIMARY KEY'
                           AND kcu.table_schema = c.table_schema
                           AND kcu.table_name = c.table_name
                           AND kcu.column_name = c.column_name) as is_primary,
                        (SELECT COUNT(*) > 0
                         FROM information_schema.key_column_usage kcu
                         JOIN information_schema.table_constraints tc 
                           ON kcu.constraint_name = tc.constraint_name
                         WHERE tc.constraint_type = 'FOREIGN KEY'
                           AND kcu.table_schema = c.table_schema
                           AND kcu.table_name = c.table_name
                           AND kcu.column_name = c.column_name) as is_foreign
                    FROM information_schema.columns c
                    WHERE table_schema = $1 AND table_name = $2
                    ORDER BY ordinal_position
                `, [table.table_schema, table.table_name]);

                const columns: ColumnInfo[] = columnsResult.rows.map(col => ({
                    name: col.column_name,
                    type: col.data_type,
                    nullable: col.is_nullable === 'YES',
                    isPrimary: col.is_primary,
                    isForeign: col.is_foreign
                }));

                tables.push({
                    name: table.table_name,
                    schema: table.table_schema,
                    columns
                });
            }

            return { tables };
        } finally {
            await this.disconnect();
        }
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        await this.connect();

        try {
            const startTime = Date.now();
            const result = await this.client!.query(sql);
            const executionTime = Date.now() - startTime;

            return {
                columns: result.fields.map(f => f.name),
                rows: result.rows,
                rowCount: result.rowCount || 0,
                executionTime
            };
        } finally {
            await this.disconnect();
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
    }

    async *extractData(config: { tableName: string; batchSize?: number }): AsyncGenerator<any[], void, unknown> {
        await this.connect();
        const batchSize = config.batchSize || 1000;
        const tableName = config.tableName;

        // Simple Offset-based pagination (For MVP)
        // Production should use Cursor (pg-cursor) for better performance on large tables
        let offset = 0;

        while (true) {
            const res = await this.client!.query(`SELECT * FROM ${tableName} LIMIT $1 OFFSET $2`, [batchSize, offset]);

            if (res.rows.length === 0) {
                break;
            }

            yield res.rows;
            offset += res.rows.length;

            if (res.rows.length < batchSize) {
                break;
            }
        }
    }

    private async connect(): Promise<void> {
        if (this.client) return;

        this.client = new Client({
            host: this.config.host,
            port: this.config.port || 5432,
            database: this.config.database,
            user: this.config.username,
            password: this.config.password,
            ssl: this.config.ssl ? { rejectUnauthorized: false } : false
        });

        await this.client.connect();
    }
}
