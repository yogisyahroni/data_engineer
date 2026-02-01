-- Create semantic_requests table for AI semantic operations audit log
CREATE TABLE IF NOT EXISTS semantic_requests (
    id VARCHAR(36) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "workspaceId" VARCHAR(36),
    "providerId" VARCHAR(36) NOT NULL,
    "dataSourceId" VARCHAR(36),
    "conversationId" VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('explain', 'query', 'formula', 'chat')),
    prompt TEXT NOT NULL,
    context JSONB,
    response TEXT,
    "generatedSql" TEXT,
    "generatedFormula" TEXT,
    "isValid" BOOLEAN DEFAULT TRUE,
    error TEXT,
    "tokensUsed" INTEGER DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    "durationMs" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_semantic_requests_user_id ON semantic_requests("userId");
CREATE INDEX IF NOT EXISTS idx_semantic_requests_workspace_id ON semantic_requests("workspaceId");
CREATE INDEX IF NOT EXISTS idx_semantic_requests_provider_id ON semantic_requests("providerId");
CREATE INDEX IF NOT EXISTS idx_semantic_requests_data_source_id ON semantic_requests("dataSourceId");
CREATE INDEX IF NOT EXISTS idx_semantic_requests_conversation_id ON semantic_requests("conversationId");
CREATE INDEX IF NOT EXISTS idx_semantic_requests_type ON semantic_requests(type);
CREATE INDEX IF NOT EXISTS idx_semantic_requests_created_at ON semantic_requests("createdAt");
-- Add foreign key constraints (if tables exist)
-- ALTER TABLE semantic_requests ADD CONSTRAINT fk_semantic_requests_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE semantic_requests ADD CONSTRAINT fk_semantic_requests_workspace FOREIGN KEY ("workspaceId") REFERENCES workspaces(id) ON DELETE CASCADE;
-- ALTER TABLE semantic_requests ADD CONSTRAINT fk_semantic_requests_provider FOREIGN KEY ("providerId") REFERENCES ai_providers(id) ON DELETE CASCADE;
-- ALTER TABLE semantic_requests ADD CONSTRAINT fk_semantic_requests_data_source FOREIGN KEY ("dataSourceId") REFERENCES data_sources(id) ON DELETE CASCADE;