-- ========================================
-- Migration: 008_audit_logs_table
-- Purpose: Comprehensive audit logging for compliance and security
-- Author: InsightEngine Team
-- Date: 2026-02-09
-- ========================================
-- Create audit_logs table for tracking all user actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    -- User Information (denormalized for retention)
    user_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        username VARCHAR(255),
        -- Kept even if user deleted
        -- Action Details
        action VARCHAR(50) NOT NULL,
        -- CREATE, READ, UPDATE, DELETE, EXECUTE, LOGIN, LOGOUT
        resource_type VARCHAR(100) NOT NULL,
        -- dashboards, queries, connections, users, etc
        resource_id INTEGER,
        -- ID of the affected resource
        resource_name VARCHAR(255),
        -- Name of resource (denormalized)
        -- Change Tracking
        old_value JSONB,
        -- Previous state (for UPDATE/DELETE)
        new_value JSONB,
        -- New state (for CREATE/UPDATE)
        -- Request Context
        ip_address VARCHAR(45),
        -- IPv4 or IPv6
        user_agent TEXT,
        metadata JSONB,
        -- Additional context (execution_time, error_code, etc)
        -- Timestamp
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_date ON audit_logs(resource_type, resource_id, created_at DESC);
-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all user actions and system events';
COMMENT ON COLUMN audit_logs.action IS 'Type of action: CREATE, READ, UPDATE, DELETE, EXECUTE, LOGIN, LOGOUT';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected: dashboards, queries, connections, users, etc';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous state (JSON) before change - for UPDATE/DELETE operations';
COMMENT ON COLUMN audit_logs.new_value IS 'New state (JSON) after change - for CREATE/UPDATE operations';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context: execution_time, error_code, request_id, etc';
-- ========================================
-- Retention Policy (Future Enhancement)
-- ========================================
-- Note: For compliance, audit logs should be retained for minimum 90 days
-- Consider implementing:
-- 1. Partition by month for performance
-- 2. Archive old logs to cold storage
-- 3. Auto-delete logs older than retention period (e.g., 1 year)
-- ========================================