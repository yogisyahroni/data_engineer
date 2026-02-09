-- Migration: Add username column to users table
-- Created: 2026-02-08
-- Purpose: Support user registration with unique username

-- Add username column
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Note: Existing users will have NULL username, which is fine
-- New registrations will require username
