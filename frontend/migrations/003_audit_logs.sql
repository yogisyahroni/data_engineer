-- Migration: Create Audit Logs Table
-- Description: Stores security and access logs for compliance.
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    segment VARCHAR(50) NOT NULL DEFAULT 'ALL',
    action VARCHAR(50) NOT NULL,
    -- e.g. QUERY_EXECUTE, AGGREGATION, EXPORT
    resource VARCHAR(255) NOT NULL,
    -- e.g. Table Name
    details TEXT,
    status VARCHAR(20) NOT NULL,
    -- SUCCESS, FAILURE
    execution_time_ms INTEGER,
    row_count INTEGER
);
-- Indexes for Fast Search
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_tenant_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
-- Optional: Partitioning by month (Commented out for MVP, enable for scale)
-- CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');