import OpenAI from "openai";
import { AIRequest, AIResponse, IAIProvider } from "./base-provider";

export class OpenAIProvider implements IAIProvider {
    private client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
    }

    async generateQuery(request: AIRequest): Promise<AIResponse> {
        const systemPrompt = `
            Anda adalah "Expert Data & Business Analyst" tingkat senior.
            Tugas Anda adalah menghasilkan query ${request.databaseType} berdasarkan skema DDL yang diberikan.
            
            DDL SCHEMA:
            ${request.schemaDDL}

            OUTPUT FORMAT: Valid JSON only.
        `;

        const completion = await this.client.chat.completions.create({
            model: request.model.id,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: request.prompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("OpenAI returned empty response.");

        return JSON.parse(content) as AIResponse;
    }

    async analyzeResults(data: any[], sql: string): Promise<string[]> {
        return ["Insight analysis pending."];
    }
}
