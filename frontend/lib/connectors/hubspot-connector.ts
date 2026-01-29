import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';

/**
 * HubSpot Connector Implementation
 * Connects to HubSpot CRM API
 * 
 * Uses HubSpot Node.js Client
 */
export class HubSpotConnector extends BaseConnector {
    private client: any; // HubSpot client

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            // Lazy load HubSpot client
            const hubspot = await import('@hubspot/api-client');

            this.client = new hubspot.Client({
                accessToken: this.config.authToken || this.config.apiKey,
            });

            // Test with a simple API call
            await this.client.crm.contacts.basicApi.getPage(1);

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: `HubSpot connection failed: ${error.message}`,
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        if (!this.client) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        const schemaInfo: SchemaInfo = { tables: [] };

        // HubSpot standard objects
        const objects = [
            { name: 'contacts', api: 'contacts' },
            { name: 'companies', api: 'companies' },
            { name: 'deals', api: 'deals' },
            { name: 'tickets', api: 'tickets' },
            { name: 'products', api: 'products' },
            { name: 'quotes', api: 'quotes' },
        ];

        for (const obj of objects) {
            try {
                // Get properties (columns) for each object
                const properties = await this.client.crm.properties.coreApi.getAll(obj.api);

                const columns = properties.results.map((prop: any) => {
                    let sqlType = 'TEXT';

                    switch (prop.type) {
                        case 'number':
                            sqlType = 'INTEGER';
                            break;
                        case 'date':
                        case 'datetime':
                            sqlType = 'TIMESTAMP';
                            break;
                        case 'bool':
                            sqlType = 'BOOLEAN';
                            break;
                        case 'enumeration':
                            sqlType = 'TEXT';
                            break;
                        default:
                            sqlType = 'TEXT';
                    }

                    return {
                        name: prop.name,
                        type: sqlType,
                        nullable: !prop.required,
                        isPrimary: prop.name === 'id',
                        isForeign: false,
                        description: prop.label,
                    };
                });

                schemaInfo.tables.push({
                    name: obj.name,
                    schema: 'hubspot',
                    rowCount: 0, // Unknown without full query
                    columns,
                });
            } catch (error) {
                console.error(`Failed to fetch schema for ${obj.name}:`, error);
            }
        }

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        if (!this.client) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        // Parse SQL to determine which object to query
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : null;

        if (!tableName) {
            throw new Error('Could not extract table name from SQL');
        }

        // Map table name to HubSpot object
        const objectMap: Record<string, string> = {
            contacts: 'contacts',
            companies: 'companies',
            deals: 'deals',
            tickets: 'tickets',
            products: 'products',
            quotes: 'quotes',
        };

        const objectType = objectMap[tableName.toLowerCase()];

        if (!objectType) {
            throw new Error(`Unsupported HubSpot object: ${tableName}`);
        }

        // Extract requested columns from SELECT clause
        const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
        const selectColumns = selectMatch ? selectMatch[1].trim() : '*';

        const properties = selectColumns === '*'
            ? undefined
            : selectColumns.split(',').map((c) => c.trim());

        // Fetch data from HubSpot
        const limit = 100; // HubSpot API pagination
        let after: string | undefined;
        const allRows: any[] = [];

        do {
            const response = await this.client.crm[objectType].basicApi.getPage(
                limit,
                after,
                properties,
                undefined,
                undefined,
                false
            );

            allRows.push(...response.results.map((r: any) => r.properties));
            after = response.paging?.next?.after;

            // Stop after 10000 rows for safety
            if (allRows.length >= 10000) break;
        } while (after);

        // Use alasql for SQL filtering/aggregation
        const alasql = await import('alasql');
        alasql.default.tables[tableName] = { data: allRows };

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

    async disconnect(): Promise<void> {
        this.client = null;
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.authToken && !this.config.apiKey) {
            errors.push('Access token or API key is required for HubSpot');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
