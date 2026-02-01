// Semantic Layer Types
// Business-friendly data layer for querying using business terms

export interface SemanticModel {
    id: string;
    name: string;
    description: string;
    dataSourceId: string;
    tableName: string;
    workspaceId: string;
    createdBy: string;
    dimensions?: SemanticDimension[];
    metrics?: SemanticMetric[];
    createdAt: string;
    updatedAt: string;
}

export interface SemanticDimension {
    id: string;
    modelId: string;
    name: string; // Business name (e.g., "Customer Name")
    columnName: string; // Technical column name (e.g., "customer_name")
    dataType: 'string' | 'number' | 'date' | 'boolean';
    description: string;
    isHidden: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SemanticMetric {
    id: string;
    modelId: string;
    name: string; // Business name (e.g., "Total Revenue")
    formula: string; // SQL formula (e.g., "SUM(revenue)")
    description: string;
    format?: string; // Display format (e.g., "currency", "percentage")
    createdAt: string;
    updatedAt: string;
}

export interface SemanticRelationship {
    id: string;
    fromModelId: string;
    toModelId: string;
    fromColumn: string;
    toColumn: string;
    relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
    createdAt: string;
    updatedAt: string;
}

// Request/Response types

export interface CreateSemanticModelRequest {
    name: string;
    description: string;
    dataSourceId: string;
    tableName: string;
    dimensions: CreateDimensionRequest[];
    metrics: CreateMetricRequest[];
}

export interface CreateDimensionRequest {
    name: string;
    columnName: string;
    dataType: 'string' | 'number' | 'date' | 'boolean';
    description: string;
    isHidden?: boolean;
}

export interface CreateMetricRequest {
    name: string;
    formula: string;
    description: string;
    format?: string;
}

export interface SemanticQueryRequest {
    modelId: string;
    dimensions: string[]; // Business names
    metrics: string[]; // Business names
    filters?: Record<string, any>;
    limit?: number;
}

export interface SemanticQueryResponse {
    sql: string;
    args: any[];
    dimensions: string[];
    metrics: string[];
    rowCount: number;
    data?: any[]; // Query results (if executed)
}
