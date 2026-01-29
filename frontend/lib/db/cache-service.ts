
import { redis } from './redis';

const DEFAULT_TTL = 300; // 5 minutes

export const cacheService = {
    /**
     * Retrieve a value from the cache.
     * Return null if cache is disabled or key not found.
     */
    async get<T>(key: string): Promise<T | null> {
        if (!redis) return null;

        try {
            const data = await redis.get(key);
            if (!data) return null;
            return JSON.parse(data) as T;
        } catch (error) {
            console.error(`[Cache] Get Error (${key}):`, error);
            return null;
        }
    },

    /**
     * Set a value in the cache.
     * Fails silently if cache is disabled.
     */
    async set(key: string, value: any, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
        if (!redis) return;

        try {
            const serialized = JSON.stringify(value);
            await redis.setex(key, ttlSeconds, serialized);
        } catch (error) {
            console.error(`[Cache] Set Error (${key}):`, error);
        }
    },

    /**
     * Delete a key from the cache.
     */
    async del(key: string): Promise<void> {
        if (!redis) return;
        try {
            await redis.del(key);
        } catch (error) {
            console.error(`[Cache] Del Error (${key}):`, error);
        }
    },

    /**
     * Invalidate keys matching a pattern.
     * WARNING: Use carefully, SCAN is expensive on large datasets.
     */
    async invalidate(pattern: string): Promise<void> {
        if (!redis) return;

        try {
            const stream = redis.scanStream({ match: pattern });
            stream.on('data', async (keys) => {
                if (keys.length) {
                    if (!redis) return;
                    const pipeline = (redis as NonNullable<typeof redis>).pipeline();
                    keys.forEach((key: string) => pipeline.del(key));
                    await pipeline.exec();
                }
            });
        } catch (error) {
            console.error(`[Cache] Invalidate Error (${pattern}):`, error);
        }
    }
};
