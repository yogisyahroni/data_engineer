/**
 * Batch 2 Types: Pipelines, Dataflows, and Ingestion
 * These types match the Go backend models
 */

// ============================================================================
// PIPELINE TYPES
// ============================================================================

export interface Pipeline {
    id: string;
    name: string;
    description: string | null;
    workspaceId: string;
    sourceType: string;
    sourceConfig: string; // JSON string from JSONB
    destinationType: string;
    destinationConfig: string | null; // JSON string from JSONB
    mode: string;
    transformationSteps: string | null; // JSON string from JSONB
    scheduleCron: string | null;
    isActive: boolean;
    lastRunAt: Date | null;
    lastStatus: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface JobExecution {
    id: string;
    pipelineId: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    startedAt: Date;
    completedAt: Date | null;
    durationMs: number | null;
    rowsProcessed: number;
    error: string | null;
}

export interface QualityRule {
    id: string;
    pipelineId: string;
    ruleType: string;
    config: string; // JSON string
    isActive: boolean;
    createdAt: Date;
}

export interface PipelineWithRules extends Pipeline {
    qualityRules: QualityRule[];
}

export interface PipelineStats {
    totalPipelines: number;
    activePipelines: number;
    totalExecutions: number;
    successRate: number;
    recentFailures: JobExecution[];
    executionHeatmap: Array<{ date: string; count: number }>;
}

// ============================================================================
// DATAFLOW TYPES
// ============================================================================

export interface Dataflow {
    id: string;
    name: string;
    description: string | null;
    userId: string;
    schedule: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface DataflowStep {
    id: string;
    dataflowId: string;
    stepOrder: number;
    stepType: string;
    config: string; // JSON string
    createdAt: Date;
}

export interface DataflowRun {
    id: string;
    dataflowId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    startedAt: Date;
    completedAt: Date | null;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// INGESTION TYPES
// ============================================================================

export interface IngestionRequest {
    workspaceId: string;
    sourceType: 'CSV' | 'JSON' | 'API' | 'DATABASE';
    sourceConfig: Record<string, any>;
    targetTable: string;
    mode: 'OVERWRITE' | 'APPEND';
}

export interface IngestionPreviewRequest {
    workspaceId: string;
    sourceType: 'CSV' | 'JSON' | 'API' | 'DATABASE';
    sourceConfig: Record<string, any>;
    limit?: number;
}

export interface IngestionPreview {
    sourceType: string;
    columns: string[];
    rows: Record<string, any>[];
    totalRows: number;
    previewLimit: number;
    detectedTypes: Record<string, string>;
}

export interface IngestionResult {
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    sourceType: string;
    targetTable: string;
    mode: string;
    rowsIngested: number;
    message: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreatePipelineRequest {
    name: string;
    description?: string;
    workspaceId: string;
    sourceType: string;
    sourceConfig: Record<string, any>;
    destinationType: string;
    destinationConfig?: Record<string, any>;
    mode: string;
    transformationSteps?: any[];
    scheduleCron?: string;
}

export interface UpdatePipelineRequest {
    name?: string;
    description?: string;
    sourceType?: string;
    sourceConfig?: Record<string, any>;
    destinationType?: string;
    destinationConfig?: Record<string, any>;
    mode?: string;
    transformationSteps?: any[];
    scheduleCron?: string;
    isActive?: boolean;
}

export interface CreateDataflowRequest {
    name: string;
    description?: string;
    schedule?: string;
    isActive?: boolean;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationParams {
    limit?: number;
    offset?: number;
}

export interface PaginationMeta {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMeta;
}
