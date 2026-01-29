import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';

/**
 * GraphQL Connector Implementation
 * Supports any GraphQL API
 * 
 * Uses fetch for GraphQL requests
 */
export class GraphQLConnector extends BaseConnector {
    private schema: any = null;
    private queryCache: Map<string, any[]> = new Map();

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const apiUrl = this.config.apiUrl;
            const authToken = this.config.authToken;

            if (!apiUrl) {
                return {
                    success: false,
                    error: 'GraphQL API URL is required',
                };
            }

            // Build headers
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            // Test with introspection query
            const introspectionQuery = `
                query {
                    __schema {
                        queryType {
                            name
                        }
                    }
                }
            `;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query: introspectionQuery }),
                signal: AbortSignal.timeout(10000),
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `GraphQL API returned ${response.status}: ${response.statusText}`,
                };
            }

            const result = await response.json();

            if (result.errors) {
                return {
                    success: false,
                    error: `GraphQL errors: ${JSON.stringify(result.errors)}`,
                };
            }

            this.schema = result.data;
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: `GraphQL connection failed: ${error.message}`,
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        const schemaInfo: SchemaInfo = { tables: [] };

        // Perform full introspection
        const introspectionQuery = `
            query {
                __schema {
                    types {
                        name
                        kind
                        fields {
                            name
                            type {
                                name
                                kind
                            }
                        }
                    }
                }
            }
        `;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
        }

        const response = await fetch(this.config.apiUrl!, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: introspectionQuery }),
        });

        const result = await response.json();
        const types = result.data.__schema.types;

        // Filter out built-in types
        const userTypes = types.filter(
            (t: any) => !t.name.startsWith('__') && t.kind === 'OBJECT' && t.fields
        );

        for (const type of userTypes) {
            const columns = (type.fields || []).map((field: any) => {
                let sqlType = 'TEXT';
                const graphqlType = field.type.name || field.type.kind;

                if (graphqlType === 'Int') sqlType = 'INTEGER';
                else if (graphqlType === 'Float') sqlType = 'REAL';
                else if (graphqlType === 'Boolean') sqlType = 'BOOLEAN';
                else if (graphqlType === 'ID') sqlType = 'TEXT';

                return {
                    name: field.name,
                    type: sqlType,
                    nullable: true,
                    isPrimary: field.name === 'id',
                    isForeign: false,
                };
            });

            schemaInfo.tables.push({
                name: type.name,
                schema: 'graphql',
                rowCount: 0, // Unknown without querying
                columns,
            });
        }

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        // Parse SQL to extract table name
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : null;

        if (!tableName) {
            throw new Error('Could not extract table name from SQL');
        }

        // Build GraphQL query from SQL (simplified)
        const graphqlQuery = this.config.extraConfig?.queries?.[tableName] || `
            query {
                ${tableName} {
                    ${this.config.extraConfig?.fields?.[tableName]?.join('\n') || 'id'}
                }
            }
        `;

        // Execute GraphQL query
        const data = await this.executeGraphQL(graphqlQuery, tableName);

        // Use alasql for SQL filtering/aggregation
        const alasql = await import('alasql');
        alasql.default.tables[tableName] = { data };

        const result = alasql.default(sql) as any[];
        const executionTime = Date.now() - startTime;

        const columns = (result as any[]).length > 0 ? Object.keys((result as any[])[0]) : [];

        return {
            columns,
            rows: result,
            rowCount: result.length,
            executionTime,
        };
    }

    private async executeGraphQL(query: string, dataKey?: string): Promise<any[]> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
        }

        const response = await fetch(this.config.apiUrl!, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query }),
        });

        const result = await response.json();

        if (result.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
        }

        // Extract data from response
        const data = dataKey ? result.data[dataKey] : result.data;

        if (Array.isArray(data)) {
            return data;
        } else if (typeof data === 'object') {
            // If it's an object, extract the first array field
            const firstArrayField = Object.values(data).find((v) => Array.isArray(v));
            return firstArrayField || [data];
        }

        return [data];
    }

    async disconnect(): Promise<void> {
        this.queryCache.clear();
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.apiUrl) {
            errors.push('GraphQL API URL is required');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
