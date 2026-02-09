-- Migration: Create RLS Policies Table
CREATE TABLE IF NOT EXISTS rls_policies (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Scope
    workspace_id VARCHAR(255) NOT NULL,
    connection_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(255) NOT NULL,
    -- Target (Apply to WHO?)
    role VARCHAR(50),
    -- 'VIEWER', 'EDITOR', 'ADMIN', 'OWNER'
    user_id VARCHAR(255),
    -- Specific user override
    -- Rule
    condition TEXT NOT NULL,
    -- SQL WHERE clause
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rls_workspace_conn ON rls_policies(workspace_id, connection_id);
CREATE INDEX IF NOT EXISTS idx_rls_table ON rls_policies(connection_id, table_name);
CREATE INDEX IF NOT EXISTS idx_rls_active ON rls_policies(is_active);
-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_rls_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS rls_updated_at_trigger ON rls_policies;
CREATE TRIGGER rls_updated_at_trigger BEFORE
UPDATE ON rls_policies FOR EACH ROW EXECUTE FUNCTION update_rls_updated_at();