/**
 * Connection Pool Manager
 * Manages connection instances, pooling, and lifecycle
 */

import { BaseConnector, ConnectionConfig } from './base-connector';
import { ConnectorFactory } from './connector-factory';

interface PooledConnection {
    connector: BaseConnector;
    lastUsed: Date;
    inUse: boolean;
}

export class ConnectionPoolManager {
    private pools = new Map<string, PooledConnection[]>();
    private maxPoolSize = 10;
    private idleTimeout = 5 * 60 * 1000; // 5 minutes

    /**
     * Get a connection from the pool (or create new)
     */
    async getConnection(connectionId: string, config: ConnectionConfig): Promise<BaseConnector> {
        const pool = this.pools.get(connectionId) || [];

        // Find idle connection
        const idle = pool.find(conn => !conn.inUse);
        if (idle) {
            idle.inUse = true;
            idle.lastUsed = new Date();
            return idle.connector;
        }

        // Create new if under max pool size
        if (pool.length < this.maxPoolSize) {
            const connector = ConnectorFactory.create(config);
            const pooledConn: PooledConnection = {
                connector,
                lastUsed: new Date(),
                inUse: true
            };
            pool.push(pooledConn);
            this.pools.set(connectionId, pool);
            return connector;
        }

        // Wait for available connection (simplified)
        throw new Error('Connection pool exhausted. Try again later.');
    }

    /**
     * Release connection back to pool
     */
    releaseConnection(connectionId: string, connector: BaseConnector) {
        const pool = this.pools.get(connectionId);
        if (!pool) return;

        const pooledConn = pool.find(c => c.connector === connector);
        if (pooledConn) {
            pooledConn.inUse = false;
            pooledConn.lastUsed = new Date();
        }
    }

    /**
     * Cleanup idle connections
     */
    async cleanupIdleConnections() {
        const now = Date.now();

        for (const [connectionId, pool] of this.pools.entries()) {
            const toRemove: number[] = [];

            for (let i = 0; i < pool.length; i++) {
                const conn = pool[i];
                if (!conn.inUse && now - conn.lastUsed.getTime() > this.idleTimeout) {
                    await conn.connector.disconnect();
                    toRemove.push(i);
                }
            }

            // Remove from pool
            const newPool = pool.filter((_, i) => !toRemove.includes(i));
            this.pools.set(connectionId, newPool);
        }
    }

    /**
     * Close all connections for a specific connection ID
     */
    async closeAll(connectionId: string) {
        const pool = this.pools.get(connectionId);
        if (!pool) return;

        for (const conn of pool) {
            await conn.connector.disconnect();
        }

        this.pools.delete(connectionId);
    }
}

export const connectionPool = new ConnectionPoolManager();
