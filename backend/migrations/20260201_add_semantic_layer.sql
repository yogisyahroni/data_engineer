-- Migration: Add Semantic Layer Tables
-- Date: 2026-02-01
-- Description: Create tables for semantic layer (models, dimensions, metrics, relationships)
-- 1. Semantic Models Table
CREATE TABLE IF NOT EXISTS semantic_models (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    data_source_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workspace_id, name)
);
-- 2. Semantic Dimensions Table
CREATE TABLE IF NOT EXISTS semantic_dimensions (
    id VARCHAR(255) PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES semantic_models(id) ON DELETE CASCADE,
    UNIQUE(model_id, name)
);
-- 3. Semantic Metrics Table
CREATE TABLE IF NOT EXISTS semantic_metrics (
    id VARCHAR(255) PRIMARY KEY,
    model_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    formula TEXT NOT NULL,
    description TEXT,
    format VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES semantic_models(id) ON DELETE CASCADE,
    UNIQUE(model_id, name)
);
-- 4. Semantic Relationships Table
CREATE TABLE IF NOT EXISTS semantic_relationships (
    id VARCHAR(255) PRIMARY KEY,
    from_model_id VARCHAR(255) NOT NULL,
    to_model_id VARCHAR(255) NOT NULL,
    from_column VARCHAR(255) NOT NULL,
    to_column VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    -- 'one_to_one', 'one_to_many', 'many_to_one', 'many_to_many'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_model_id) REFERENCES semantic_models(id) ON DELETE CASCADE,
    FOREIGN KEY (to_model_id) REFERENCES semantic_models(id) ON DELETE CASCADE
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_semantic_models_workspace ON semantic_models(workspace_id);
CREATE INDEX IF NOT EXISTS idx_semantic_models_data_source ON semantic_models(data_source_id);
CREATE INDEX IF NOT EXISTS idx_semantic_dimensions_model ON semantic_dimensions(model_id);
CREATE INDEX IF NOT EXISTS idx_semantic_metrics_model ON semantic_metrics(model_id);
CREATE INDEX IF NOT EXISTS idx_semantic_relationships_from ON semantic_relationships(from_model_id);
CREATE INDEX IF NOT EXISTS idx_semantic_relationships_to ON semantic_relationships(to_model_id);
-- Comments for documentation
COMMENT ON TABLE semantic_models IS 'Semantic models represent business-friendly views of data sources';
COMMENT ON TABLE semantic_dimensions IS 'Dimensions are columns that can be used for grouping and filtering';
COMMENT ON TABLE semantic_metrics IS 'Metrics are calculated fields (aggregations, formulas)';
COMMENT ON TABLE semantic_relationships IS 'Relationships define joins between semantic models';