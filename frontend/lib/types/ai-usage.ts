// AI Usage & Analytics Types

export interface UsageStats {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    successRate: number;
    avgDuration: number;
    byProvider: Record<string, {
        requests: number;
        tokens: number;
        cost: number;
    }>;
    byType: Record<string, {
        requests: number;
        tokens: number;
        cost: number;
    }>;
    topModels: Array<{
        model: string;
        provider: string;
        requests: number;
        tokens: number;
        cost: number;
    }>;
    dailyTrends: Array<{
        date: string;
        requests: number;
        tokens: number;
        cost: number;
    }>;
}

export interface AIUsageRequest {
    id: string;
    userId: string;
    workspaceId?: string;
    provider: string;
    model: string;
    requestType: 'chat' | 'query' | 'formula' | 'explain';
    prompt?: string;
    response?: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    actualCost?: number;
    durationMs?: number;
    status: 'success' | 'error' | 'rate_limited' | 'budget_exceeded';
    errorMessage?: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

export interface AIBudget {
    id: string;
    userId?: string;
    workspaceId?: string;
    name: string;
    budgetType: 'user' | 'workspace';
    period: 'hourly' | 'daily' | 'monthly' | 'total';
    maxTokens?: number;
    maxCost?: number;
    maxRequests?: number;
    currentTokens: number;
    currentCost: number;
    currentRequests: number;
    resetAt?: string;
    alertThreshold: number; // 0-100 percentage
    alertSent: boolean;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface BudgetAlert {
    id: string;
    budgetId: string;
    userId: string;
    alertType: 'threshold' | 'exceeded';
    percentageUsed: number;
    message: string;
    sentAt: string;
    acknowledged: boolean;
}

export interface RateLimitConfig {
    id: string;
    name: string;
    limitType: 'provider' | 'user' | 'global';
    target?: string; // Provider name for 'provider' type
    requestsPerMinute: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    enabled: boolean;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RateLimitViolation {
    id: string;
    userId: string;
    configId: string;
    provider?: string;
    endpoint?: string;
    requestsMade: number;
    limitValue: number;
    windowType: 'minute' | 'hour' | 'day';
    violatedAt: string;
}

// Request/Response types
export interface GetUsageStatsParams {
    period?: 'daily' | 'weekly' | 'monthly' | 'all';
}

export interface GetRequestHistoryParams {
    limit?: number;
    offset?: number;
    provider?: string;
    status?: string;
    requestType?: string;
}

export interface RequestHistoryResponse {
    data: AIUsageRequest[];
    total: number;
    limit: number;
    offset: number;
}

export interface CreateBudgetRequest {
    name: string;
    budgetType: 'user' | 'workspace';
    period: 'hourly' | 'daily' | 'monthly' | 'total';
    maxTokens?: number;
    maxCost?: number;
    maxRequests?: number;
    alertThreshold?: number;
}

export interface UpdateBudgetRequest {
    name?: string;
    maxTokens?: number;
    maxCost?: number;
    maxRequests?: number;
    alertThreshold?: number;
    enabled?: boolean;
}

export interface CreateRateLimitRequest {
    name: string;
    limitType: 'provider' | 'user' | 'global';
    target?: string;
    requestsPerMinute: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    description?: string;
}

export interface UpdateRateLimitRequest {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    enabled?: boolean;
    description?: string;
}
