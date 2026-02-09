-- Add Options column to connections table for database-specific configurations
-- This supports Snowflake (warehouse, role, schema), BigQuery, and other advanced connectors
-- Add Options column (JSONB for PostgreSQL)
ALTER TABLE connections
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;
-- Add index on options column for better query performance
CREATE INDEX IF NOT EXISTS idx_connections_options ON connections USING GIN (options);
-- Example Options values:
-- Snowflake: {"warehouse": "COMPUTE_WH", "role": "SYSADMIN", "schema": "PUBLIC"}
-- BigQuery: {"project_id": "my-project", "credentials_path": "/path/to/key.json"}
-- MongoDB: {"replica_set": "rs0", "auth_source": "admin", "tls": true}