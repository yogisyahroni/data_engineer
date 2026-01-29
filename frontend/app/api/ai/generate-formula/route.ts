import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db as prisma } from '@/lib/db';
import { buildFormulaSystemPrompt, buildFormulaUserPrompt, parseFormulaResponse } from '@/lib/ai/formula-prompt';
import { validateExpression } from '@/lib/semantic/expression-validator';
import { settingsRepo } from '@/lib/repositories/settings-repo';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { prompt, modelId } = body;

        if (!prompt || !modelId) {
            return NextResponse.json(
                { error: 'prompt and modelId are required' },
                { status: 400 }
            );
        }

        // 1. Load model context
        const model = await prisma.modelDefinition.findUnique({
            where: { id: modelId },
            include: {
                virtualMetrics: true
            }
        });

        if (!model) {
            return NextResponse.json({ error: 'Model not found' }, { status: 404 });
        }

        // 2. Get schema for available columns (if tableName exists)
        let availableColumns: string[] = [];
        if (model.tableName && model.connectionId) {
            // In a real implementation, query the schema
            // For now, we'll leave it empty or you can integrate with your schema introspection
            // availableColumns = await getTableColumns(model.connectionId, model.tableName);
        }

        // 3. Get AI provider settings (Global System Settings)
        const aiConfig = await settingsRepo.get('ai_config');

        if (!aiConfig?.provider || !aiConfig.apiKey) {
            return NextResponse.json(
                { error: 'AI provider not configured. Please configure in Settings.' },
                { status: 400 }
            );
        }

        // 4. Build prompt
        const systemPrompt = buildFormulaSystemPrompt();
        const userPrompt = buildFormulaUserPrompt({
            modelName: model.name,
            tableName: model.tableName || undefined,
            availableColumns,
            existingMetrics: model.virtualMetrics.map((m: any) => ({
                name: m.name,
                expression: m.expression,
                description: m.description || undefined
            })),
            userPrompt: prompt
        });

        // 5. Call AI provider
        let aiResponse: string;
        const provider = aiConfig.provider;
        const apiKey = aiConfig.apiKey;
        const aiModel = aiConfig.model;
        const baseUrl = aiConfig.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';

        if (provider === 'openai' || provider === 'openai-compatible' || provider === 'openrouter') {
            const endpoint = `${baseUrl}/chat/completions`;
            console.log(`[AI] Calling ${provider} at ${endpoint} with model ${aiModel}`);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://insightengine.ai', 'X-Title': 'InsightEngine' } : {})
                },
                body: JSON.stringify({
                    model: aiModel || 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI provider request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            aiResponse = data.choices[0].message.content;
        } else if (provider === 'anthropic') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: aiModel || 'claude-3-haiku-20240307',
                    max_tokens: 500,
                    system: systemPrompt,
                    messages: [
                        { role: 'user', content: userPrompt }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('AI provider request failed');
            }

            const data = await response.json();
            aiResponse = data.content[0].text;
        } else if (provider === 'gemini' || provider === 'google') {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${aiModel || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: systemPrompt + '\n\n' + userPrompt }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 500
                        }
                    })
                }
            );

            if (!response.ok) {
                throw new Error('AI provider request failed');
            }

            const data = await response.json();
            aiResponse = data.candidates[0].content.parts[0].text;
        } else {
            return NextResponse.json(
                { error: 'Unsupported AI provider' },
                { status: 400 }
            );
        }

        // 6. Parse response
        const { expression, explanation } = parseFormulaResponse(aiResponse);

        // 7. Validate expression
        const metricNames = model.virtualMetrics.map((m: any) => m.name);
        const validation = validateExpression(expression, metricNames);

        if (!validation.valid) {
            return NextResponse.json({
                error: 'Generated expression failed validation',
                details: validation.error,
                expression,
                explanation
            }, { status: 400 });
        }

        // 8. Return validated expression
        return NextResponse.json({
            expression,
            explanation,
            dependencies: validation.dependencies
        });

    } catch (error: any) {
        console.error('Formula generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate formula', details: error.message },
            { status: 500 }
        );
    }
}
