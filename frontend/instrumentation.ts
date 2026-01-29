
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { pipelineWorker } = await import('./lib/queue/worker');
        console.log('[Instrumentation] implementation worker registered');
    }
}
