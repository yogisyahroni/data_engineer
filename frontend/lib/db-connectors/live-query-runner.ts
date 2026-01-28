import { Client, Pool } from 'pg';

const POOLS: Record<string, Pool> = {};

export interface QueryExecutionOptions {
    sql: string;
    connectionConfig: any;
    timeoutMs?: number;
}

export class LiveQueryRunner {
    /**
     * Executes a query on a remote database with timeout protection
     */
    static async execute(options: QueryExecutionOptions): Promise<{ rows: any[], durationMs: number }> {
        const { sql, connectionConfig, timeoutMs = 30000 } = options;

        // 1. Get or Create Connection Pool (Performance & Pooling)
        const poolKey = `${connectionConfig.host}:${connectionConfig.port}:${connectionConfig.database}`;
        if (!POOLS[poolKey]) {
            POOLS[poolKey] = new Pool({
                ...connectionConfig,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });
        }

        const pool = POOLS[poolKey];
        const start = performance.now();

        try {
            // 2. Race between query and timeout (Reliability)
            const queryPromise = pool.query(sql);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Query timed out after ${timeoutMs}ms`)), timeoutMs)
            );

            const result = await Promise.race([queryPromise, timeoutPromise]) as any;
            const durationMs = Math.round(performance.now() - start);

            return {
                rows: result.rows,
                durationMs
            };
        } catch (error) {
            console.error('[LiveQueryRunner] Execution error:', error);
            throw error;
        }
    }

    /**
     * Sanitizes AI generated SQL to prevent destructive operations
     */
    static sanitize(sql: string): string {
        const destructiveKeywords = ['DROP', 'TRUNCATE', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'GRANT', 'REVOKE'];
        const upperSql = sql.toUpperCase();

        for (const keyword of destructiveKeywords) {
            if (upperSql.includes(keyword)) {
                // In a read-only BI tool, we block these
                throw new Error(`Potential destructive operation detected: ${keyword}. Query blocked for safety.`);
            }
        }

        return sql;
    }
}
