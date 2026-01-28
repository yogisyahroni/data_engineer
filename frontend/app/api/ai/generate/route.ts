import { type NextRequest, NextResponse } from 'next/server';
import { connectionService } from '@/lib/services/connection-service';
import { AIProviderFactory } from '@/lib/ai/providers/provider-factory';
import { AI_REGISTRY } from '@/lib/ai/registry';
import { PostgresConnector } from '@/lib/db-connectors/postgres-connector';
import { SemanticLayerService } from '@/lib/services/semantic-layer-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, connectionId, aiOptions } = body;

        if (!prompt) {
            return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
        }

        // 1. Get Selected Model & Provider
        const modelId = aiOptions?.modelId || 'gemini-1.5-pro';
        const providerId = aiOptions?.providerId || 'google';

        const selectedModel = AI_REGISTRY
            .flatMap(p => p.models)
            .find(m => m.id === modelId);

        if (!selectedModel) {
            return NextResponse.json({ success: false, error: 'Invalid model selection' }, { status: 400 });
        }

        // 2. Fetch Real Schema Context (DDL) for Accuracy
        let schemaDDL = "-- No schema context available";
        let dbType = "postgres"; // Default

        if (connectionId) {
            const connection = await connectionService.getConnection(connectionId);
            if (connection) {
                dbType = connection.type;
                const schema = await connectionService.fetchSchema(connectionId);
                if (schema) {
                    const helper = new PostgresConnector({
                        host: '', port: 0, database: '', user: ''
                    });
                    schemaDDL = helper.generateDDL(schema);
                }

                // 2.1 Inject Semantic Context (BI Virtual Relationships)
                const semanticContext = await SemanticLayerService.getSemanticContext(connectionId);
                schemaDDL += `\n\n${semanticContext}`;
            }
        }

        // 3. Execute Live AI Call (Industrial Grade)
        try {
            const provider = AIProviderFactory.getProvider(providerId);
            const response = await provider.generateQuery({
                prompt,
                schemaDDL,
                databaseType: dbType,
                model: selectedModel,
            });

            console.log(`[Production AI] Successfully generated query using ${modelId}`);

            return NextResponse.json({
                success: true,
                data: response,
            });
        } catch (aiError) {
            const message = aiError instanceof Error ? aiError.message : "AI Provider Error";
            console.error(`[Production AI] Service Error (${providerId}):`, message);
            return NextResponse.json({
                success: false,
                error: `AI Error: ${message}. Check server logs for API Key configuration.`
            }, { status: 503 });
        }

    } catch (error) {
        console.error('[API] AI Gateway Critical error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
