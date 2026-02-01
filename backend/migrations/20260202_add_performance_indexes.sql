-- Migration: Add Performance Indexes
-- Date: 2026-02-02
-- Description: Adds comprehensive indexes for foreign keys and frequently queried columns
-- Expected Impact: 6-10x performance improvement on list/filter queries
-- ============================================================================
-- ============================================================================
-- 1. SavedQuery Indexes
-- ============================================================================
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_saved_query_connection ON "SavedQuery"(connection_id);
CREATE INDEX IF NOT EXISTS idx_saved_query_collection ON "SavedQuery"(collection_id);
CREATE INDEX IF NOT EXISTS idx_saved_query_user ON "SavedQuery"(user_id);
-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_saved_query_user_created ON "SavedQuery"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_query_collection_created ON "SavedQuery"(collection_id, created_at DESC);
-- Partial index for pinned queries
CREATE INDEX IF NOT EXISTS idx_saved_query_pinned ON "SavedQuery"(pinned)
WHERE pinned = true;
-- GIN index for tag array search
CREATE INDEX IF NOT EXISTS idx_saved_query_tags ON "SavedQuery" USING GIN(tags);
COMMENT ON INDEX idx_saved_query_user_created IS 'Optimizes user query list sorted by date';
COMMENT ON INDEX idx_saved_query_tags IS 'Enables fast tag-based search using GIN index';
-- ============================================================================
-- 2. Dashboard & DashboardCard Indexes
-- ============================================================================
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_card_dashboard ON "DashboardCard"(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_card_query ON "DashboardCard"(query_id);
-- Composite indexes for dashboard lists
CREATE INDEX IF NOT EXISTS idx_dashboard_user_created ON "Dashboard"(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_collection_created ON "Dashboard"(collection_id, created_at DESC);
-- Partial index for public dashboards
CREATE INDEX IF NOT EXISTS idx_dashboard_public ON "Dashboard"(is_public)
WHERE is_public = true;
COMMENT ON INDEX idx_dashboard_user_created IS 'Optimizes user dashboard list sorted by date';
COMMENT ON INDEX idx_dashboard_public IS 'Fast lookup for public dashboards';
-- ============================================================================
-- 3. Connection Indexes
-- ============================================================================
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_connection_user ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_workspace ON connections(workspace_id);
-- Status filter index
CREATE INDEX IF NOT EXISTS idx_connection_status ON connections(status);
-- Composite index for active user connections
CREATE INDEX IF NOT EXISTS idx_connection_user_status ON connections(user_id, status);
-- Composite index for workspace connections
CREATE INDEX IF NOT EXISTS idx_connection_workspace_status ON connections(workspace_id, status);
COMMENT ON INDEX idx_connection_user_status IS 'Optimizes filtering user connections by status';
-- ============================================================================
-- 4. AI Usage Request Indexes
-- ============================================================================
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_ai_requests_user ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace ON ai_requests(workspace_id);
-- Composite indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_created ON ai_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace_created ON ai_requests(workspace_id, created_at DESC);
-- Filter indexes
CREATE INDEX IF NOT EXISTS idx_ai_requests_provider ON ai_requests(provider);
CREATE INDEX IF NOT EXISTS idx_ai_requests_type ON ai_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_requests(status);
-- Composite index for provider analytics
CREATE INDEX IF NOT EXISTS idx_ai_requests_provider_created ON ai_requests(provider, created_at DESC);
-- Composite index for workspace analytics
CREATE INDEX IF NOT EXISTS idx_ai_requests_workspace_provider ON ai_requests(workspace_id, provider, created_at DESC);
COMMENT ON INDEX idx_ai_requests_user_created IS 'Optimizes user AI usage history queries';
COMMENT ON INDEX idx_ai_requests_workspace_provider IS 'Optimizes workspace AI analytics by provider';
-- ============================================================================
-- 5. AI Budget Indexes
-- ============================================================================
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_ai_budgets_user ON ai_budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_budgets_workspace ON ai_budgets(workspace_id);
-- Partial indexes for active budgets
CREATE INDEX IF NOT EXISTS idx_ai_budgets_user_enabled ON ai_budgets(user_id, enabled)
WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_budgets_workspace_enabled ON ai_budgets(workspace_id, enabled)
WHERE enabled = true;
-- Period filter index
CREATE INDEX IF NOT EXISTS idx_ai_budgets_period ON ai_budgets(period);
-- Composite index for budget type filtering
CREATE INDEX IF NOT EXISTS idx_ai_budgets_type_enabled ON ai_budgets(budget_type, enabled);
COMMENT ON INDEX idx_ai_budgets_user_enabled IS 'Fast lookup for active user budgets';
COMMENT ON INDEX idx_ai_budgets_workspace_enabled IS 'Fast lookup for active workspace budgets';
-- ============================================================================
-- 6. Rate Limit Violation Indexes
-- ============================================================================
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user ON rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_config ON rate_limit_violations(config_id);
-- Composite index for user violation history
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user_violated ON rate_limit_violations(user_id, violated_at DESC);
-- Composite index for config violation tracking
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_config_violated ON rate_limit_violations(config_id, violated_at DESC);
COMMENT ON INDEX idx_rate_limit_violations_user_violated IS 'Optimizes user violation history queries';
-- ============================================================================
-- 7. Budget Alert Indexes
-- ============================================================================
-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_budget_alerts_budget ON budget_alerts(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user ON budget_alerts(user_id);
-- Partial index for unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_ack ON budget_alerts(user_id, acknowledged)
WHERE acknowledged = false;
-- Composite index for alert history
CREATE INDEX IF NOT EXISTS idx_budget_alerts_user_sent ON budget_alerts(user_id, sent_at DESC);
COMMENT ON INDEX idx_budget_alerts_user_ack IS 'Fast lookup for unacknowledged user alerts';
-- ============================================================================
-- 8. Rate Limit Config Indexes
-- ============================================================================
-- Composite index for enabled configs by type
CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_type_enabled ON rate_limit_configs(limit_type, enabled)
WHERE enabled = true;
-- Index for target lookup
CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_target ON rate_limit_configs(target)
WHERE target IS NOT NULL;
COMMENT ON INDEX idx_rate_limit_configs_type_enabled IS 'Fast lookup for active rate limit configs by type';
-- ============================================================================
-- 9. Query Result Indexes (if table exists)
-- ============================================================================
-- Check if query_results table exists and add indexes
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'query_results'
) THEN CREATE INDEX IF NOT EXISTS idx_query_results_query ON query_results(query_id);
CREATE INDEX IF NOT EXISTS idx_query_results_user ON query_results(user_id);
CREATE INDEX IF NOT EXISTS idx_query_results_created ON query_results(created_at DESC);
END IF;
END $$;
-- ============================================================================
-- 10. Collection Indexes (if table exists)
-- ============================================================================
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename = 'collections'
) THEN CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_created ON collections(user_id, created_at DESC);
END IF;
END $$;
-- ============================================================================
-- 11. Analyze Tables for Query Planner
-- ============================================================================
-- Update statistics for query planner optimization
ANALYZE "SavedQuery";
ANALYZE "Dashboard";
ANALYZE "DashboardCard";
ANALYZE connections;
ANALYZE ai_requests;
ANALYZE ai_budgets;
ANALYZE rate_limit_violations;
ANALYZE budget_alerts;
ANALYZE rate_limit_configs;
-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'SavedQuery' ORDER BY indexname;
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_requests' ORDER BY indexname;
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_budgets' ORDER BY indexname;
-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_saved_query_connection;
-- DROP INDEX IF EXISTS idx_saved_query_collection;
-- DROP INDEX IF EXISTS idx_saved_query_user;
-- DROP INDEX IF EXISTS idx_saved_query_user_created;
-- DROP INDEX IF EXISTS idx_saved_query_collection_created;
-- DROP INDEX IF EXISTS idx_saved_query_pinned;
-- DROP INDEX IF EXISTS idx_saved_query_tags;
-- DROP INDEX IF EXISTS idx_dashboard_card_dashboard;
-- DROP INDEX IF EXISTS idx_dashboard_card_query;
-- DROP INDEX IF EXISTS idx_dashboard_user_created;
-- DROP INDEX IF EXISTS idx_dashboard_collection_created;
-- DROP INDEX IF EXISTS idx_dashboard_public;
-- DROP INDEX IF EXISTS idx_connection_user;
-- DROP INDEX IF EXISTS idx_connection_workspace;
-- DROP INDEX IF EXISTS idx_connection_status;
-- DROP INDEX IF EXISTS idx_connection_user_status;
-- DROP INDEX IF EXISTS idx_connection_workspace_status;
-- DROP INDEX IF EXISTS idx_ai_requests_user;
-- DROP INDEX IF EXISTS idx_ai_requests_workspace;
-- DROP INDEX IF EXISTS idx_ai_requests_user_created;
-- DROP INDEX IF EXISTS idx_ai_requests_workspace_created;
-- DROP INDEX IF EXISTS idx_ai_requests_provider;
-- DROP INDEX IF EXISTS idx_ai_requests_type;
-- DROP INDEX IF EXISTS idx_ai_requests_status;
-- DROP INDEX IF EXISTS idx_ai_requests_provider_created;
-- DROP INDEX IF EXISTS idx_ai_requests_workspace_provider;
-- DROP INDEX IF EXISTS idx_ai_budgets_user;
-- DROP INDEX IF EXISTS idx_ai_budgets_workspace;
-- DROP INDEX IF EXISTS idx_ai_budgets_user_enabled;
-- DROP INDEX IF EXISTS idx_ai_budgets_workspace_enabled;
-- DROP INDEX IF EXISTS idx_ai_budgets_period;
-- DROP INDEX IF EXISTS idx_ai_budgets_type_enabled;
-- DROP INDEX IF EXISTS idx_rate_limit_violations_user;
-- DROP INDEX IF EXISTS idx_rate_limit_violations_config;
-- DROP INDEX IF EXISTS idx_rate_limit_violations_user_violated;
-- DROP INDEX IF EXISTS idx_rate_limit_violations_config_violated;
-- DROP INDEX IF EXISTS idx_budget_alerts_budget;
-- DROP INDEX IF EXISTS idx_budget_alerts_user;
-- DROP INDEX IF EXISTS idx_budget_alerts_user_ack;
-- DROP INDEX IF EXISTS idx_budget_alerts_user_sent;
-- DROP INDEX IF EXISTS idx_rate_limit_configs_type_enabled;
-- DROP INDEX IF EXISTS idx_rate_limit_configs_target;
-- Done
SELECT 'Performance Indexes Migration Complete! Added 35+ indexes.' as status;