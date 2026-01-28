import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIRequest, AIResponse, IAIProvider } from "./base-provider";

export class GeminiProvider implements IAIProvider {
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    async generateQuery(request: AIRequest): Promise<AIResponse> {
        const model = this.genAI.getGenerativeModel({ model: request.model.id });

        const systemPrompt = `
            Anda adalah "Expert Data & Business Analyst" tingkat senior.
            Tugas Anda adalah menerima instruksi bahasa manusia dan mengubahnya menjadi SQL query yang valid untuk database ${request.databaseType}.

            GUNAKAN SKEMA DDL BERIKUT:
            ${request.schemaDDL || "Tidak ada skema yang disediakan."}

            ATURAN:
            1. Selalu sertakan LIMIT untuk keamanan (maks 100 jika tidak diminta).
            2. Gunakan sintaks yang spesifik untuk ${request.databaseType}.
            3. Respon HARUS selalu dalam format JSON valid.

            STRUKTUR JSON:
            {
                "sql": "SELECT ...",
                "explanation": "Penjelasan singkat...",
                "confidence": 0.95,
                "suggestedVisualization": "bar" | "line" | "pie" | "table" | "metric",
                "insights": ["insight 1", "insight 2"]
            }
        `;

        const result = await model.generateContent([systemPrompt, request.prompt]);
        const responseText = result.response.text();

        try {
            // Clean markdown blocks if present
            const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson) as AIResponse;
        } catch (e) {
            console.error("[GeminiProvider] Failed to parse AI response:", responseText);
            throw new Error("AI returned invalid JSON format.");
        }
    }

    async analyzeResults(data: any[], sql: string): Promise<string[]> {
        // Implementation for analyzing raw data results
        return ["Insight analysis not yet implemented for live data."];
    }
}
