import { Client } from 'pg';
import { connectionService } from '@/lib/services/connection-service';
import { SecurityContext } from '@/lib/security/rls-context';
import { auditService } from '@/lib/services/audit-service';

export interface ExecuteQueryResult {
    success: boolean;
    data?: any[];
    rowCount?: number;
    columns?: string[];
    executionTime?: number; // in ms
    error?: string;
    totalRows?: number; // For pagination
}

export class QueryService {
    /**
     * Executes a raw SQL query against the database defined by connectionId.
     * Safety: READ-ONLY enforcement.
     * Security: Requires SecurityContext for RLS and Auditing.
     */
    async executeRawQuery(connectionId: string, sql: string, context?: SecurityContext): Promise<ExecuteQueryResult> {
        const startTime = performance.now();
        const effectiveContext = context || { userId: 'system', tenantId: 'system', role: 'admin' }; // Fallback for legacy calls

        // 1. Fetch Connection Details
        const connection = await connectionService.getConnection(connectionId);
        if (!connection) {
            return { success: false, error: 'Connection not found' };
        }

        if (connection.type !== 'postgres') {
            return { success: false, error: `Unsupported database type: ${connection.type}` };
        }

        // 2. Safety Check (Phase 1.5 Security)
        const forbiddenKeywords = [/DROP/i, /DELETE/i, /UPDATE/i, /INSERT/i, /ALTER/i, /TRUNCATE/i, /GRANT/i];
        for (const keyword of forbiddenKeywords) {
            if (keyword.test(sql)) {
                const error = 'Security Violation: Only SELECT queries are allowed.';
                auditService.log(effectiveContext, {
                    action: 'QUERY_EXECUTE',
                    resource: connectionId,
                    details: sql,
                    status: 'FAILURE'
                });
                return { success: false, error };
            }
        }

        // 3. Connect & Execute
        const client = new Client({
            host: connection.host || 'localhost',
            port: connection.port || 5432,
            database: connection.database,
            user: connection.username || 'postgres',
            password: connection.password || '',
            ssl: false,
        });

        try {
            await client.connect();

            // RLS: Set Session Variable
            if (effectiveContext.segment) {
                await client.query('BEGIN');
                await client.query(`SET LOCAL app.current_segment = '${effectiveContext.segment}'`);
            }

            const res = await client.query(sql);

            if (effectiveContext.segment) {
                await client.query('COMMIT');
            }

            const executionTime = Math.round(performance.now() - startTime);

            // Audit Success
            auditService.log(effectiveContext, {
                action: 'QUERY_EXECUTE',
                resource: connectionId,
                details: sql.substring(0, 100) + '...', // Log snippet
                status: 'SUCCESS',
                executionTimeMs: executionTime,
                rowCount: res.rowCount || 0
            });

            return {
                success: true,
                data: res.rows,
                rowCount: res.rowCount || res.rows.length,
                columns: res.fields.map((f) => f.name),
                executionTime,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';

            // Audit Failure
            auditService.log(effectiveContext, {
                action: 'QUERY_EXECUTE',
                resource: connectionId,
                details: sql,
                status: 'FAILURE'
            });

            return { success: false, error: errorMessage };
        } finally {
            await client.end();
        }
    }

    /**
     * Executes a paginated SQL query.
     * Wraps the user's SQL to apply LIMIT and OFFSET safely.
     */
    async executePaginatedQuery(
        connectionId: string,
        sql: string,
        page: number = 1,
        pageSize: number = 50,
        context?: SecurityContext
    ): Promise<ExecuteQueryResult> {
        const startTime = performance.now();
        const effectiveContext = context || { userId: 'system', tenantId: 'system', role: 'admin' };

        // 1. Fetch Connection Details
        const connection = await connectionService.getConnection(connectionId);
        if (!connection) {
            return { success: false, error: 'Connection not found' };
        }

        if (connection.type !== 'postgres') {
            return { success: false, error: `Unsupported database type: ${connection.type}` };
        }

        // 2. Safety Check
        const forbiddenKeywords = [/DROP/i, /DELETE/i, /UPDATE/i, /INSERT/i, /ALTER/i, /TRUNCATE/i, /GRANT/i];
        for (const keyword of forbiddenKeywords) {
            if (keyword.test(sql)) {
                return {
                    success: false,
                    error: 'Security Violation: Only SELECT queries are allowed.'
                };
            }
        }

        // 3. Connect & Execute
        const client = new Client({
            host: connection.host || 'localhost',
            port: connection.port || 5432,
            database: connection.database,
            user: connection.username || 'postgres',
            password: connection.password || '',
            ssl: false,
        });

        try {
            await client.connect();

            // RLS
            if (effectiveContext.segment) {
                await client.query('BEGIN');
                await client.query(`SET LOCAL app.current_segment = '${effectiveContext.segment}'`);
            }

            // Calculate Offset
            const offset = (page - 1) * pageSize;

            const countSql = `SELECT COUNT(*) as exact_count FROM (${sql}) as subq`;
            const countRes = await client.query(countSql);
            const totalRows = parseInt(countRes.rows[0].exact_count, 10);

            const dataSql = `SELECT * FROM (${sql}) as subq LIMIT ${pageSize} OFFSET ${offset}`;
            const res = await client.query(dataSql);

            if (effectiveContext.segment) {
                await client.query('COMMIT');
            }

            const executionTime = Math.round(performance.now() - startTime);

            auditService.log(effectiveContext, {
                action: 'QUERY_EXECUTE',
                resource: connectionId,
                details: `Paginated: ${sql.substring(0, 50)}...`,
                status: 'SUCCESS',
                executionTimeMs: executionTime,
                rowCount: res.rowCount || 0
            });

            return {
                success: true,
                data: res.rows,
                rowCount: res.rowCount || res.rows.length,
                totalRows,
                columns: res.fields.map((f) => f.name),
                executionTime,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
            auditService.log(effectiveContext, {
                action: 'QUERY_EXECUTE',
                resource: connectionId,
                details: sql,
                status: 'FAILURE'
            });
            return { success: false, error: errorMessage };
        } finally {
            await client.end();
        }
    }
}

export const queryService = new QueryService();
