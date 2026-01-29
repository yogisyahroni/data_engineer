
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
    redis: Redis | undefined;
};

const getRedisClient = () => {
    if (!process.env.REDIS_URL) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️ REDIS_URL not set in production. Caching will be disabled.');
        }
        return null;
    }

    try {
        const client = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        client.on('connect', () => {
            console.log('Redis connected successfully');
        });

        return client;
    } catch (error) {
        console.error('Failed to initialize Redis client', error);
        return null;
    }
};

export const redis = globalForRedis.redis ?? getRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis || undefined;
