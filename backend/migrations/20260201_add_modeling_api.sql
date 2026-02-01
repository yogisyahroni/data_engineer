-- Migration: Add Modeling API Tables
-- Purpose: Centralized metric and model definitions for governance
-- Date: 2026-02-01
-- Table 1: Model Definitions
CREATE TABLE IF NOT EXISTS model_definitions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('table', 'view', 'query')),
    source_table VARCHAR(255),
    source_query TEXT,
    workspace_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_workspace_model UNIQUE(workspace_id, name)
);
-- Indexes for model_definitions
CREATE INDEX IF NOT EXISTS idx_model_definitions_workspace ON model_definitions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_model_definitions_type ON model_definitions(type);
CREATE INDEX IF NOT EXISTS idx_model_definitions_created_by ON model_definitions(created_by);
-- Table 2: Metric Definitions
CREATE TABLE IF NOT EXISTS metric_definitions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    formula TEXT NOT NULL,
    model_id VARCHAR(36),
    data_type VARCHAR(50) NOT NULL CHECK (
        data_type IN (
            'number',
            'currency',
            'percentage',
            'count',
            'decimal'
        )
    ),
    format VARCHAR(50),
    aggregation_type VARCHAR(50) CHECK (
        aggregation_type IN (
            'sum',
            'avg',
            'count',
            'min',
            'max',
            'count_distinct'
        )
    ),
    workspace_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_workspace_metric UNIQUE(workspace_id, name),
    CONSTRAINT fk_metric_model FOREIGN KEY (model_id) REFERENCES model_definitions(id) ON DELETE
    SET NULL
);
-- Indexes for metric_definitions
CREATE INDEX IF NOT EXISTS idx_metric_definitions_workspace ON metric_definitions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_metric_definitions_model ON metric_definitions(model_id);
CREATE INDEX IF NOT EXISTS idx_metric_definitions_type ON metric_definitions(data_type);
CREATE INDEX IF NOT EXISTS idx_metric_definitions_created_by ON metric_definitions(created_by);
-- Comments
COMMENT ON TABLE model_definitions IS 'Stores data model metadata for centralized governance';
COMMENT ON TABLE metric_definitions IS 'Stores metric definitions for reusability and consistency';
COMMENT ON COLUMN model_definitions.type IS 'Type of model: table, view, or query';
COMMENT ON COLUMN metric_definitions.formula IS 'SQL formula for metric calculation (e.g., SUM(revenue))';
COMMENT ON COLUMN metric_definitions.data_type IS 'Data type for display formatting';