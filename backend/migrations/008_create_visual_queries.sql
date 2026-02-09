-- Create visual_queries table
CREATE TABLE IF NOT EXISTS "VisualQuery" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    connection_id TEXT NOT NULL REFERENCES "Connection"(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL REFERENCES "Collection"(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    config JSONB NOT NULL,
    generated_sql TEXT,
    tags TEXT [],
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Indexes for performance
CREATE INDEX idx_visual_query_user_id ON "VisualQuery"(user_id);
CREATE INDEX idx_visual_query_collection_id ON "VisualQuery"(collection_id);
CREATE INDEX idx_visual_query_connection_id ON "VisualQuery"(connection_id);
CREATE INDEX idx_visual_query_created_at ON "VisualQuery"(created_at DESC);
CREATE INDEX idx_visual_query_config ON "VisualQuery" USING GIN(config);
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_visual_query_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER visual_query_updated_at BEFORE
UPDATE ON "VisualQuery" FOR EACH ROW EXECUTE FUNCTION update_visual_query_updated_at();