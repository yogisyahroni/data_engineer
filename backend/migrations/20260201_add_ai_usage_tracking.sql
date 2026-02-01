-- Migration: Add AI Usage Tracking and Configurable Rate Limiting
-- Date: 2026-02-01
-- Description: Adds tables for AI request auditing, budget management, and UI-configurable rate limits
-- ============================================================================
-- 1. Rate Limit Configuration (UI-Configurable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limit_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    -- e.g., "openai_user", "gemini_provider", "global_user"
    limit_type VARCHAR(20) NOT NULL,
    -- 'provider', 'user', 'global'
    target VARCHAR(50),
    -- Provider name for 'provider' type, NULL for 'user'/'global'
    requests_per_minute INTEGER NOT NULL DEFAULT 60,
    requests_per_hour INTEGER,
    requests_per_day INTEGER,
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Default rate limit configurations
INSERT INTO rate_limit_configs (
        name,
        limit_type,
        target,
        requests_per_minute,
        requests_per_hour,
        description
    )
VALUES (
        'openai_provider',
        'provider',
        'openai',
        60,
        3600,
        'OpenAI API rate limit'
    ),
    (
        'gemini_provider',
        'provider',
        'gemini',
        60,
        3600,
        'Google Gemini API rate limit'
    ),
    (
        'anthropic_provider',
        'provider',
        'anthropic',
        50,
        3000,
        'Anthropic Claude API rate limit'
    ),
    (
        'cohere_provider',
        'provider',
        'cohere',
        40,
        2400,
        'Cohere API rate limit'
    ),
    (
        'openrouter_provider',
        'provider',
        'openrouter',
        60,
        3600,
        'OpenRouter API rate limit'
    ),
    (
        'custom_provider',
        'provider',
        'custom',
        30,
        1800,
        'Custom provider rate limit'
    ),
    (
        'global_user',
        'user',
        NULL,
        100,
        6000,
        'Global per-user rate limit across all providers'
    );
CREATE INDEX idx_rate_limit_configs_type ON rate_limit_configs(limit_type);
CREATE INDEX idx_rate_limit_configs_target ON rate_limit_configs(target);
-- ============================================================================
-- 2. AI Request Audit Trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    -- 'chat', 'query', 'formula', 'explain'
    prompt TEXT,
    response TEXT,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    actual_cost DECIMAL(10, 6),
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    -- 'success', 'error', 'rate_limited', 'budget_exceeded'
    error_message TEXT,
    metadata JSONB,
    -- Additional context (e.g., data source, filters)
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_requests_user ON ai_requests(user_id, created_at DESC);
CREATE INDEX idx_ai_requests_workspace ON ai_requests(workspace_id, created_at DESC);
CREATE INDEX idx_ai_requests_provider ON ai_requests(provider, created_at DESC);
CREATE INDEX idx_ai_requests_status ON ai_requests(status);
CREATE INDEX idx_ai_requests_created_at ON ai_requests(created_at DESC);
-- ============================================================================
-- 3. AI Budget Limits (UI-Configurable)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    budget_type VARCHAR(20) NOT NULL,
    -- 'user', 'workspace'
    period VARCHAR(20) NOT NULL,
    -- 'hourly', 'daily', 'monthly', 'total'
    max_tokens INTEGER,
    max_cost DECIMAL(10, 2),
    max_requests INTEGER,
    current_tokens INTEGER NOT NULL DEFAULT 0,
    current_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    current_requests INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMP,
    alert_threshold DECIMAL(5, 2) DEFAULT 80.00,
    -- Alert when 80% of budget used
    alert_sent BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, budget_type, period)
);
CREATE INDEX idx_ai_budgets_user ON ai_budgets(user_id);
CREATE INDEX idx_ai_budgets_workspace ON ai_budgets(workspace_id);
CREATE INDEX idx_ai_budgets_enabled ON ai_budgets(enabled);
-- ============================================================================
-- 4. Update Semantic Requests for Token Tracking
-- ============================================================================
ALTER TABLE semantic_requests
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10, 6) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
CREATE INDEX IF NOT EXISTS idx_semantic_requests_tokens ON semantic_requests(total_tokens);
CREATE INDEX IF NOT EXISTS idx_semantic_requests_cost ON semantic_requests(estimated_cost);
-- ============================================================================
-- 5. Budget Alert Notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES ai_budgets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL,
    -- 'threshold', 'exceeded'
    percentage_used DECIMAL(5, 2) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    acknowledged BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_budget_alerts_user ON budget_alerts(user_id, sent_at DESC);
CREATE INDEX idx_budget_alerts_budget ON budget_alerts(budget_id);
-- ============================================================================
-- 6. Rate Limit Violations Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    config_id UUID NOT NULL REFERENCES rate_limit_configs(id) ON DELETE CASCADE,
    provider VARCHAR(50),
    endpoint VARCHAR(200),
    requests_made INTEGER NOT NULL,
    limit_value INTEGER NOT NULL,
    window_type VARCHAR(20) NOT NULL,
    -- 'minute', 'hour', 'day'
    violated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rate_limit_violations_user ON rate_limit_violations(user_id, violated_at DESC);
CREATE INDEX idx_rate_limit_violations_config ON rate_limit_violations(config_id);
-- ============================================================================
-- 7. Usage Statistics Materialized View (for performance)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_usage_stats AS
SELECT user_id,
    workspace_id,
    provider,
    model,
    request_type,
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    AVG(duration_ms) as avg_duration_ms,
    COUNT(
        CASE
            WHEN status = 'success' THEN 1
        END
    ) as successful_requests,
    COUNT(
        CASE
            WHEN status = 'error' THEN 1
        END
    ) as failed_requests,
    COUNT(
        CASE
            WHEN status = 'rate_limited' THEN 1
        END
    ) as rate_limited_requests
FROM ai_requests
GROUP BY user_id,
    workspace_id,
    provider,
    model,
    request_type,
    DATE(created_at);
CREATE INDEX idx_ai_usage_stats_user ON ai_usage_stats(user_id, date DESC);
CREATE INDEX idx_ai_usage_stats_workspace ON ai_usage_stats(workspace_id, date DESC);
-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_ai_usage_stats() RETURNS void AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY ai_usage_stats;
END;
$$ LANGUAGE plpgsql;
-- ============================================================================
-- 8. Triggers for Budget Updates
-- ============================================================================
CREATE OR REPLACE FUNCTION update_budget_usage() RETURNS TRIGGER AS $$
DECLARE budget_record RECORD;
BEGIN -- Update user budget
IF NEW.user_id IS NOT NULL THEN FOR budget_record IN
SELECT *
FROM ai_budgets
WHERE user_id = NEW.user_id
    AND enabled = true
    AND (
        reset_at IS NULL
        OR reset_at > NOW()
    ) LOOP
UPDATE ai_budgets
SET current_tokens = current_tokens + NEW.total_tokens,
    current_cost = current_cost + NEW.estimated_cost,
    current_requests = current_requests + 1,
    updated_at = NOW()
WHERE id = budget_record.id;
-- Check if alert threshold reached
IF budget_record.max_cost IS NOT NULL THEN IF (current_cost + NEW.estimated_cost) / budget_record.max_cost * 100 >= budget_record.alert_threshold
AND budget_record.alert_sent = false THEN -- Insert alert
INSERT INTO budget_alerts (
        budget_id,
        user_id,
        alert_type,
        percentage_used,
        message
    )
VALUES (
        budget_record.id,
        NEW.user_id,
        CASE
            WHEN (current_cost + NEW.estimated_cost) >= budget_record.max_cost THEN 'exceeded'
            ELSE 'threshold'
        END,
        (current_cost + NEW.estimated_cost) / budget_record.max_cost * 100,
        'Budget alert: ' || budget_record.name
    );
-- Mark alert as sent
UPDATE ai_budgets
SET alert_sent = true
WHERE id = budget_record.id;
END IF;
END IF;
END LOOP;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_budget_usage
AFTER
INSERT ON ai_requests FOR EACH ROW EXECUTE FUNCTION update_budget_usage();
-- ============================================================================
-- 9. Budget Reset Function (to be called by cron job)
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_budgets() RETURNS void AS $$ BEGIN -- Reset hourly budgets
UPDATE ai_budgets
SET current_tokens = 0,
    current_cost = 0,
    current_requests = 0,
    alert_sent = false,
    reset_at = NOW() + INTERVAL '1 hour',
    updated_at = NOW()
WHERE period = 'hourly'
    AND (
        reset_at IS NULL
        OR reset_at <= NOW()
    );
-- Reset daily budgets
UPDATE ai_budgets
SET current_tokens = 0,
    current_cost = 0,
    current_requests = 0,
    alert_sent = false,
    reset_at = NOW() + INTERVAL '1 day',
    updated_at = NOW()
WHERE period = 'daily'
    AND (
        reset_at IS NULL
        OR reset_at <= NOW()
    );
-- Reset monthly budgets
UPDATE ai_budgets
SET current_tokens = 0,
    current_cost = 0,
    current_requests = 0,
    alert_sent = false,
    reset_at = NOW() + INTERVAL '1 month',
    updated_at = NOW()
WHERE period = 'monthly'
    AND (
        reset_at IS NULL
        OR reset_at <= NOW()
    );
END;
$$ LANGUAGE plpgsql;
-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- DROP TRIGGER IF EXISTS trigger_update_budget_usage ON ai_requests;
-- DROP FUNCTION IF EXISTS update_budget_usage();
-- DROP FUNCTION IF EXISTS reset_budgets();
-- DROP FUNCTION IF EXISTS refresh_ai_usage_stats();
-- DROP MATERIALIZED VIEW IF EXISTS ai_usage_stats;
-- DROP TABLE IF EXISTS rate_limit_violations;
-- DROP TABLE IF EXISTS budget_alerts;
-- ALTER TABLE semantic_requests DROP COLUMN IF EXISTS prompt_tokens;
-- ALTER TABLE semantic_requests DROP COLUMN IF EXISTS completion_tokens;
-- ALTER TABLE semantic_requests DROP COLUMN IF EXISTS total_tokens;
-- ALTER TABLE semantic_requests DROP COLUMN IF EXISTS estimated_cost;
-- ALTER TABLE semantic_requests DROP COLUMN IF EXISTS duration_ms;
-- DROP TABLE IF EXISTS ai_budgets;
-- DROP TABLE IF EXISTS ai_requests;
-- DROP TABLE IF EXISTS rate_limit_configs;