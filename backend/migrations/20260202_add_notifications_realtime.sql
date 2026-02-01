-- Migration: Add Notifications, Activity Logs, and Scheduler Jobs
-- Date: 2026-02-02
-- Description: Adds tables for real-time notifications, activity tracking, and scheduler management
-- ============================================================================
-- 1. Notifications Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'info',
    -- info, success, warning, error
    link VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)
WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
COMMENT ON TABLE notifications IS 'User notifications for real-time updates';
COMMENT ON COLUMN notifications.type IS 'Notification type: info, success, warning, error';
COMMENT ON COLUMN notifications.is_read IS 'Whether the notification has been read';
-- ============================================================================
-- 2. Activity Logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE
    SET NULL,
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        -- created_model, updated_budget, deleted_metric, etc
        entity_type VARCHAR(50) NOT NULL,
        -- model, metric, budget, provider, etc
        entity_id UUID,
        metadata JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
COMMENT ON TABLE activity_logs IS 'Audit trail for user and system activities';
COMMENT ON COLUMN activity_logs.action IS 'Action performed (e.g., created_model, updated_budget)';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of entity affected (e.g., model, metric, budget)';
COMMENT ON COLUMN activity_logs.entity_id IS 'ID of the affected entity';
-- ============================================================================
-- 3. Scheduler Jobs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduler_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    schedule VARCHAR(100) NOT NULL,
    -- Cron expression (e.g., "0 * * * *")
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- active, paused, error
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    last_error TEXT,
    config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_status ON scheduler_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_next_run ON scheduler_jobs(next_run);
CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_name ON scheduler_jobs(name);
COMMENT ON TABLE scheduler_jobs IS 'Scheduled background jobs configuration';
COMMENT ON COLUMN scheduler_jobs.schedule IS 'Cron expression for job schedule';
COMMENT ON COLUMN scheduler_jobs.status IS 'Job status: active, paused, error';
COMMENT ON COLUMN scheduler_jobs.config IS 'Job-specific configuration in JSON format';
-- ============================================================================
-- 4. Insert Default Scheduler Jobs
-- ============================================================================
INSERT INTO scheduler_jobs (name, description, schedule, status, config)
VALUES (
        'budget_reset',
        'Reset AI usage budgets based on their period (hourly, daily, monthly)',
        '0 * * * *',
        -- Every hour
        'active',
        '{"function": "reset_budgets"}'::jsonb
    ),
    (
        'view_refresh',
        'Refresh materialized views for AI usage statistics',
        '0 * * * *',
        -- Every hour
        'active',
        '{"function": "refresh_ai_usage_stats"}'::jsonb
    ),
    (
        'cleanup_old_notifications',
        'Delete read notifications older than 30 days',
        '0 2 * * *',
        -- Daily at 2 AM
        'active',
        '{"days": 30, "read_only": true}'::jsonb
    ),
    (
        'cleanup_old_activity_logs',
        'Archive activity logs older than 90 days',
        '0 3 * * 0',
        -- Weekly on Sunday at 3 AM
        'active',
        '{"days": 90}'::jsonb
    ) ON CONFLICT (name) DO NOTHING;
-- ============================================================================
-- 5. Functions for Cleanup Jobs
-- ============================================================================
-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER, read_only BOOLEAN) RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN IF read_only THEN
DELETE FROM notifications
WHERE is_read = true
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;
ELSE
DELETE FROM notifications
WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
END IF;
GET DIAGNOSTICS deleted_count = ROW_COUNT;
RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
-- Function to cleanup old activity logs
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(days_old INTEGER) RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
DELETE FROM activity_logs
WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
GET DIAGNOSTICS deleted_count = ROW_COUNT;
RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
-- ============================================================================
-- 6. Trigger to Auto-Update updated_at
-- ============================================================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger for notifications
DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_notifications_updated_at BEFORE
UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Trigger for scheduler_jobs
DROP TRIGGER IF EXISTS trigger_scheduler_jobs_updated_at ON scheduler_jobs;
CREATE TRIGGER trigger_scheduler_jobs_updated_at BEFORE
UPDATE ON scheduler_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================================
-- 7. Views for Analytics
-- ============================================================================
-- View for unread notification counts per user
CREATE OR REPLACE VIEW v_unread_notification_counts AS
SELECT user_id,
    COUNT(*) as unread_count,
    COUNT(
        CASE
            WHEN type = 'error' THEN 1
        END
    ) as error_count,
    COUNT(
        CASE
            WHEN type = 'warning' THEN 1
        END
    ) as warning_count,
    MAX(created_at) as latest_notification_at
FROM notifications
WHERE is_read = false
GROUP BY user_id;
-- View for recent activity summary
CREATE OR REPLACE VIEW v_recent_activity_summary AS
SELECT user_id,
    workspace_id,
    action,
    entity_type,
    COUNT(*) as action_count,
    MAX(created_at) as last_action_at
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id,
    workspace_id,
    action,
    entity_type
ORDER BY last_action_at DESC;
-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- DROP VIEW IF EXISTS v_recent_activity_summary;
-- DROP VIEW IF EXISTS v_unread_notification_counts;
-- DROP TRIGGER IF EXISTS trigger_scheduler_jobs_updated_at ON scheduler_jobs;
-- DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON notifications;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP FUNCTION IF EXISTS cleanup_old_activity_logs(INTEGER);
-- DROP FUNCTION IF EXISTS cleanup_old_notifications(INTEGER, BOOLEAN);
-- DROP TABLE IF EXISTS scheduler_jobs;
-- DROP TABLE IF EXISTS activity_logs;
-- DROP TABLE IF EXISTS notifications;
-- Done
SELECT 'Notifications & Real-time Migration Complete!' as status;