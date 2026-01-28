export interface CacheEntry {
    data: any[];
    timestamp: number;
    expiresAt: number;
}

export class QueryCacheManager {
    private static cache: Record<string, CacheEntry> = {};
    private static DEFAULT_TTL = 300000; // 5 minutes standard

    /**
     * Generates a unique key based on SQL and connection
     */
    private static generateKey(connectionId: string, sql: string): string {
        return `${connectionId}:${Buffer.from(sql).toString('base64').substring(0, 50)}`;
    }

    static get(connectionId: string, sql: string): any[] | null {
        const key = this.generateKey(connectionId, sql);
        const entry = this.cache[key];

        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            delete this.cache[key];
            return null;
        }

        return entry.data;
    }

    static set(connectionId: string, sql: string, data: any[], ttlMs = this.DEFAULT_TTL): void {
        const key = this.generateKey(connectionId, sql);
        this.cache[key] = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttlMs,
        };
    }

    static clear(): void {
        this.cache = {};
    }
}
