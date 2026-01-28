import Groq from 'groq-sdk';
import { IAIProvider, AIRequest, AIResponse } from './base-provider';

export class GroqProvider implements IAIProvider {
    private client: Groq;

    constructor(apiKey: string) {
        this.client = new Groq({ apiKey });
    }

    async generateQuery(request: AIRequest): Promise<AIResponse> {
        const systemPrompt = this.buildSystemPrompt(request);
        const userPrompt = `Generate a ${request.databaseType} SQL query for: ${request.prompt}`;

        try {
            const completion = await this.client.chat.completions.create({
                model: request.model.id || 'llama-3.1-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.1,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error('No response from Groq');

            return this.parseResponse(content);
        } catch (error: any) {
            console.error('[Groq] Query generation failed:', error);
            throw new Error(`Groq query generation failed: ${error.message}`);
        }
    }

    async analyzeResults(data: any[], sql: string): Promise<string[]> {
        if (!data || data.length === 0) {
            return ['No data returned from the query.'];
        }

        const sampleData = data.slice(0, 5);
        const prompt = `Analyze these SQL query results and provide 3-5 key insights in plain English:
    
Query: ${sql}

Sample Results (first 5 rows):
${JSON.stringify(sampleData, null, 2)}

Total rows: ${data.length}

Provide insights as a JSON array of strings.`;

        try {
            const completion = await this.client.chat.completions.create({
                model: 'llama-3.1-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a data analyst. Provide clear, actionable insights from query results.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 1000,
                response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content;
            const parsed = JSON.parse(content || '{}');
            return parsed.insights || ['Analysis completed successfully'];
        } catch (error) {
            console.error('[Groq] Result analysis failed:', error);
            return ['Unable to generate insights at this time.'];
        }
    }

    private buildSystemPrompt(request: AIRequest): string {
        return `You are an expert SQL query generator for ${request.databaseType} databases.

${request.schemaDDL ? `DATABASE SCHEMA:\n${request.schemaDDL}\n` : ''}

RULES:
1. Generate ONLY valid ${request.databaseType} SQL syntax
2. Use proper JOINs based on schema relationships
3. Include appropriate WHERE clauses
4. Use aggregations when needed (COUNT, SUM, AVG, etc.)
5. NEVER use DROP, DELETE, UPDATE, or destructive operations
6. Use table aliases for readability
7. Add comments for complex logic

OUTPUT FORMAT (JSON):
{
  "sql": "SELECT ...",
  "explanation": "This query retrieves...",
  "confidence": 0.95,
  "suggestedVisualization": "bar",
  "insights": ["Key insight 1", "Key insight 2"]
}

Confidence scale:
- 0.9-1.0: High confidence, straightforward query
- 0.7-0.9: Medium confidence, some assumptions made
- Below 0.7: Low confidence, ambiguous request`;
    }

    private parseResponse(content: string): AIResponse {
        try {
            const parsed = JSON.parse(content);
            return {
                sql: parsed.sql || '',
                explanation: parsed.explanation || 'No explanation provided',
                confidence: parsed.confidence || 0.5,
                suggestedVisualization: parsed.suggestedVisualization || 'table',
                insights: parsed.insights || [],
            };
        } catch (error) {
            // Fallback if JSON parsing fails
            return {
                sql: content.trim(),
                explanation: 'Generated SQL query',
                confidence: 0.3,
                insights: ['Failed to parse structured response'],
            };
        }
    }
}
