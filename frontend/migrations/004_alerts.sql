-- Migration: Create Alerts Table
-- Description: Stores monitoring rules for the Alert Engine.
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    connection_id VARCHAR(255) NOT NULL,
    -- Which DB to monitor
    table_name VARCHAR(255) NOT NULL,
    -- Logic Definition matches AggregationRequest
    metric_column VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL DEFAULT 'sum',
    -- sum, count, avg...
    operator VARCHAR(10) NOT NULL,
    -- '>', '<', '=', '!='
    threshold DECIMAL(20, 2) NOT NULL,
    -- Notification
    email_to VARCHAR(255) NOT NULL,
    -- Management
    name VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    -- Context
    segment VARCHAR(50) DEFAULT 'ALL' -- For RLS simulation
);
-- Indexes for Scheduler performance
CREATE INDEX idx_alerts_active ON alerts(active);