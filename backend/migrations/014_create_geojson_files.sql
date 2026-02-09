-- 014_create_geojson_files.sql
-- Migration untuk GeoJSON file storage
-- Created: 2026-02-09
-- Purpose: Storage untuk uploaded GeoJSON files untuk map visualizations (TASK-036 to TASK-039)
-- Drop existing objects jika ada (idempotent migration)
DROP TRIGGER IF EXISTS trigger_geojson_files_updated_at ON geojson_files;
DROP FUNCTION IF EXISTS update_geojson_files_updated_at();
DROP TABLE IF EXISTS geojson_files CASCADE;
CREATE TABLE geojson_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    -- in bytes
    feature_count INTEGER DEFAULT 0,
    -- number of features in GeoJSON
    bbox JSONB,
    -- bounding box [[minLng, minLat], [maxLng, maxLat]]
    geojson_data JSONB NOT NULL,
    -- full GeoJSON FeatureCollection
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Index for user-based filtering
CREATE INDEX idx_geojson_files_user_id ON geojson_files(user_id);
-- Index for name search
CREATE INDEX idx_geojson_files_name ON geojson_files USING gin(to_tsvector('english', name));
-- GIN index for bbox queries (spatial filtering)
CREATE INDEX idx_geojson_files_bbox ON geojson_files USING gin(bbox jsonb_path_ops);
-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_geojson_files_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_geojson_files_updated_at BEFORE
UPDATE ON geojson_files FOR EACH ROW EXECUTE FUNCTION update_geojson_files_updated_at();
-- Comments untuk documentation
COMMENT ON TABLE geojson_files IS 'Storage for uploaded GeoJSON files for map visualizations';
COMMENT ON COLUMN geojson_files.bbox IS 'Bounding box format: [[minLng, minLat], [maxLng, maxLat]]';
COMMENT ON COLUMN geojson_files.geojson_data IS 'Full GeoJSON FeatureCollection object';
COMMENT ON COLUMN geojson_files.feature_count IS 'Number of features for performance optimization';