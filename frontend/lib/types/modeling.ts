// Modeling API Types
// Purpose: TypeScript types for Modeling API (metric definitions for governance)

export interface ModelDefinition {
    id: string;
    name: string;
    description: string;
    type: 'table' | 'view' | 'query';
    sourceTable?: string;
    sourceQuery?: string;
    workspaceId: string;
    createdBy: string;
    metadata?: Record<string, any>;
    metrics?: MetricDefinition[];
    createdAt: string;
    updatedAt: string;
}

export interface MetricDefinition {
    id: string;
    name: string;
    description: string;
    formula: string;
    modelId?: string;
    dataType: 'number' | 'currency' | 'percentage' | 'count' | 'decimal';
    format?: string;
    aggregationType?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct';
    workspaceId: string;
    createdBy: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

// Request Types

export interface CreateModelDefinitionRequest {
    name: string;
    description?: string;
    type: 'table' | 'view' | 'query';
    sourceTable?: string;
    sourceQuery?: string;
    metadata?: Record<string, any>;
}

export interface UpdateModelDefinitionRequest {
    name?: string;
    description?: string;
    type?: 'table' | 'view' | 'query';
    sourceTable?: string;
    sourceQuery?: string;
    metadata?: Record<string, any>;
}

export interface CreateMetricDefinitionRequest {
    name: string;
    description?: string;
    formula: string;
    modelId?: string;
    dataType: 'number' | 'currency' | 'percentage' | 'count' | 'decimal';
    format?: string;
    aggregationType?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct';
    metadata?: Record<string, any>;
}

export interface UpdateMetricDefinitionRequest {
    name?: string;
    description?: string;
    formula?: string;
    modelId?: string;
    dataType?: 'number' | 'currency' | 'percentage' | 'count' | 'decimal';
    format?: string;
    aggregationType?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'count_distinct';
    metadata?: Record<string, any>;
}
