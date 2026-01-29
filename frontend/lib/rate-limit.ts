
import { redis } from './db/redis';

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

const WINDOW_SIZE_SECONDS = 60;
const MAX_REQUESTS = 100; // 100 requests per minute per IP

export async function rateLimit(identifier: string, limit = MAX_REQUESTS, window = WINDOW_SIZE_SECONDS): Promise<RateLimitResult> {
    if (!redis) {
        // Fallback: If Redis is down/missing, we fail open (allow traffic) to prevent outage
        return { success: true, limit, remaining: limit, reset: Date.now() };
    }

    const key = `ratelimit:${identifier}`;
    const now = Date.now();

    try {
        // Simple Fixed Window Counter
        // In production, use a Lua script or sliding window for better accuracy.
        // For this phase, atomic INCR + EXPIRE is sufficient.

        const requests = await redis.incr(key);

        if (requests === 1) {
            await redis.expire(key, window);
        }

        const ttl = await redis.ttl(key);
        const reset = now + (ttl * 1000);

        return {
            success: requests <= limit,
            limit,
            remaining: Math.max(0, limit - requests),
            reset
        };
    } catch (error) {
        console.error('[RateLimit] Error:', error);
        return { success: true, limit, remaining: limit, reset: now };
    }
}
