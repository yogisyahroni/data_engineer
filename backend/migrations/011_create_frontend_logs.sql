-- Migration: Create frontend_logs table
-- Task: Phase 8 - Frontend Logging Infrastructure
-- Created: 2026-02-09
CREATE TABLE IF NOT EXISTS frontend_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        -- Optional user association
        level VARCHAR(10) NOT NULL,
        -- debug, info, warn, error
        operation VARCHAR(100) NOT NULL,
        -- e.g., 'user_login', 'api_call_failed'
        message TEXT NOT NULL,
        -- Human-readable message
        metadata JSONB,
        -- Additional structured data
        user_agent TEXT,
        -- Browser user agent
        url TEXT,
        -- Page URL where log was generated
        ip_address VARCHAR(45),
        -- Client IP address (IPv4/IPv6)
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_frontend_logs_user_id ON frontend_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_frontend_logs_level ON frontend_logs(level);
CREATE INDEX IF NOT EXISTS idx_frontend_logs_operation ON frontend_logs(operation);
CREATE INDEX IF NOT EXISTS idx_frontend_logs_created_at ON frontend_logs(created_at DESC);
-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_frontend_logs_metadata ON frontend_logs USING GIN (metadata);
-- Retention policy: Auto-delete logs older than 30 days
-- This can be run via cron job or manually
-- DELETE FROM frontend_logs WHERE created_at < NOW() - INTERVAL '30 days';
COMMENT ON TABLE frontend_logs IS 'Frontend application logs for debugging and monitoring';
COMMENT ON COLUMN frontend_logs.level IS 'Log level: debug, info, warn, error';
COMMENT ON COLUMN frontend_logs.operation IS 'Operation identifier for grouping related logs';
COMMENT ON COLUMN frontend_logs.metadata IS 'Additional structured data in JSON format';