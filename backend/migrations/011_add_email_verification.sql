-- Migration: Add email verification fields to users table
-- Created: 2026-02-08
-- Purpose: Support email verification workflow

-- Add email verification fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;

-- Create index on verification token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token);

-- Create index on email_verified for filtering
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Update existing users to be verified (backward compatibility)
-- This assumes existing users were manually verified
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL;

-- Note: New users will have email_verified = FALSE by default
-- and must verify their email before accessing the platform
