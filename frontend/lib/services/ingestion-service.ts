import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db } from '@/lib/db';
import { PostgresConnector } from '../db-connectors/postgres-connector';
import { SecretManager } from '../security/secret-manager';

export interface IngestionResult {
    success: boolean;
    tableName: string;
    rowCount: number;
    error?: string;
}

export class IngestionService {
    /**
     * Parses a file buffer and projects it into a new PostgreSQL table
     */
    static async ingestFromFile(
        userId: string,
        fileName: string,
        buffer: Buffer,
        fileType: 'xlsx' | 'csv'
    ): Promise<IngestionResult> {
        try {
            const data = await this.parseFile(buffer, fileType);
            if (data.length === 0) throw new Error('File is empty');

            const headers = Object.keys(data[0]);
            const sanitizedTableName = `ext_${fileName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`;

            // 1. Generate DDL
            const ddl = this.generateTableDDL(sanitizedTableName, headers);

            // 2. Execute Projection (Direct to internal DB or Active connection)
            // For industrial BI, we project to the user's isolated 'imports' schema
            let dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'Inside_engineer1',
                user: process.env.DB_USER || 'postgres',
                password: SecretManager.getSecret('DATABASE_PASSWORD'),
            };

            // Fallback: Parse DATABASE_URL if password is missing (which is common in Prisma setups)
            const dbUrl = SecretManager.getSecret('DATABASE_URL');
            if (dbUrl && (!dbConfig.password || dbConfig.password === '')) {
                try {
                    // Handle postgresql:// protocol
                    const parsedUrl = new URL(dbUrl);
                    dbConfig = {
                        host: parsedUrl.hostname,
                        port: parseInt(parsedUrl.port) || 5432,
                        database: parsedUrl.pathname.substring(1), // Remove leading slash
                        user: parsedUrl.username,
                        password: parsedUrl.password,
                    };
                } catch (e) {
                    console.warn('[IngestionService] Failed to parse DATABASE_URL, falling back to individual vars', e);
                }
            }

            const connector = new PostgresConnector({
                host: dbConfig.host,
                port: dbConfig.port,
                database: dbConfig.database,
                user: dbConfig.user,
                password: dbConfig.password,
            });

            await connector.execute(`CREATE SCHEMA IF NOT EXISTS imports;`);
            await connector.execute(ddl);

            // 3. Batch Insert Data
            await this.batchInsert(connector, sanitizedTableName, data);

            return {
                success: true,
                tableName: `imports.${sanitizedTableName}`,
                rowCount: data.length
            };
        } catch (error: any) {
            console.error('[IngestionService] Ingestion failed:', error);
            return { success: false, tableName: '', rowCount: 0, error: error.message };
        }
    }

    /**
     * Returns a sample of the data and column info for preview
     */
    static async getPreview(buffer: Buffer, fileType: 'xlsx' | 'csv') {
        const data = await this.parseFile(buffer, fileType);
        if (data.length === 0) return { headers: [], rows: [] };

        const headers = Object.keys(data[0]);
        const rows = data.slice(0, 5);

        // Basic type suggestion
        const schema = headers.map(h => {
            const samples = rows.map(r => r[h]).filter(v => v !== null && v !== undefined);
            const isNumeric = samples.every(s => !isNaN(Number(s)) && String(s).trim() !== '');
            return {
                name: h,
                type: isNumeric ? 'NUMBER' : 'TEXT'
            };
        });

        return { headers: schema, rows };
    }

    private static async parseFile(buffer: Buffer, fileType: 'xlsx' | 'csv'): Promise<any[]> {
        return fileType === 'xlsx'
            ? this.parseExcel(buffer)
            : this.parseCSV(buffer.toString());
    }

    private static parseExcel(buffer: Buffer): any[] {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    }

    private static parseCSV(csvString: string): any[] {
        const result = Papa.parse(csvString, { header: true, skipEmptyLines: true });
        return result.data;
    }

    private static generateTableDDL(tableName: string, headers: string[], data?: any[]): string {
        const columns = headers.map(h => {
            const cleanHeader = h.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

            // Simple type enhancement if data is present
            let type = 'TEXT';
            if (data && data.length > 0) {
                const sample = data[0][h];
                if (sample !== undefined && !isNaN(Number(sample)) && String(sample).trim() !== '') {
                    type = 'NUMERIC';
                }
            }

            return `"${cleanHeader}" ${type}`;
        }).join(', ');

        return `CREATE TABLE imports."${tableName}" (${columns});`;
    }

    private static async batchInsert(connector: PostgresConnector, tableName: string, data: any[]) {
        // Industrial strength batching (1000 rows per chunk)
        const chunkSize = 1000;
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            const headers = Object.keys(chunk[0]);
            const columns = headers.map(h => `"${h.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}"`).join(', ');

            const values = chunk.map(row => {
                const vals = headers.map(h => {
                    const val = row[h];
                    if (val === null || val === undefined) return 'NULL';
                    return `'${String(val).replace(/'/g, "''")}'`;
                });
                return `(${vals.join(', ')})`;
            }).join(', ');

            await connector.execute(`INSERT INTO imports."${tableName}" (${columns}) VALUES ${values};`);
        }
    }
}
