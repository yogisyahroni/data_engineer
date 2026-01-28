
import { Client } from 'pg';
import { connectionService } from '@/lib/services/connection-service';
import { replaceQueryVariables } from '@/lib/sql-utils';
import { SecurityContext } from '@/lib/security/rls-context';
import { auditService } from '@/lib/services/audit-service';

export interface AggregationRequest {
    connectionId: string;
    table: string;
    dimensions: ({ column: string; timeBucket?: 'day' | 'week' | 'month' | 'year' } | string)[];
    metrics: { column: string; type: 'count' | 'sum' | 'avg' | 'min' | 'max'; label?: string }[];
    filters?: { column: string; operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains'; value: any }[];
    limit?: number;
    context?: SecurityContext; // Made semi-optional for backward compat but effectively required for RLS
}

export interface AggregationResult {
    success: boolean;
    data?: any[];
    error?: string;
    executionTime?: number;
    sql?: string; // For debugging
}

export class AggregationService {

    /**
     * Executes an aggregation query (GROUP BY)
     */
    async executeAggregation(request: AggregationRequest): Promise<AggregationResult> {
        const startTime = performance.now();
        const { connectionId, table, dimensions, metrics, filters, limit = 1000, context } = request;
        const effectiveContext = context || { userId: 'system', tenantId: 'system', role: 'admin' };

        // 1. Fetch Connection
        const connection = await connectionService.getConnection(connectionId);
        if (!connection) return { success: false, error: 'Connection not found' };
        if (connection.type !== 'postgres') return { success: false, error: 'Only Postgres supported for aggregation currently' };

        // 2. Build SELECT & GROUP BY clauses
        const selectParts: string[] = [];
        const groupByParts: string[] = [];

        // Handle Dimensions
        dimensions.forEach((dim) => {
            if (typeof dim === 'string') {
                // Simple column
                selectParts.push(`"${dim}"`); // Quote column names for safety (basic)
                groupByParts.push(`"${dim}"`);
            } else {
                // Time Bucket
                if (dim.timeBucket) {
                    const truncated = `DATE_TRUNC('${dim.timeBucket}', "${dim.column}")`;
                    selectParts.push(`${truncated} as "${dim.column}_${dim.timeBucket}"`);
                    groupByParts.push(truncated);
                } else {
                    selectParts.push(`"${dim.column}"`);
                    groupByParts.push(`"${dim.column}"`);
                }
            }
        });

        // Handle Metrics
        metrics.forEach((met) => {
            const label = met.label || `${met.type}_${met.column}`;
            if (met.type === 'count' && met.column === '*') {
                selectParts.push(`COUNT(*) as "${label}"`);
            } else {
                selectParts.push(`${met.type.toUpperCase()}("${met.column}") as "${label}"`);
            }
        });

        // Handle Filters (Basic protection)
        const whereClauses: string[] = [];
        const values: any[] = [];

        if (filters && filters.length > 0) {
            filters.forEach((f, index) => {
                let op = f.operator;
                if (!['=', '!=', '>', '<', '>=', '<=', 'contains'].includes(op)) op = '=';

                if (op === 'contains') {
                    whereClauses.push(`"${f.column}" ILIKE $${values.length + 1}`);
                    values.push(`%${f.value}%`);
                } else {
                    whereClauses.push(`"${f.column}" ${op} $${values.length + 1}`);
                    values.push(f.value);
                }
            });
        }

        // 3. Construct SQL
        // Only allow alphanumeric table names to prevent injection
        const safeTable = table.replace(/[^a-zA-Z0-9_.]/g, '');

        let sql = `SELECT ${selectParts.join(', ')} \nFROM ${safeTable}`;

        if (whereClauses.length > 0) {
            sql += ` \nWHERE ${whereClauses.join(' AND ')}`;
        }

        if (groupByParts.length > 0) {
            sql += ` \nGROUP BY ${groupByParts.join(', ')}`;
        }

        // Default sort by first metric desc
        if (metrics.length > 0) {
            const label = metrics[0].label || `${metrics[0].type}_${metrics[0].column}`;
            sql += ` \nORDER BY "${label}" DESC`;
        }

        sql += ` \nLIMIT ${Math.min(limit, 5000)}`;

        // 4. Execute
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

            // RLS Context
            if (effectiveContext.segment) {
                await client.query('BEGIN');
                await client.query(`SET LOCAL app.current_segment = '${effectiveContext.segment}'`);
            }

            const res = await client.query(sql, values);

            if (effectiveContext.segment) {
                await client.query('COMMIT');
            }

            const executionTime = Math.round(performance.now() - startTime);

            auditService.log(effectiveContext, {
                action: 'AGGREGATION',
                resource: safeTable,
                details: JSON.stringify({ dimensions, metrics, filters }),
                status: 'SUCCESS',
                executionTimeMs: executionTime,
                rowCount: res.rowCount || 0
            });

            return {
                success: true,
                data: res.rows,
                executionTime: Math.round(performance.now() - startTime),
                sql // Return SQL for debug/transparency
            };

        } catch (error) {
            console.error('Aggregation Error:', error);
            const msg = error instanceof Error ? error.message : 'Unknown error';

            auditService.log(effectiveContext, {
                action: 'AGGREGATION',
                resource: request.table, // use raw table name from request
                details: 'Aggregation Failed',
                status: 'FAILURE'
            });

            return { success: false, error: msg };
        } finally {
            await client.end();
        }
    }
}

export const aggregationService = new AggregationService();
