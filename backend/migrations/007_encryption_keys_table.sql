-- Migration: 007_encryption_keys_table.sql
-- Purpose: Add encryption key versioning table for key rotation support
-- Date: 2026-02-09
-- Create encryption_keys table for key rotation
CREATE TABLE IF NOT EXISTS encryption_keys (
    id VARCHAR(50) PRIMARY KEY,
    key TEXT NOT NULL,
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NULL
);
-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(active)
WHERE active = TRUE;
-- Add audit trail for key rotations
CREATE TABLE IF NOT EXISTS encryption_key_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_key_id VARCHAR(50),
    new_key_id VARCHAR(50) NOT NULL,
    rotated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    rotated_by VARCHAR(255),
    reason TEXT
);
-- Create indexes for rotation history
CREATE INDEX IF NOT EXISTS idx_encryption_key_rotations_new_key ON encryption_key_rotations(new_key_id);
CREATE INDEX IF NOT EXISTS idx_encryption_key_rotations_timestamp ON encryption_key_rotations(rotated_at DESC);