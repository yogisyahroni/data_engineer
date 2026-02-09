-- Migration: Add metadata column to materialized_views
-- Description: Adds JSONB metadata field for storing primary keys, timestamp columns, and other incremental refresh configuration
-- Date: 2026-02-09
-- Add metadata column to materialized_views table
ALTER TABLE materialized_views
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_materialized_views_metadata ON materialized_views USING GIN (metadata);
-- Add comment for documentation
COMMENT ON COLUMN materialized_views.metadata IS 'Stores configuration for incremental refresh: primary_keys (array), timestamp_column (string), and other metadata';
-- Example metadata structure:
-- {
--   "primary_keys": ["id", "user_id"],
--   "timestamp_column": "updated_at",
--   "custom_config": {...}
-- }