import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';

/**
 * Redshift Connector Implementation
 * AWS Data Warehouse
 * 
 * Uses pg (PostgreSQL protocol) since Redshift is PostgreSQL-compatible
 */
export class RedshiftConnector extends BaseConnector {
    private client: any; // pg.Client (lazy loaded)

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const { Client } = await import('pg');

            this.client = new Client({
                host: this.config.host,
                port: this.config.port || 5439, // Redshift default port
                database: this.config.database,
                user: this.config.username,
                password: this.config.password,
                ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
                connectionTimeoutMillis: 10000,
            });

            await this.client.connect();

            // Test query
            const result = await this.client.query('SELECT version()');

            return {
                success: true
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Redshift connection failed: ${error.message}`
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        if (!this.client || !this.client._connected) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        // Query Redshift's system tables (uses PG_CATALOG)
        const tablesQuery = `
            SELECT 
                t.table_schema,
                t.table_name,
                (SELECT COUNT(*) FROM ${this.config.database}.information_schema.columns c 
                 WHERE c.table_schema = t.table_schema 
                 AND c.table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY t.table_schema, t.table_name;
        `;

        const { rows: tables } = await this.client.query(tablesQuery);

        const schemaInfo: SchemaInfo = { tables: [] };

        for (const table of tables) {
            const columnsQuery = `
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = $1 AND table_name = $2
                ORDER BY ordinal_position;
            `;

            const { rows: columns } = await this.client.query(columnsQuery, [
                table.table_schema,
                table.table_name,
            ]);

            schemaInfo.tables.push({
                name: table.table_name,
                schema: table.table_schema,
                rowCount: 0, // Expensive in Redshift, skip for now
                columns: columns.map((col: any) => ({
                    name: col.column_name,
                    type: col.data_type,
                    nullable: col.is_nullable === 'YES',
                    isPrimary: false, // Redshift has weak PK enforcement
                    isForeign: false,
                    description: undefined,
                })),
            });
        }

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        if (!this.client || !this.client._connected) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        const result = await this.client.query(sql);
        const executionTime = Date.now() - startTime;

        const columns = result.fields.map((f: any) => f.name);

        return {
            columns,
            rows: result.rows,
            rowCount: result.rowCount || result.rows.length,
            executionTime,
        };
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.host) {
            errors.push('Host is required for Redshift');
        }

        if (!this.config.database) {
            errors.push('Database is required for Redshift');
        }

        if (!this.config.username) {
            errors.push('Username is required for Redshift');
        }

        if (!this.config.password) {
            errors.push('Password is required for Redshift');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
