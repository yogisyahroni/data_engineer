-- Migration: Add role column to users table
-- Date: 2026-02-09
-- Description: Adds role-based access control (RBAC) support
-- Add role column with default value 'user'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
-- Update existing users to have 'user' role if NULL
UPDATE users
SET role = 'user'
WHERE role IS NULL;
-- Optional: Set first user as admin (modify email as needed)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
-- Add comment
COMMENT ON COLUMN users.role IS 'User role: user, admin';