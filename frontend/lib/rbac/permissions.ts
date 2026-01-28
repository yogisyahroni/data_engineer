/**
 * RBAC Permission Definitions
 * 
 * Maps permissions to roles that are allowed to perform them
 */

export type Role = 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';

export type Permission =
    // Read permissions
    | 'workspace:view'
    | 'connection:view'
    | 'dashboard:view'
    | 'query:view'
    | 'metric:view'

    // Write permissions (EDITOR+)
    | 'query:create'
    | 'query:edit'
    | 'query:delete'
    | 'dashboard:create'
    | 'dashboard:edit'
    | 'dashboard:delete'
    | 'metric:create'
    | 'metric:edit'
    | 'metric:delete'

    // Admin permissions (ADMIN+)
    | 'connection:create'
    | 'connection:edit'
    | 'connection:delete'
    | 'workspace:manage'
    | 'member:invite'
    | 'member:remove'
    | 'member:view'

    // Owner-only permissions
    | 'workspace:delete'
    | 'workspace:transfer'
    | 'owner:assign';

/**
 * Permission matrix: maps each permission to allowed roles
 */
export const PERMISSIONS: Record<Permission, Role[]> = {
    // Read permissions - All roles
    'workspace:view': ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'],
    'connection:view': ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'],
    'dashboard:view': ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'],
    'query:view': ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'],
    'metric:view': ['VIEWER', 'EDITOR', 'ADMIN', 'OWNER'],

    // Write permissions - EDITOR and above
    'query:create': ['EDITOR', 'ADMIN', 'OWNER'],
    'query:edit': ['EDITOR', 'ADMIN', 'OWNER'],
    'query:delete': ['EDITOR', 'ADMIN', 'OWNER'],
    'dashboard:create': ['EDITOR', 'ADMIN', 'OWNER'],
    'dashboard:edit': ['EDITOR', 'ADMIN', 'OWNER'],
    'dashboard:delete': ['EDITOR', 'ADMIN', 'OWNER'],
    'metric:create': ['EDITOR', 'ADMIN', 'OWNER'],
    'metric:edit': ['EDITOR', 'ADMIN', 'OWNER'],
    'metric:delete': ['EDITOR', 'ADMIN', 'OWNER'],

    // Admin permissions - ADMIN and OWNER only
    'connection:create': ['ADMIN', 'OWNER'],
    'connection:edit': ['ADMIN', 'OWNER'],
    'connection:delete': ['ADMIN', 'OWNER'],
    'workspace:manage': ['ADMIN', 'OWNER'],
    'member:invite': ['ADMIN', 'OWNER'],
    'member:remove': ['ADMIN', 'OWNER'],
    'member:view': ['ADMIN', 'OWNER'],

    // Owner-only permissions
    'workspace:delete': ['OWNER'],
    'workspace:transfer': ['OWNER'],
    'owner:assign': ['OWNER'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    return PERMISSIONS[permission]?.includes(role) ?? false;
}

/**
 * Check if a role can perform any of the given permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role can perform all of the given permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: Role): Permission[] {
    return Object.entries(PERMISSIONS)
        .filter(([_, roles]) => roles.includes(role))
        .map(([permission]) => permission as Permission);
}
