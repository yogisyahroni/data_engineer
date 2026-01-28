import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';

/**
 * Databricks Connector Implementation
 * Unified Analytics Platform (Spark SQL)
 * 
 * Uses Databricks SQL Connector for Node.js
 */
export class DatabricksConnector extends BaseConnector {
    private client: any; // Databricks SQL client (lazy loaded)
    private session: any; // Active session

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const { DBSQLClient } = await import('@databricks/sql');

            this.client = new DBSQLClient();

            this.session = await this.client.connect({
                host: this.config.host,
                path: this.config.extraConfig?.httpPath || '/sql/1.0/warehouses/' + this.config.cluster,
                token: this.config.apiKey,
                socketTimeout: 30000,
            });

            // Test with simple query
            const queryOperation = await this.session.executeStatement('SELECT 1 as test');
            await queryOperation.fetchAll();
            await queryOperation.close();

            return {
                success: true
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Databricks connection failed: ${error.message}`
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        if (!this.session) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        const catalog = this.config.extraConfig?.catalog || 'hive_metastore';
        const schemaName = this.config.database || this.config.extraConfig?.schema || 'default';

        // Query Databricks catalog
        const tablesQuery = `SHOW TABLES IN ${catalog}.${schemaName}`;
        const tablesOp = await this.session.executeStatement(tablesQuery);
        const tablesResult = await tablesOp.fetchAll();
        await tablesOp.close();

        const schemaInfo: SchemaInfo = { tables: [] };

        for (const tableRow of tablesResult) {
            const tableName = tableRow.tableName;

            // Get columns for each table
            const columnsQuery = `DESCRIBE TABLE ${catalog}.${schemaName}.${tableName}`;
            const columnsOp = await this.session.executeStatement(columnsQuery);
            const columnsResult = await columnsOp.fetchAll();
            await columnsOp.close();

            schemaInfo.tables.push({
                name: tableName,
                schema: schemaName,
                rowCount: 0, // Expensive to compute in Spark
                columns: columnsResult.map((col: any) => ({
                    name: col.col_name,
                    type: col.data_type,
                    nullable: !col.col_name.includes('NOT NULL'), // Spark doesn't track this well
                    isPrimary: false, // Spark doesn't enforce PKs
                    isForeign: false,
                    description: col.comment || undefined,
                })),
            });
        }

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        if (!this.session) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        const queryOperation = await this.session.executeStatement(sql);
        const rows = await queryOperation.fetchAll();
        await queryOperation.close();

        const executionTime = Date.now() - startTime;
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

        return {
            columns,
            rows,
            rowCount: rows.length,
            executionTime,
        };
    }

    async disconnect(): Promise<void> {
        if (this.session) {
            await this.session.close();
            this.session = null;
        }
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.host) {
            errors.push('Host is required for Databricks');
        }

        if (!this.config.apiKey) {
            errors.push('Access token (apiKey) is required for Databricks');
        }

        if (!this.config.cluster && !this.config.extraConfig?.httpPath) {
            errors.push('Either cluster ID or httpPath is required for Databricks');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
