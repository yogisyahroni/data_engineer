-- Migration: Create RLS Policies Table
-- Description: Row-Level Security policies for filtering data based on user context
-- Version: 010
-- Date: 2026-02-09
-- Create rls_policies table
CREATE TABLE IF NOT EXISTS rls_policies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    -- Supports wildcards: "orders_*", "*"
    condition TEXT NOT NULL,
    -- SQL WHERE clause template: "user_id = {{current_user.id}}"
    role_ids JSONB,
    -- Array of role IDs (null = applies to all users)
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    -- Higher priority = applied first
    mode TEXT DEFAULT 'AND',
    -- 'AND' or 'OR' for multiple policies
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rls_policies_connection_id ON rls_policies(connection_id);
CREATE INDEX IF NOT EXISTS idx_rls_policies_table_name ON rls_policies(table_name);
CREATE INDEX IF NOT EXISTS idx_rls_policies_enabled ON rls_policies(enabled);
CREATE INDEX IF NOT EXISTS idx_rls_policies_user_id ON rls_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_rls_policies_role_ids ON rls_policies USING GIN(role_ids);
-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_rls_policies_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER rls_policies_updated_at BEFORE
UPDATE ON rls_policies FOR EACH ROW EXECUTE FUNCTION update_rls_policies_updated_at();
-- Insert example policies for testing (optional)
INSERT INTO rls_policies (
        id,
        name,
        description,
        connection_id,
        table_name,
        condition,
        role_ids,
        enabled,
        priority,
        mode,
        user_id
    )
VALUES (
        'demo-policy-001',
        'Multi-Tenant Isolation',
        'Users can only see data from their own tenant',
        (
            SELECT id
            FROM connections
            LIMIT 1
        ), -- Use first available connection
        'orders', 'tenant_id = ''{{current_user.attributes.tenant_id}}''', '["VIEWER", "EDITOR"]', true,
        10,
        'AND',
        (
            SELECT id
            FROM users
            LIMIT 1
        ) -- Use first available user
    ) ON CONFLICT (id) DO NOTHING;
-- Comments for documentation
COMMENT ON TABLE rls_policies IS 'Row-Level Security policies for data filtering';
COMMENT ON COLUMN rls_policies.table_name IS 'Target table name (supports wildcards like orders_*)';
COMMENT ON COLUMN rls_policies.condition IS 'SQL WHERE clause with template variables like {{current_user.id}}';
COMMENT ON COLUMN rls_policies.role_ids IS 'JSONB array of role IDs this policy applies to (null = all users)';
COMMENT ON COLUMN rls_policies.priority IS 'Higher priority policies are evaluated first';
COMMENT ON COLUMN rls_policies.mode IS 'AND (restrictive) or OR (permissive) when combining policies';