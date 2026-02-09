-- Migration: Create RBAC (Role-Based Access Control) tables
-- Task: TASK-079 - Granular Permission System
-- Created: 2026-02-09
-- Permissions table: Define all available permissions in the system
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    -- e.g., 'query:create', 'dashboard:edit', 'connection:delete'
    resource VARCHAR(50) NOT NULL,
    -- e.g., 'query', 'dashboard', 'connection', 'user'
    action VARCHAR(50) NOT NULL,
    -- e.g., 'create', 'read', 'update', 'delete', 'execute', 'share'
    description TEXT,
    -- Human-readable description
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource, action) -- Prevent duplicate permission definitions
);
-- Roles table: Define custom roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    -- e.g., 'Admin', 'Analyst', 'Viewer', 'Editor'
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    -- TRUE for built-in roles (Admin, Viewer, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Role-Permission mapping: Many-to-many relationship
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);
-- User-Role mapping: Many-to-many relationship
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        -- Who assigned this role
        PRIMARY KEY (user_id, role_id)
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
-- Insert default permissions
INSERT INTO permissions (name, resource, action, description)
VALUES -- Query permissions
    (
        'query:create',
        'query',
        'create',
        'Create new queries'
    ),
    ('query:read', 'query', 'read', 'View queries'),
    (
        'query:update',
        'query',
        'update',
        'Edit queries'
    ),
    (
        'query:delete',
        'query',
        'delete',
        'Delete queries'
    ),
    (
        'query:execute',
        'query',
        'execute',
        'Execute queries'
    ),
    (
        'query:share',
        'query',
        'share',
        'Share queries with others'
    ),
    -- Dashboard permissions
    (
        'dashboard:create',
        'dashboard',
        'create',
        'Create new dashboards'
    ),
    (
        'dashboard:read',
        'dashboard',
        'read',
        'View dashboards'
    ),
    (
        'dashboard:update',
        'dashboard',
        'update',
        'Edit dashboards'
    ),
    (
        'dashboard:delete',
        'dashboard',
        'delete',
        'Delete dashboards'
    ),
    (
        'dashboard:share',
        'dashboard',
        'share',
        'Share dashboards with others'
    ),
    (
        'dashboard:export',
        'dashboard',
        'export',
        'Export dashboards to PDF/PPTX'
    ),
    -- Connection permissions
    (
        'connection:create',
        'connection',
        'create',
        'Create new database connections'
    ),
    (
        'connection:read',
        'connection',
        'read',
        'View database connections'
    ),
    (
        'connection:update',
        'connection',
        'update',
        'Edit database connections'
    ),
    (
        'connection:delete',
        'connection',
        'delete',
        'Delete database connections'
    ),
    (
        'connection:test',
        'connection',
        'test',
        'Test database connections'
    ),
    -- User management permissions
    (
        'user:create',
        'user',
        'create',
        'Create new users'
    ),
    (
        'user:read',
        'user',
        'read',
        'View user profiles'
    ),
    (
        'user:update',
        'user',
        'update',
        'Edit user profiles'
    ),
    ('user:delete', 'user', 'delete', 'Delete users'),
    -- Role management permissions
    (
        'role:create',
        'role',
        'create',
        'Create custom roles'
    ),
    ('role:read', 'role', 'read', 'View roles'),
    ('role:update', 'role', 'update', 'Edit roles'),
    ('role:delete', 'role', 'delete', 'Delete roles'),
    (
        'role:assign',
        'role',
        'assign',
        'Assign roles to users'
    ),
    -- Audit Log permissions
    ('audit:read', 'audit', 'read', 'View audit logs'),
    -- RLS Policy permissions
    (
        'rls:create',
        'rls',
        'create',
        'Create RLS policies'
    ),
    ('rls:read', 'rls', 'read', 'View RLS policies'),
    (
        'rls:update',
        'rls',
        'update',
        'Edit RLS policies'
    ),
    (
        'rls:delete',
        'rls',
        'delete',
        'Delete RLS policies'
    ) ON CONFLICT (name) DO NOTHING;
-- Insert default system roles
INSERT INTO roles (name, description, is_system_role)
VALUES (
        'Admin',
        'Full system access with all permissions',
        TRUE
    ),
    (
        'Editor',
        'Can create and edit queries and dashboards',
        TRUE
    ),
    (
        'Analyst',
        'Can execute queries and view dashboards',
        TRUE
    ),
    (
        'Viewer',
        'Read-only access to dashboards and queries',
        TRUE
    ) ON CONFLICT (name) DO NOTHING;
-- Assign all permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r
    CROSS JOIN permissions p
WHERE r.name = 'Admin' ON CONFLICT (role_id, permission_id) DO NOTHING;
-- Assign Editor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r,
    permissions p
WHERE r.name = 'Editor'
    AND p.name IN (
        'query:create',
        'query:read',
        'query:update',
        'query:delete',
        'query:execute',
        'query:share',
        'dashboard:create',
        'dashboard:read',
        'dashboard:update',
        'dashboard:delete',
        'dashboard:share',
        'dashboard:export',
        'connection:read',
        'connection:test'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;
-- Assign Analyst permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r,
    permissions p
WHERE r.name = 'Analyst'
    AND p.name IN (
        'query:read',
        'query:execute',
        'dashboard:read',
        'dashboard:export',
        'connection:read'
    ) ON CONFLICT (role_id, permission_id) DO NOTHING;
-- Assign Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
    p.id
FROM roles r,
    permissions p
WHERE r.name = 'Viewer'
    AND p.name IN ('query:read', 'dashboard:read') ON CONFLICT (role_id, permission_id) DO NOTHING;
-- Assign Admin role to all existing users (backward compatibility)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id,
    r.id
FROM users u
    CROSS JOIN roles r
WHERE r.name = 'Admin' ON CONFLICT (user_id, role_id) DO NOTHING;
COMMENT ON TABLE permissions IS 'System permissions for granular access control';
COMMENT ON TABLE roles IS 'User roles for grouping permissions';
COMMENT ON TABLE role_permissions IS 'Mapping between roles and permissions';
COMMENT ON TABLE user_roles IS 'Mapping between users and roles';