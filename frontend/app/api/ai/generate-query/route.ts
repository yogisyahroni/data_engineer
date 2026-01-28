import { NextRequest, NextResponse } from 'next/server';
import { AIProviderFactory } from '@/lib/ai/providers/provider-factory';
import { AIRequest } from '@/lib/ai/providers/base-provider';
import { db } from '@/lib/db';
import { ConnectorFactory } from '@/lib/connectors/connector-factory'; // Ensure this exists from Phase 9.1
import { buildQueryGenerationPrompt } from '@/lib/ai/prompts';
import { validateGeneratedSql, sanitizeSqlOutput } from '@/lib/ai/sql-safety';

/**
 * POST /api/ai/generate-query
 * Generate SQL query from natural language with schema awareness and safety checks.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, connectionId, provider = 'groq', model } = body;

        if (!prompt || !connectionId) {
            return NextResponse.json(
                { error: 'Missing required fields: prompt, connectionId' },
                { status: 400 }
            );
        }

        // 1. Fetch connection details
        const connection = await db.connection.findUnique({
            where: { id: connectionId },
        });

        if (!connection) {
            return NextResponse.json(
                { error: 'Connection not found' },
                { status: 404 }
            );
        }

        // 2. Fetch Schema Context
        // We use the ConnectorFactory to get the right connector instance
        // Then assume fetchSchema() is available.
        // NOTE: fetching schema on every query might be slow. 
        // OPTIMIZATION: Cache schema in a variable or DB model.
        // For MVP Phase 2.2, we fetch live or handle error gracefully.
        let schemaInfo;
        try {
            // Re-hydrate connection config with password/creds
            // NOTE: db.connection result might need mapping to ConnectionConfig
            // depending on how prisma stores it.
            // Assuming we have a helper or safe mapping.
            // For now, simpler approach: if schema is missing, AI guesses.
            const connector = ConnectorFactory.create(connection as any);
            schemaInfo = await connector.fetchSchema();
        } catch (err) {
            console.warn('[AI] Failed to fetch schema for context:', err);
            // Proceed without schema (hallucination risk, but better than crash)
        }

        // 3. Build Prompt
        const systemPrompt = buildQueryGenerationPrompt({
            schema: schemaInfo,
            dialect: connection.type,
            userPrompt: prompt
        });

        // 4. Call LLM
        const aiProvider = AIProviderFactory.getProvider(provider);
        const modelId = model || getDefaultModel(provider);

        // We override the 'prompt' in AIRequest with our full constructed prompt
        // or we pass system prompt if the provider supports it.
        // BaseProvider in Phase 2.1 might just take 'prompt'.
        // Let's pass the FULL prompt as the user prompt for now to ensure context inclusion.
        const aiResult = await aiProvider.generateQuery({
            prompt: systemPrompt,
            schemaDDL: '', // Deprecated/Unused in favor of injected prompt
            databaseType: connection.type,
            model: {
                id: modelId,
                name: modelId,
                description: '',
                providerId: provider
            }
        });

        // 5. Sanitize & Validate
        const sanitizedSql = sanitizeSqlOutput(aiResult.sql);
        const validation = validateGeneratedSql(sanitizedSql);

        if (!validation.valid) {
            // Fix intent? Or just fail?
            // For now, return error so user knows AI messed up.
            return NextResponse.json({
                success: false,
                error: `Unsafe SQL Generated: ${validation.error}`,
                raw: sanitizedSql
            }, { status: 422 });
        }

        return NextResponse.json({
            success: true,
            data: sanitizedSql,
            metadata: {
                provider,
                model: modelId,
                connectionType: connection.type,
                schemaUsed: !!schemaInfo
            },
        });

    } catch (error: any) {
        console.error('[AI Generate Query] Error:', error);
        return NextResponse.json(
            {
                error: error.message || 'Failed to generate query',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

function getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
        groq: 'llama-3.1-70b-versatile',
        openai: 'gpt-4o-mini',
        gemini: 'gemini-1.5-flash',
        google: 'gemini-1.5-flash',
        openrouter: 'meta-llama/llama-3.1-70b-instruct',
    };
    return defaults[provider] || 'gpt-4o-mini';
}
