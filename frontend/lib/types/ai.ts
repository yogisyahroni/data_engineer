// AI Provider types
export interface AIProvider {
    id: string;
    userId: string;
    workspaceId?: string;
    name: string;
    providerType: 'openai' | 'gemini' | 'anthropic' | 'cohere' | 'openrouter' | 'custom';
    baseUrl?: string;
    apiKeyMasked: string; // Masked for display
    model: string;
    isActive: boolean;
    isDefault: boolean;
    config?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

// AI Request types
export interface AIRequest {
    id: string;
    providerId: string;
    userId: string;
    prompt: string;
    context?: Record<string, any>;
    response?: string;
    tokensUsed: number;
    durationMs: number;
    cost: number;
    status: 'success' | 'error' | 'rate_limited';
    error?: string;
    createdAt: string;
}

// AI Generation Request
export interface AIGenerateRequest {
    providerId?: string; // Optional, uses default if not provided
    prompt: string;
    context?: Record<string, any>;
}

// AI Usage Stats
export interface AIUsageStats {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    successfulRequests: number;
    failedRequests: number;
    avgTokensPerRequest: number;
}

// Provider creation/update inputs
export interface CreateAIProviderInput {
    name: string;
    providerType: 'openai' | 'gemini' | 'anthropic' | 'cohere' | 'openrouter' | 'custom';
    baseUrl?: string;
    apiKey: string; // Plaintext, will be encrypted by backend
    model: string;
    isDefault?: boolean;
    config?: Record<string, any>;
}

export interface UpdateAIProviderInput {
    name?: string;
    baseUrl?: string;
    apiKey?: string; // Optional, only if changing
    model?: string;
    isActive?: boolean;
    isDefault?: boolean;
    config?: Record<string, any>;
}

// Provider models by type
export const PROVIDER_MODELS: Record<string, string[]> = {
    openai: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-4-32k',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
        'gpt-3.5-turbo-1106',
        'gpt-3.5-turbo-0125',
    ],
    gemini: [
        'gemini-1.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-pro',
        'gemini-pro-vision',
        'gemini-ultra',
        'gemini-nano',
    ],
    anthropic: [
        'claude-3.5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-opus-latest',
        'claude-3-sonnet-20240229',
        'claude-3-sonnet-latest',
        'claude-3-haiku-20240307',
        'claude-2.1',
        'claude-2.0',
        'claude-instant-1.2',
    ],
    cohere: [
        'command-r-plus',
        'command-r',
        'command-r-08-2024',
        'command',
        'command-light',
        'command-light-nightly',
        'command-nightly',
        'command-xlarge',
    ],
    openrouter: [
        'openai/gpt-4o',
        'openai/gpt-4-turbo',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-opus',
        'google/gemini-pro-1.5',
        'meta-llama/llama-3-70b-instruct',
        'mistralai/mistral-large',
        'cohere/command-r-plus',
        'perplexity/llama-3-sonar-large',
        'deepseek/deepseek-chat',
    ],
    custom: ['any'], // Custom providers can use any model
};
