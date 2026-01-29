import { BaseConnector, ConnectionConfig, SchemaInfo, QueryResult } from './base-connector';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Excel Connector Implementation
 * Supports .xlsx, .xls files
 * 
 * Uses xlsx library for parsing
 */
export class ExcelConnector extends BaseConnector {
    private workbook: any; // XLSX workbook object
    private sheets: string[] = [];

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            const filePath = this.config.filePath || this.config.fileUrl;

            if (!filePath) {
                return {
                    success: false,
                    error: 'File path or URL is required',
                };
            }

            // Import xlsx library (lazy load)
            const XLSX = await import('xlsx');

            // Read file
            let buffer: Buffer;

            if (filePath.startsWith('http')) {
                // Download from URL
                const response = await fetch(filePath);
                const arrayBuffer = await response.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            } else {
                // Read from local file
                buffer = fs.readFileSync(filePath);
            }

            // Parse workbook
            this.workbook = XLSX.read(buffer, { type: 'buffer' });
            this.sheets = this.workbook.SheetNames;

            if (this.sheets.length === 0) {
                return {
                    success: false,
                    error: 'No sheets found in Excel file',
                };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: `Excel file read failed: ${error.message}`,
            };
        }
    }

    async fetchSchema(): Promise<SchemaInfo> {
        if (!this.workbook) {
            throw new Error('Not connected. Call testConnection() first.');
        }

        const XLSX = await import('xlsx');
        const schemaInfo: SchemaInfo = { tables: [] };

        for (const sheetName of this.sheets) {
            const worksheet = this.workbook.Sheets[sheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) continue;

            // First row is header
            const headers = jsonData[0] as string[];
            const sampleRow = jsonData[1] || [];

            // Infer column types from first data row
            const columns = headers.map((header, index) => {
                const sampleValue = sampleRow[index];
                let type = 'TEXT';

                if (typeof sampleValue === 'number') {
                    type = Number.isInteger(sampleValue) ? 'INTEGER' : 'REAL';
                } else if (sampleValue instanceof Date) {
                    type = 'DATE';
                } else if (typeof sampleValue === 'boolean') {
                    type = 'BOOLEAN';
                }

                return {
                    name: header || `Column${index + 1}`,
                    type,
                    nullable: true,
                    isPrimary: false,
                    isForeign: false,
                };
            });

            schemaInfo.tables.push({
                name: sheetName,
                schema: 'excel',
                rowCount: jsonData.length - 1, // Exclude header
                columns,
            });
        }

        return schemaInfo;
    }

    async executeQuery(sql: string): Promise<QueryResult> {
        const startTime = Date.now();

        // Excel doesn't support SQL natively
        // We'll use alasql for in-memory SQL execution
        const alasql = await import('alasql');
        const XLSX = await import('xlsx');

        // Convert all sheets to JSON tables
        for (const sheetName of this.sheets) {
            const worksheet = this.workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Register as alasql table
            alasql.default.tables[sheetName] = { data: jsonData };
        }

        const result = alasql.default(sql);
        const executionTime = Date.now() - startTime;

        const rows = Array.isArray(result) ? result : [];
        const columns = rows.length > 0 && typeof rows[0] === 'object' ? Object.keys(rows[0] as object) : [];

        return {
            columns,
            rows,
            rowCount: rows.length,
            executionTime,
        };
    }

    async disconnect(): Promise<void> {
        this.workbook = null;
        this.sheets = [];
    }

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.filePath && !this.config.fileUrl) {
            errors.push('File path or URL is required for Excel connector');
        }

        const filePath = this.config.filePath || this.config.fileUrl || '';
        const ext = path.extname(filePath).toLowerCase();

        if (!['.xlsx', '.xls'].includes(ext)) {
            errors.push('File must be .xlsx or .xls format');
        }

        return {
            valid: errors.length === 0,
            errors: [...super.validateConfig().errors, ...errors],
        };
    }
}
