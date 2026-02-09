-- Migration: Add Rate Limiting Enhancements (TASK-009)
-- Date: 2026-02-08
-- Description: Add support for per-endpoint and IP-based rate limiting
-- Add new columns to rate_limit_configs
ALTER TABLE rate_limit_configs
ADD COLUMN IF NOT EXISTS endpoint_pattern VARCHAR(200),
    ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'user';
-- Add comment to clarify scope values
COMMENT ON COLUMN rate_limit_configs.scope IS 'Scope of rate limiting: user, ip, user+ip';
COMMENT ON COLUMN rate_limit_configs.endpoint_pattern IS 'URL pattern for endpoint-specific limits (e.g., /api/auth/*)';
-- Add source_ip column to rate_limit_violations for audit trail
ALTER TABLE rate_limit_violations
ADD COLUMN IF NOT EXISTS source_ip VARCHAR(45);
COMMENT ON COLUMN rate_limit_violations.source_ip IS 'Source IPv4 or IPv6 address that triggered the violation';
-- Create index for faster violation queries by IP
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_source_ip ON rate_limit_violations(source_ip);
-- Create index for endpoint pattern matching
CREATE INDEX IF NOT EXISTS idx_rate_limit_configs_endpoint_pattern ON rate_limit_configs(endpoint_pattern)
WHERE endpoint_pattern IS NOT NULL;
-- Insert default IP-based rate limit configuration (aggressive)
INSERT INTO rate_limit_configs (
        name,
        limit_type,
        scope,
        requests_per_minute,
        enabled,
        description
    )
VALUES (
        'global_ip_limit',
        'global',
        'ip',
        120,
        -- Allow 120 requests per minute per IP (aggressive protection)
        true,
        'Global IP-based rate limit to prevent DDoS attacks and abuse. Applied to all unauthenticated requests.'
    ) ON CONFLICT (name) DO NOTHING;
-- Insert default endpoint-specific limit for auth endpoints (stricter)
INSERT INTO rate_limit_configs (
        name,
        limit_type,
        endpoint_pattern,
        scope,
        requests_per_minute,
        enabled,
        description
    )
VALUES (
        'auth_endpoint_limit',
        'endpoint',
        '/api/auth/*',
        'ip',
        30,
        -- Strict limit for authentication endpoints
        true,
        'Rate limit for authentication endpoints to prevent brute-force attacks. 30 requests per minute per IP.'
    ) ON CONFLICT (name) DO NOTHING;