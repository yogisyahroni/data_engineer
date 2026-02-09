-- Migration: Add password reset fields to users table
-- Created: 2026-02-08
-- Purpose: Support password reset workflow

-- Add password reset fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Create index on password reset token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Note: These fields are used for password reset functionality
-- Tokens are single-use and expire after 1 hour
