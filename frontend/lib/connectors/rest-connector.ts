import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';

/**
 * REST API Connector Implementation
 * Generic connector for any REST API
 * 
 * Uses fetch for HTTP requests
 */
export class RESTConnector extends BaseConnector {
    private cachedData: any[] = [];
    private endpoints: Map<string, string> = new Map();

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const baseUrl = this.config.apiUrl;
            const apiKey = this.config.apiKey;
            const authToken = this.config.authToken;

            if (!baseUrl) {
                return {
                    success: false,
                    error: 'API URL is required',
                };
            }

            // Build headers
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (apiKey) {
                headers['X-API-Key'] = apiKey;
            }

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            // Test with health/ping endpoint if available
            const testEndpoint = this.config.extraConfig?.healthEndpoint || '/';
            const response = await fetch(`${baseUrl}${testEndpoint}`, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `API returned ${response.status}: ${response.statusText}`,
                };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: `REST API connection failed: ${error.message}`,
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        const schemaInfo: SchemaInfo = { tables: [] };

        // For REST APIs, we treat each endpoint as a "table"
        const configEndpoints = this.config.extraConfig?.endpoints || {};

        for (const [name, path] of Object.entries(configEndpoints)) {
            this.endpoints.set(name, path as string);

            // Fetch sample data to infer schema
            try {
                const data = await this.fetchEndpoint(name);

                if (Array.isArray(data) && data.length > 0) {
                    const sampleObject = data[0];
                    const columns = Object.keys(sampleObject).map((key) => {
                        const value = sampleObject[key];
                        let type = 'TEXT';

                        if (typeof value === 'number') {
                            type = Number.isInteger(value) ? 'INTEGER' : 'REAL';
                        } else if (typeof value === 'boolean') {
                            type = 'BOOLEAN';
                        } else if (typeof value === 'object') {
                            type = 'JSON';
                        }

                        return {
                            name: key,
                            type,
                            nullable: true,
                            isPrimary: false,
                            isForeign: false,
                        };
                    });

                    schemaInfo.tables.push({
                        name,
                        schema: 'rest_api',
                        rowCount: data.length,
                        columns,
                    });
                }
            } catch (error) {
                console.error(`Failed to fetch schema for endpoint ${name}:`, error);
            }
        }

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        // Parse SQL to determine which endpoint to query
        // This is a simplified approach - in production, use a SQL parser
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : null;

        if (!tableName || !this.endpoints.has(tableName)) {
            throw new Error(`Unknown table/endpoint: ${tableName}`);
        }

        // Fetch data from endpoint
        const data = await this.fetchEndpoint(tableName);

        // Use alasql for in-memory SQL execution
        const alasql = await import('alasql');
        alasql.default.tables[tableName] = { data };

        const result = alasql.default(sql) as any[];
        const executionTime = Date.now() - startTime;

        const columns = result.length > 0 ? Object.keys(result[0]) : [];

        return {
            columns,
            rows: result,
            rowCount: result.length,
            executionTime,
        };
    }

    private async fetchEndpoint(name: string): Promise<any[]> {
        const path = this.endpoints.get(name);
        if (!path) throw new Error(`Endpoint ${name} not found`);

        const baseUrl = this.config.apiUrl!;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.config.apiKey) {
            headers['X-API-Key'] = this.config.apiKey;
        }

        if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
        }

        const response = await fetch(`${baseUrl}${path}`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Handle different response formats
        if (Array.isArray(data)) {
            return data;
        } else if (data.data && Array.isArray(data.data)) {
            return data.data;
        } else if (data.results && Array.isArray(data.results)) {
            return data.results;
        } else {
            return [data];
        }
    }

    async disconnect(): Promise<void> {
        this.cachedData = [];
        this.endpoints.clear();
    }

    async *extractData(config: { endpoint: string; paginationType?: 'none' | 'page' | 'cursor' }): AsyncGenerator<any[], void, unknown> {
        // Simple extraction: Calls endpoint once. 
        // Real ETL would loop through pages.

        const data = await this.fetchEndpoint(config.endpoint);

        // Return as a single batch for now (MVP)
        yield data;
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.apiUrl) {
            errors.push('API URL is required for REST connector');
        }

        if (!this.config.apiKey && !this.config.authToken) {
            errors.push('Either API key or auth token is required');
        }

        if (!this.config.extraConfig?.endpoints || Object.keys(this.config.extraConfig.endpoints).length === 0) {
            errors.push('At least one endpoint must be configured in extraConfig.endpoints');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
