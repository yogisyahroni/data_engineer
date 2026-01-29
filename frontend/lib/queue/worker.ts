
import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis';
import { db } from '../db';

// Re-use connection config
const connection = redis ? {
    host: redis.options.host,
    port: redis.options.port,
    password: redis.options.password,
} : {
    host: 'localhost',
    port: 6379,
};

// ... imports
import { applyTransformations, TransformationStep } from '../etl/transformation-engine';
import { validateData, QualityRule } from '../etl/quality-engine';

export const pipelineWorker = new Worker('etl-jobs', async (job: Job) => {
    const { pipelineId, executionId } = job.data;
    console.log(`[Worker] Starting Job ${job.id} for Pipeline ${pipelineId}`);

    const executionLogs: string[] = [`[START] Job ${job.id} started.`];

    try {
        // 1. Update Status to PROCESSING
        await db.jobExecution.update({
            where: { id: executionId },
            data: { status: 'PROCESSING', startedAt: new Date(), logs: executionLogs }
        });

        // 2. Fetch Pipeline Config
        const pipeline = await db.pipeline.findUnique({
            where: { id: pipelineId },
            include: { qualityRules: true }
        });

        if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);

        // 3. EXECUTE PIPELINE (ETL vs ELT)
        console.log(`[Worker] Pipeline Mode: ${pipeline.mode}`);
        executionLogs.push(`[INFO] Pipeline Mode: ${pipeline.mode}`);

        // --- 1. EXTRACTION (Simulated) ---
        // const connector = ConnectorFactory.getConnector(pipeline.sourceType, pipeline.sourceConfig);
        // const rawData = await connector.extractData();
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock Data for Transformation Testing
        let dataBatch = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `User ${i} `, // Intentional space for trim testing
            email: `user${i}@example.com`,
            age: i % 10 === 0 ? null : 20 + (i % 50), // Needs Null handling
            status: i % 2 === 0 ? 'active' : 'inactive'
        }));

        // Add duplicates for validation
        dataBatch.push({ id: 0, name: 'User 0 ', email: 'user0@example.com', age: 20, status: 'active' });

        executionLogs.push(`[EXTRACT] Extracted ${dataBatch.length} rows.`);

        // --- 2. TRANSFORMATION (ETL Mode) ---
        if (pipeline.mode === 'ETL') {
            console.log(`[Worker] ETL Mode: Transforming data in-memory...`);
            executionLogs.push(`[TRANSFORM] Running transformation rules...`);

            const steps = (pipeline.transformationSteps as any) as TransformationStep[] || [];

            if (steps.length > 0) {
                const initialCount = dataBatch.length;
                const startTime = Date.now();

                dataBatch = applyTransformations(dataBatch, steps);

                const duration = Date.now() - startTime;
                const dropped = initialCount - dataBatch.length;

                executionLogs.push(`[TRANSFORM] Applied ${steps.length} rules in ${duration}ms.`);
                if (dropped > 0) executionLogs.push(`[TRANSFORM] Filter/Dedupe dropped ${dropped} rows.`);
            } else {
                executionLogs.push(`[TRANSFORM] No rules defined. Skipping.`);
            }

            await db.jobExecution.update({
                where: { id: executionId },
                data: { logs: executionLogs }
            });
        }

        // --- 2.5 QUALITY CHECK (New in Phase 21) ---
        if (pipeline.qualityRules && pipeline.qualityRules.length > 0) {
            console.log(`[Worker] Running Quality Checks...`);
            executionLogs.push(`[QUALITY] Validating against ${pipeline.qualityRules.length} rules...`);

            const { validData, errors } = validateData(dataBatch, pipeline.qualityRules as QualityRule[]);

            if (errors.length > 0) {
                const errorCount = errors.length;
                const fatalErrors = errors.filter(e => e.severity === 'FAIL');

                executionLogs.push(`[QUALITY] Found ${errorCount} violations.`);
                // Log first 5 errors
                errors.slice(0, 5).forEach(e => {
                    executionLogs.push(`[QUALITY] [${e.severity}] Row ${e.row}, Col '${e.column}': ${e.message}`);
                });
                if (errorCount > 5) executionLogs.push(`[QUALITY] ... and ${errorCount - 5} more.`);

                if (fatalErrors.length > 0) {
                    throw new Error(`Pipeline stopped due to ${fatalErrors.length} fatal quality errors.`);
                }
            } else {
                executionLogs.push(`[QUALITY] All checks passed.`);
            }

            // For now, we continue with validData (which is currently all data in engine impl)
            // Future: filter out bad rows if engine supports it
            dataBatch = validData;
        }

        // --- 3. LOAD ---
        await db.rawData.create({
            data: {
                pipelineId,
                data: { sample: dataBatch.slice(0, 5), count: dataBatch.length }, // Save transformed data summary
                metaKey: "batch_1",
                metaTag: pipeline.mode
            }
        });
        executionLogs.push(`[LOAD] Loaded ${dataBatch.length} rows to RawData table.`);

        if (pipeline.mode === 'ELT') {
            console.log(`[Worker] ELT Mode: Data loaded. Triggering SQL Transformations...`);
            executionLogs.push(`[TRANSFORM] Triggering post-load SQL transformations...`);

            // ELT Logic Placeholder
            await db.jobExecution.update({
                where: { id: executionId },
                data: { logs: executionLogs }
            });
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // --- 4. COMPLETION ---
        const endTime = new Date();
        executionLogs.push(`[SUCCESS] Job completed successfully.`);

        await db.jobExecution.update({
            where: { id: executionId },
            data: {
                status: 'COMPLETED',
                completedAt: endTime,
                durationMs: 2000,
                rowsProcessed: dataBatch.length,
                logs: executionLogs
            }
        });

        // 5. Update Pipeline Metadata
        await db.pipeline.update({
            where: { id: pipelineId },
            data: { lastRunAt: new Date(), lastStatus: 'SUCCESS' }
        });

        console.log(`[Worker] Job ${job.id} Completed`);
    } catch (error: any) {
        console.error(`[Worker] Job ${job.id} Failed:`, error);

        // We can't push to executionLogs comfortably here if we want to include previous logs, 
        // but since executionLogs is in scope, we can append the error.
        executionLogs.push(`[ERROR] ${error.message}`);

        await db.jobExecution.update({
            where: { id: executionId },
            data: {
                status: 'FAILED',
                completedAt: new Date(),
                error: error.message,
                logs: executionLogs
            }
        });

        await db.pipeline.update({
            where: { id: pipelineId },
            data: { lastRunAt: new Date(), lastStatus: 'FAILED' }
        });

        throw error;
    }
}, {
    connection: redis || { host: 'localhost', port: 6379 },
    concurrency: 5 // Process 5 jobs at a time
});

pipelineWorker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});

pipelineWorker.on('failed', (job, err) => {
    console.log(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});
