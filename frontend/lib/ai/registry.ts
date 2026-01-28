export interface AIModel {
    id: string;
    name: string;
    description: string;
    providerId: string;
    icon?: string;
}

export interface AIProvider {
    id: string;
    name: string;
    models: AIModel[];
    icon?: string;
}

export const AI_REGISTRY: AIProvider[] = [
    {
        id: 'google',
        name: 'Google AI',
        icon: 'google',
        models: [
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', providerId: 'google', description: 'Deep reasoning and high accuracy' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', providerId: 'google', description: 'Fast and efficient for simple queries' },
        ],
    },
    {
        id: 'openai',
        name: 'OpenAI',
        icon: 'openai',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o', providerId: 'openai', description: 'Most capable and versatile model' },
            { id: 'o1-preview', name: 'o1 Preview', providerId: 'openai', description: 'Advanced reasoning for complex schemas' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', providerId: 'openai', description: 'Affordable and fast' },
        ],
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        icon: 'anthropic',
        models: [
            { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', providerId: 'anthropic', description: 'Exceptional coding and SQL capability' },
            { id: 'claude-3-opus', name: 'Claude 3 Opus', providerId: 'anthropic', description: 'Most powerful flagship model' },
        ],
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        icon: 'deepseek',
        models: [
            { id: 'deepseek-v3', name: 'DeepSeek V3', providerId: 'deepseek', description: 'State-of-the-art open source model' },
        ],
    },
    {
        id: 'mistral',
        name: 'Mistral',
        icon: 'mistral',
        models: [
            { id: 'mistral-large', name: 'Mistral Large', providerId: 'mistral', description: 'Premium reasoning capabilities' },
        ],
    },
    {
        id: 'groq',
        name: 'Groq (Aggregator)',
        icon: 'groq',
        models: [
            { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', providerId: 'groq', description: 'Ultra-low latency generation' },
            { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', providerId: 'groq', description: 'Fast open models' },
        ],
    },
];

export const DEFAULT_AI_MODEL = AI_REGISTRY[0].models[0];
