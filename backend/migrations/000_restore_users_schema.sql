-- RESTORE USER SCHEMA (Because 001-007 migrations are missing)
-- This file creates the necessary tables for Authentication and Connections.
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    -- Bcrypt hash
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 2. CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- postgres, mysql, etc
    host VARCHAR(255),
    port INTEGER,
    database VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    -- AES-256 Encrypted
    is_active BOOLEAN DEFAULT true,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 3. SEED DEMO USER
-- Email: demo@spectra.id
-- Password: password123
INSERT INTO users (id, email, name, password)
VALUES (
        'user_clrdemo00001',
        -- Custom ID or UUID (using String to match Go type)
        'demo@spectra.id',
        'Demo User',
        '$2b$10$s/Vhm9oCryGa3CdchYMs1.0deE4SmC4khXd5pgSvawVZ6DaR71M9a'
    ) ON CONFLICT (email) DO NOTHING;