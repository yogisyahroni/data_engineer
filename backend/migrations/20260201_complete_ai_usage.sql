-- Complete AI Usage Tracking Migration
-- This script completes the migration that partially failed
-- ============================================================================
-- 2. AI Request Audit Trail
CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workspace_id UUID,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    prompt TEXT,
    response TEXT,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    actual_cost DECIMAL(10, 6),
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user ON ai_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace ON ai_requests(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_provider ON ai_requests(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at ON ai_requests(created_at DESC);
-- 3. AI Budget Limits
CREATE TABLE IF NOT EXISTS ai_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    workspace_id UUID,
    name VARCHAR(100) NOT NULL,
    budget_type VARCHAR(20) NOT NULL,
    period VARCHAR(20) NOT NULL,
    max_tokens INTEGER,
    max_cost DECIMAL(10, 2),
    max_requests INTEGER,
    current_tokens INTEGER NOT NULL DEFAULT 0,
    current_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    current_requests INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMP,
    alert_threshold DECIMAL(5, 2) DEFAULT 80.00,
    alert_sent BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_budgets_user ON ai_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_budgets_workspace ON ai_budgets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_budgets_enabled ON ai_budgets(enabled);
-- 4. Budget Alert Notifications
CREATE TABLE IF NOT EXISTS budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL,
    user_id UUID NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    percentage_used DECIMAL(5, 2) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    acknowledged BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user ON budget_alerts(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget ON budget_alerts(budget_id);
-- 5. Rate Limit Violations Log
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    config_id UUID NOT NULL,
    provider VARCHAR(50),
    endpoint VARCHAR(200),
    requests_made INTEGER NOT NULL,
    limit_value INTEGER NOT NULL,
    window_type VARCHAR(20) NOT NULL,
    violated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user ON rate_limit_violations(user_id, violated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_config ON rate_limit_violations(config_id);
-- 6. Usage Statistics Materialized View
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
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_user ON ai_usage_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_workspace ON ai_usage_stats(workspace_id, date DESC);
-- 7. Functions
CREATE OR REPLACE FUNCTION refresh_ai_usage_stats() RETURNS void AS $$ BEGIN REFRESH MATERIALIZED VIEW CONCURRENTLY ai_usage_stats;
END;
$$ LANGUAGE plpgsql;
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
CREATE OR REPLACE FUNCTION update_budget_usage() RETURNS TRIGGER AS $$
DECLARE budget_record RECORD;
BEGIN IF NEW.user_id IS NOT NULL THEN FOR budget_record IN
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
-- 8. Trigger
DROP TRIGGER IF EXISTS trigger_update_budget_usage ON ai_requests;
CREATE TRIGGER trigger_update_budget_usage
AFTER
INSERT ON ai_requests FOR EACH ROW EXECUTE FUNCTION update_budget_usage();
-- Done
SELECT 'AI Usage Tracking Migration Complete!' as status;