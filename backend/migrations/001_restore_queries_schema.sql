-- RESTORE QUERY SCHEMA (Part 2)
-- Dependencies: users, connections (Created in 000)
-- 1. COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT,
    -- Loose reference if workspaces table missing
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 2. SAVED QUERIES TABLE (SQL)
CREATE TABLE IF NOT EXISTS saved_queries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    sql TEXT NOT NULL,
    ai_prompt TEXT,
    connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visualization_config JSONB,
    tags TEXT [],
    pinned BOOLEAN DEFAULT false,
    business_metric_id TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 3. VISUAL QUERIES TABLE (Builder)
CREATE TABLE IF NOT EXISTS visual_queries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    config JSONB NOT NULL,
    generated_sql TEXT,
    tags TEXT [],
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- 4. COLLECTION ITEMS (Junction/Poly)
CREATE TABLE IF NOT EXISTS collection_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    -- 'pipeline', 'dataflow', 'query'
    item_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);