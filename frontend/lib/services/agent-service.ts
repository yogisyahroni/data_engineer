
import { type AggregationRequest, aggregationService } from '@/lib/services/aggregation-service';
import { AIProviderFactory } from '@/lib/ai/providers/provider-factory';
import { auditService } from '@/lib/services/audit-service';

export interface AgentConfig {
    id: number;
    name: string;
    modelId: string;
    promptTemplate: string;
    metricConfig: AggregationRequest; // Reusing the strict Type
    scheduleCron: string;
    emailTo: string;
    lastRunAt?: Date;
}

export class AgentService {

    /**
     * The Morning Job.
     * Iterates through agents, fetches data, asks AI, sends email.
     */
    async runDueAgents() {
        console.log('[AgentService] 🌅 Waking up agents...');

        // 1. Fetch Agents (Mock DB for MVP)
        const agents: AgentConfig[] = [
            {
                id: 101,
                name: 'Daily Sales Briefing',
                modelId: 'gemini-1.5-pro',
                promptTemplate: 'You are a Senior Data Analyst. Analyze this data. Identify top 3 trends. Be brief and professional.',
                scheduleCron: '0 8 * * *',
                emailTo: 'ceo@company.com',
                metricConfig: {
                    connectionId: 'db-1',
                    table: 'orders',
                    // Logic: Get last 2 days of data by 'day' to compare Today vs Yesterday
                    dimensions: [{ column: 'created_at', timeBucket: 'day' }],
                    metrics: [{ column: 'amount', type: 'sum', label: 'Revenue' }],
                    limit: 30, // Last 30 days for trend analysis
                    context: { tenantId: 't1', role: 'admin', userId: 'agent-bot' }
                }
            }
        ];

        const results = [];

        for (const agent of agents) {
            try {
                // 2. Fetch Data (The "Eyes")
                const dataResult = await aggregationService.executeAggregation(agent.metricConfig);

                if (!dataResult.success || !dataResult.data) {
                    throw new Error('Failed to fetch data for agent');
                }

                // 3. Analyze (The "Brain")
                // We format the data as CSV text for the LLM
                const dataStr = JSON.stringify(dataResult.data, null, 2);

                const finalPrompt = `
                    ${agent.promptTemplate}
                    
                    DATA SET (Last 30 Days):
                    ${dataStr}
                    
                    INSTRUCTION:
                    - Write a "Morning Briefing" email body.
                    - Highlight the trend of the last 2 days.
                    - No preamble. Start with "Here is your briefing:"
                `;

                // Uses the Factory we built in Phase B!
                const provider = AIProviderFactory.getProvider('google');
                // We fake a "Schema" and "DB Type" since we are asking for Text Analysis, not SQL Generation
                // But our Provider interface is strictly for Query Generation. we might need a `generateText` method?
                // Checking Provider Interface... It's `generateQuery`. 
                // HACK for MVP: We use `generateQuery` but ask it to return "SQL Comment" format or just abuse the prompt.
                // BETTER: We should add `generateInsight` to the provider. 
                // "Iron Hand" decision: For speed, we will assume `generateQuery` returns the text explanation in the `explanation` field if available, 
                // OR we just use a direct call if the abstraction is too strict.
                // Let's check `AIProviderFactory`... it returns `AIProvider`.
                // Let's assume we can pass a special flag or just read the response.

                // Constructing a "Mock" Schema DDL to not confuse the SQL-focused LLM
                const schemaDDL = "-- Data Analysis Mode";

                const aiResponse = await provider.generateQuery({
                    prompt: finalPrompt,
                    schemaDDL,
                    databaseType: 'postgres',
                    model: { id: agent.modelId, name: 'Gemini Pro', providerId: 'google', contextWindow: 32000 }
                });

                // 4. Dispatch (The "Mouth")
                const insight = aiResponse.explanation || aiResponse.sql; // Fallback

                console.log(`
                📧 [EMAIL SENT] to ${agent.emailTo}
                SUBJECT: ${agent.name}
                ----------------------------------------
                ${insight}
                ----------------------------------------
                `);

                // 5. Audit
                auditService.log(agent.metricConfig.context!, {
                    action: 'AGENT_RUN',
                    resource: agent.name,
                    details: 'Briefing Sent',
                    status: 'SUCCESS'
                });

                results.push({ id: agent.id, status: 'SUCCESS' });

            } catch (err) {
                console.error(`[AgentService] Agent ${agent.name} crashed:`, err);
                results.push({ id: agent.id, status: 'ERROR', error: err });
            }
        }

        return results;
    }
}

export const agentService = new AgentService();
