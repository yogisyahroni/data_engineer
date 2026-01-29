
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

export const getPipelineQueue = () => {
    if (!queueInstance) {
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
    }
    return queueInstance;
};
// Backwards compatibility export if needed (but we will update usages)
// export const pipelineQueue = getPipelineQueue(); - NO, this would trigger it.
