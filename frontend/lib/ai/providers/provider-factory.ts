import { IAIProvider } from "./base-provider";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";
import { GroqProvider } from "./groq-provider";
import { OpenRouterProvider } from "./openrouter-provider";

export class AIProviderFactory {
    static getProvider(providerId: string): IAIProvider {
        switch (providerId) {
            case 'google':
            case 'gemini':
                const geminiKey = process.env.GEMINI_API_KEY;
                if (!geminiKey) throw new Error("GEMINI_API_KEY is not configured.");
                return new GeminiProvider(geminiKey);

            case 'openai':
                const openaiKey = process.env.OPENAI_API_KEY;
                if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured.");
                return new OpenAIProvider(openaiKey);

            case 'groq':
                const groqKey = process.env.GROQ_API_KEY;
                if (!groqKey) throw new Error("GROQ_API_KEY is not configured.");
                return new GroqProvider(groqKey);

            case 'openrouter':
                const openrouterKey = process.env.OPENROUTER_API_KEY;
                if (!openrouterKey) throw new Error("OPENROUTER_API_KEY is not configured.");
                return new OpenRouterProvider(openrouterKey);

            default:
                throw new Error(`Provider ${providerId} is not supported yet.`);
        }
    }
}

