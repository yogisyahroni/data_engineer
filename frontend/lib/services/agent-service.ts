
import { type AggregationRequest, aggregationService } from '@/lib/services/aggregation-service';
import { AIProviderFactory } from '@/lib/ai/providers/provider-factory';
import { auditService } from '@/lib/services/audit-service';
import { db } from '@/lib/db';
import { Agent } from '@prisma/client';

export class AgentService {

    /**
     * The Morning Job.
     * Iterates through agents, fetches data, asks AI, sends email.
     */
    async runDueAgents() {
        console.log('[AgentService] 🌅 Waking up agents...');

        // 1. Fetch Active Agents from DB
        const agents = await db.agent.findMany({
            where: { isActive: true }
        });

        const results = [];

        for (const agent of agents) {
            try {
                // Parse metric config from JSON
                // TODO: Validate schema with Zod
                const metricConfig = agent.metricConfig as unknown as AggregationRequest;

                // 2. Fetch Data (The "Eyes")
                const dataResult = await aggregationService.executeAggregation(metricConfig);

                if (!dataResult.success || !dataResult.data) {
                    throw new Error('Failed to fetch data for agent');
                }

                // 3. Analyze (The "Brain")
                // We format the data as CSV text for the LLM
                const dataStr = JSON.stringify(dataResult.data, null, 2);

                const finalPrompt = `
                    ${agent.promptTemplate}
                    
                    DATA SET:
                    ${dataStr}
                    
                    INSTRUCTION:
                    - Write a "Morning Briefing" email body.
                    - Highlight the trend if applicable.
                    - No preamble. Start with "Here is your briefing:"
                `;

                // Uses the Factory
                const provider = AIProviderFactory.getProvider('google'); // TODO: Use agent.modelId to determine provider

                // Construct schema hint
                const schemaDDL = "-- Data Analysis Mode";

                const aiResponse = await provider.generateQuery({
                    prompt: finalPrompt,
                    schemaDDL,
                    databaseType: 'postgres',
                    model: { id: agent.modelId, name: 'Gemini Agent', providerId: 'google', description: 'Agent Model' }
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

                // 5. Audit & Update State
                auditService.log(metricConfig.context || { userId: 'system', tenantId: 'system', role: 'admin' }, {
                    action: 'AGENT_RUN',
                    resource: agent.id, // Use DB ID
                    details: 'Briefing Sent',
                    status: 'SUCCESS'
                });

                await db.agent.update({
                    where: { id: agent.id },
                    data: { lastRunAt: new Date() }
                });

                results.push({ id: agent.id, status: 'SUCCESS' });

            } catch (err: any) {
                console.error(`[AgentService] Agent ${agent.name} crashed:`, err);
                results.push({ id: agent.id, status: 'ERROR', error: err.message });
            }
        }

        return results;
    }
}

export const agentService = new AgentService();
