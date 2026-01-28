import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';

/**
 * BigQuery Connector Implementation
 * Google Cloud Data Warehouse
 * 
 * Uses @google-cloud/bigquery SDK
 */
export class BigQueryConnector extends BaseConnector {
    private client: any; // BigQuery client (lazy loaded)

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const startTime = Date.now();

            // Lazy load BigQuery client
            const { BigQuery } = await import('@google-cloud/bigquery');

            this.client = new BigQuery({
                projectId: this.config.project,
                credentials: this.config.extraConfig?.credentials || undefined,
                keyFilename: this.config.extraConfig?.keyFilename || undefined,
            });

            // Test with simple query
            const query = 'SELECT 1 as test';
            await this.client.query({ query, maxResults: 1 });

            const latency = Date.now() - startTime;

            return {
                success: true
            };
        } catch (error: any) {
            return {
                success: false,
                error: `BigQuery connection failed: ${error.message}`
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        if (!this.client) {
            const { BigQuery } = await import('@google-cloud/bigquery');
            this.client = new BigQuery({
                projectId: this.config.project,
                credentials: this.config.extraConfig?.credentials || undefined,
                keyFilename: this.config.extraConfig?.keyFilename || undefined,
            });
        }

        const dataset = this.client.dataset(this.config.database || this.config.extraConfig?.dataset);
        const [tables] = await dataset.getTables();

        const schemaInfo: SchemaInfo = { tables: [] };

        for (const table of tables) {
            const [metadata] = await table.getMetadata();
            const fields = metadata.schema?.fields || [];

            schemaInfo.tables.push({
                name: table.id!,
                schema: this.config.database || this.config.extraConfig?.dataset,
                rowCount: parseInt(metadata.numRows || '0'),
                columns: fields.map((field: any) => ({
                    name: field.name,
                    type: field.type,
                    nullable: field.mode !== 'REQUIRED',
                    isPrimary: false, // BigQuery doesn't enforce primary keys
                    isForeign: false,
                    description: field.description || undefined,
                })),
            });
        }

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        if (!this.client) {
            const { BigQuery } = await import('@google-cloud/bigquery');
            this.client = new BigQuery({
                projectId: this.config.project,
                credentials: this.config.extraConfig?.credentials || undefined,
                keyFilename: this.config.extraConfig?.keyFilename || undefined,
            });
        }

        const [job] = await this.client.createQueryJob({
            query: sql,
            location: this.config.extraConfig?.location || 'US',
        });

        const [rows] = await job.getQueryResults();
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
        // BigQuery SDK handles connection pooling internally
        this.client = null;
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.project) {
            errors.push('Google Cloud project ID is required for BigQuery');
        }

        if (!this.config.database && !this.config.extraConfig?.dataset) {
            errors.push('Dataset is required for BigQuery');
        }

        if (!this.config.extraConfig?.credentials && !this.config.extraConfig?.keyFilename) {
            errors.push('Either credentials JSON or keyFilename is required for BigQuery authentication');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
