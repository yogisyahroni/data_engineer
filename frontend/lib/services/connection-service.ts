import { connectionRepo } from '@/lib/repositories/connection-repo';
import { CreateConnectionInput } from '@/lib/schemas/connection';
import { PostgresConnector } from '../db-connectors/postgres-connector';
import { encrypt, decrypt } from '../security/encryption';

// Schema types
export interface TableInfo {
    name: string;
    schema: string;
    rowCount: number;
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    isPrimary: boolean;
    defaultValue: string | null;
    description: string | null;
}

export interface SchemaInfo {
    tables: Array<{
        name: string;
        schema: string;
        columns: ColumnInfo[];
        foreignKeys: Array<{
            column: string;
            referencedTable: string;
            referencedSchema: string;
            referencedColumn: string;
        }>;
        rowCount: number;
    }>;
    lastSyncedAt: Date;
}

export interface TestConnectionResult {
    success: boolean;
    message: string;
    latencyMs?: number;
    version?: string;
}

export class ConnectionService {
    async createConnection(userId: string, data: CreateConnectionInput) {
        const encryptedData = {
            ...data,
            password: data.password ? encrypt(data.password) : undefined,
        };

        return connectionRepo.create({
            ...encryptedData,
            userId,
        } as any);
    }

    async getConnections(userId: string) {
        return connectionRepo.findAllByUserId(userId);
    }

    async getConnection(id: string) {
        return connectionRepo.findById(id);
    }

    async updateConnection(id: string, data: Partial<CreateConnectionInput>) {
        const updateData = {
            ...data,
            password: data.password ? encrypt(data.password) : undefined,
        };

        return connectionRepo.update(id, updateData as any);
    }

    async deleteConnection(id: string) {
        return connectionRepo.delete(id);
    }

    async testConnection(connectionId: string): Promise<TestConnectionResult> {
        const connection = await this.getConnection(connectionId);
        if (!connection) return { success: false, message: 'Connection not found' };

        const decryptedPassword = connection.password ? decrypt(connection.password) : '';

        if (connection.type === 'postgres') {
            const connector = new PostgresConnector({
                host: connection.host || 'localhost',
                port: connection.port || 5432,
                database: connection.database,
                user: connection.username || 'postgres',
                password: decryptedPassword,
            });

            const startTime = performance.now();
            try {
                await connector.execute('SELECT 1');
                const latencyMs = Math.round(performance.now() - startTime);
                return {
                    success: true,
                    message: 'Connection successful',
                    latencyMs,
                };
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                console.error(`[ConnectionService] Test failed for ${connection.name}:`, msg);
                return { success: false, message: msg };
            }
        }

        return { success: false, message: `Connector for ${connection.type} not yet implemented` };
    }

    async fetchSchema(connectionId: string): Promise<SchemaInfo | null> {
        const connection = await this.getConnection(connectionId);
        if (!connection || connection.type !== 'postgres') return null;

        const decryptedPassword = connection.password ? decrypt(connection.password) : '';

        const connector = new PostgresConnector({
            host: connection.host || 'localhost',
            port: connection.port || 5432,
            database: connection.database,
            user: connection.username || 'postgres',
            password: decryptedPassword,
        });

        try {
            // 1. Fetch Tables with Row Counts (Approximation from pg_class for speed)
            const tablesResult = await connector.execute(`
                SELECT 
                    t.table_name, 
                    t.table_schema,
                    COALESCE(s.n_live_tup, 0) as row_count
                FROM information_schema.tables t
                LEFT JOIN pg_stat_user_tables s 
                    ON s.schemaname = t.table_schema 
                    AND s.relname = t.table_name
                WHERE t.table_schema IN ('public', 'imports', 'scratchpad') 
                AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_schema, t.table_name
            `);

            // 2. Fetch All Columns
            const columnsResult = await connector.execute(`
                SELECT 
                    c.table_schema,
                    c.table_name,
                    c.column_name as name,
                    c.data_type as type,
                    c.is_nullable = 'YES' as nullable,
                    c.column_default as default_value,
                    pgd.description
                FROM information_schema.columns c
                LEFT JOIN pg_catalog.pg_statio_all_tables as st 
                    ON c.table_schema = st.schemaname AND c.table_name = st.relname
                LEFT JOIN pg_catalog.pg_description pgd 
                    ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
                WHERE c.table_schema IN ('public', 'imports', 'scratchpad')
                ORDER BY c.table_schema, c.table_name, c.ordinal_position
            `);

            // 3. Fetch Primary Keys
            const pkResult = await connector.execute(`
                SELECT tc.table_schema, tc.table_name, kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name 
                    AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema IN ('public', 'imports', 'scratchpad')
            `);

            // 4. Fetch Foreign Keys (Relationships)
            const fkResult = await connector.execute(`
                SELECT
                    tc.table_schema,
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_schema AS foreign_table_schema,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema IN ('public', 'imports', 'scratchpad')
            `);

            // Data Processing
            const tables: SchemaInfo['tables'] = tablesResult.map((t: any) => ({
                name: t.table_name,
                schema: t.table_schema,
                rowCount: Number(t.row_count || 0),
                columns: [], // Will populate
                foreignKeys: [] // New field
            }));

            const tableMap = new Map(tables.map((t) => [`${t.schema}.${t.name}`, t]));

            // Populate Columns
            for (const col of columnsResult) {
                const table = tableMap.get(`${col.table_schema}.${col.table_name}`);
                if (table) {
                    table.columns.push({
                        name: col.name,
                        type: col.type,
                        nullable: col.nullable,
                        isPrimary: false, // Set later
                        defaultValue: col.default_value,
                        description: col.description
                    });
                }
            }

            // Mark Primary Keys
            for (const pk of pkResult) {
                const table = tableMap.get(`${pk.table_schema}.${pk.table_name}`);
                if (table) {
                    const column = table.columns.find((c) => c.name === pk.column_name);
                    if (column) column.isPrimary = true;
                }
            }

            // Map Foreign Keys
            for (const fk of fkResult) {
                const table = tableMap.get(`${fk.table_schema}.${fk.table_name}`);
                if (table) {
                    table.foreignKeys.push({
                        column: fk.column_name,
                        referencedTable: fk.foreign_table_name,
                        referencedSchema: fk.foreign_table_schema,
                        referencedColumn: fk.foreign_column_name
                    });
                }
            }

            return { tables, lastSyncedAt: new Date() };
        } catch (error) {
            console.error('[ConnectionService] Schema fetch error:', error);
            return null;
        }
    }


}

export const connectionService = new ConnectionService();
