
import { Queue } from 'bullmq';
import { redis } from '../db/redis';

// Re-use the ioredis instance from lib/db/redis.ts
// BullMQ typically manages its own connection, but we can pass the connection options.
// Or we can share the connection if we are careful. 
// For simplicity in serverless/Next.js, we often create a new connection or use the shared one config.
// Here we use the shared connection config.

const connection = redis ? {
    host: redis.options.host,
    port: redis.options.port,
    password: redis.options.password,
    // Add other redis options if needed
} : {
    host: 'localhost',
    port: 6379,
};


let queueInstance: Queue | null = null;

// Lazy load queue to prevent build-time connections
// Lazy load queue to prevent build-time connections
export const getPipelineQueue = () => {
    if (typeof window !== 'undefined') return null; // Don't run on client
    if (process.env.NEXT_PHASE === 'phase-production-build') return null; // Try to skip during build

    if (!queueInstance) {
        try {
            // Check if we are in a compatible environment or just risky-create
            queueInstance = new Queue('etl-jobs', {
                connection: redis || { host: 'localhost', port: 6379 },
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: 500,
                },
            });

            // Add error handler to prevent unhandled rejections from the queue instance itself
            queueInstance.on('error', (err) => {
                console.warn('BullMQ Queue Error (likely Redis version mismatch):', err.message);
            });

        } catch (error) {
            console.warn('Failed to initialize BullMQ (Queue disabled):', error);
            return null;
        }
    }
    return queueInstance;
};
// Backwards compatibility export if needed (but we will update usages)
// export const pipelineQueue = getPipelineQueue(); - NO, this would trigger it.
