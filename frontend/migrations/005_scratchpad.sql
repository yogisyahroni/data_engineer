-- Migration: Create Scratchpad Schema
-- Description: A dedicated schema for temporary, user-uploaded tables (CSV uploads).
-- This isolates user data from core application tables.
CREATE SCHEMA IF NOT EXISTS scratchpad;
-- Optional: Grant usage to application user if needed
-- GRANT USAGE ON SCHEMA scratchpad TO app_user;
-- GRANT CREATE ON SCHEMA scratchpad TO app_user;