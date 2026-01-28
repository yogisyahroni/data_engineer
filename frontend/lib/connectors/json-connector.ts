import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';
import * as fs from 'fs';

/**
 * JSON Connector Implementation
 * Supports .json files (array of objects or nested JSON)
 * 
 * Uses in-memory SQL via alasql for querying
 */
export class JSONConnector extends BaseConnector {
    private data: any[] = [];
    private tableName: string = 'json_data';

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const filePath = this.config.filePath || this.config.fileUrl;

            if (!filePath) {
                return {
                    success: false,
                    error: 'File path or URL is required',
                };
            }

            // Read JSON file
            let jsonContent: string;

            if (filePath.startsWith('http')) {
                // Download from URL
                const response = await fetch(filePath);
                jsonContent = await response.text();
            } else {
                // Read from local file
                jsonContent = fs.readFileSync(filePath, 'utf-8');
            }

            // Parse JSON
            const parsed = JSON.parse(jsonContent);

            // Handle both single object and array
            if (Array.isArray(parsed)) {
                this.data = parsed;
            } else if (typeof parsed === 'object') {
                // If it's a single object, wrap in array
                this.data = [parsed];
            } else {
                return {
                    success: false,
                    error: 'JSON must be an array or object',
                };
            }

            if (this.data.length === 0) {
                return {
                    success: false,
                    error: 'JSON file is empty',
                };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: `JSON file read failed: ${error.message}`,
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        if (this.data.length === 0) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        const schemaInfo: SchemaInfo = { tables: [] };

        // Infer schema from first object
        const sampleObject = this.data[0];
        const columns = Object.keys(sampleObject).map((key) => {
            const value = sampleObject[key];
            let type = 'TEXT';

            if (typeof value === 'number') {
                type = Number.isInteger(value) ? 'INTEGER' : 'REAL';
            } else if (typeof value === 'boolean') {
                type = 'BOOLEAN';
            } else if (value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(value))) {
                type = 'DATE';
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
            name: this.tableName,
            schema: 'json',
            rowCount: this.data.length,
            columns,
        });

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        if (this.data.length === 0) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        // Use alasql for in-memory SQL execution
        const alasql = await import('alasql');

        // Register data as alasql table
        alasql.default.tables[this.tableName] = { data: this.data };

        const result = alasql.default(sql);
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
        this.data = [];
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.filePath && !this.config.fileUrl) {
            errors.push('File path or URL is required for JSON connector');
        }

        const filePath = this.config.filePath || this.config.fileUrl || '';
        if (!filePath.toLowerCase().endsWith('.json')) {
            errors.push('File must have .json extension');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
