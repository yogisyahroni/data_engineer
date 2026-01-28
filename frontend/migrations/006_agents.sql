-- Migration: Create Agents Table
-- Description: Stores configuration for "Morning Briefing" AI Agents.
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    connection_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- The "Eyes": What data to watch?
    -- Stores JSON matching AggregationRequest (table, metrics, filters)
    metric_config JSONB NOT NULL,
    -- The "Brain": How to analyze?
    prompt_template TEXT NOT NULL DEFAULT 'Analyze the following data and extract top 3 insights.',
    model_id VARCHAR(50) DEFAULT 'gemini-1.5-pro',
    -- Schedule
    schedule_cron VARCHAR(50) DEFAULT '0 8 * * *',
    -- Daily at 8 AM
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ,
    -- Context
    segment VARCHAR(50) DEFAULT 'ALL'
);
CREATE INDEX idx_agents_active ON agents(active);