
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import Papa from 'papaparse';
import { connectionService } from '@/lib/services/connection-service';
import { getSecurityContext } from '@/lib/security/rls-context';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

        if (parsed.errors.length > 0) {
            return NextResponse.json({ success: false, error: 'CSV Parse Error', details: parsed.errors }, { status: 400 });
        }

        const data = parsed.data as any[];
        if (data.length === 0) {
            return NextResponse.json({ success: false, error: 'CSV is empty' }, { status: 400 });
        }

        const headers = Object.keys(data[0]);
        // Sanitize headers for SQL
        const safeHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

        // Infer Types
        const types = safeHeaders.map((header, index) => {
            const originalHeader = headers[index];
            const sample = data.find(row => row[originalHeader] !== null && row[originalHeader] !== '')?.[originalHeader];

            if (sample === undefined) return 'TEXT'; // All nulls
            if (!isNaN(Number(sample))) return 'DECIMAL';
            const date = Date.parse(sample);
            if (!isNaN(date) && sample.includes('-')) return 'TIMESTAMP'; // Basic date check
            return 'TEXT';
        });

        // Create Table Name
        const context = getSecurityContext(request);
        const timestamp = Date.now();
        // Sanitize User ID for table name
        const safeUserId = context.userId.replace(/[^a-z0-9]/g, '');
        const tableName = `scratchpad.upload_${safeUserId}_${timestamp}`;

        // Generate CREATE TABLE SQL
        const columnDefs = safeHeaders.map((h, i) => `"${h}" ${types[i]}`).join(', ');
        const createSql = `CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, ${columnDefs});`;

        // Get Internal Connection (The App's own DB)
        // We assume connectionService has a method to get the 'default' or 'internal' pool
        // Implementation Detail: We usually use 'pg' Client directly for app-level ops
        const client = new Client({
            connectionString: process.env.DATABASE_URL,
        });

        await client.connect();

        try {
            await client.query('BEGIN');

            // 1. Create Table
            await client.query(createSql);

            // 2. Insert Data
            // Construct Batch Insert (Limit to 1000 for MVP safety, ideally use COPY)
            // For stability, we loop insert or chunky insert.

            for (const row of data) {
                const values = safeHeaders.map((col, i) => {
                    const originalKey = headers[i];
                    const val = row[originalKey];
                    if (val === '' || val === null) return 'NULL';
                    if (types[i] === 'DECIMAL') return Number(val);
                    return `'${String(val).replace(/'/g, "''")}'`; // Escape single quotes
                });

                const insertSql = `INSERT INTO ${tableName} (${safeHeaders.map(h => `"${h}"`).join(',')}) VALUES (${values.join(',')})`;
                await client.query(insertSql);
            }

            await client.query('COMMIT');

            return NextResponse.json({
                success: true,
                tableName: tableName,
                rowCount: data.length,
                columns: safeHeaders
            });

        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            await client.end();
        }

    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
