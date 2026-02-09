-- Migration: Add OAuth provider fields to users table
-- Created: 2026-02-08
-- Purpose: Support OAuth authentication (Google, GitHub, etc.)

-- Add OAuth provider fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);

-- Create indexes for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);
CREATE INDEX IF NOT EXISTS idx_users_provider_provider_id ON users(provider, provider_id);

-- Make password nullable for OAuth users
-- Note: Users who sign up via OAuth don't need passwords initially
-- They can set a password later if they want to use email/password login

-- Note: Existing users will have NULL provider fields, which is fine
-- Only OAuth users will have provider and provider_id set
