/**
 * RBAC Type Definitions
 * 
 * TypeScript interfaces for Role-Based Access Control system.
 * Matches backend models in backend/models/permission.go
 */

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Permission represents a granular permission in the system
 */
export interface Permission {
    id: number
    name: string          // e.g., "query:create", "dashboard:edit"
    resource: string      // e.g., "query", "dashboard", "connection"
    action: string        // e.g., "create", "read", "update", "delete"
    description: string
    created_at: string
}

/**
 * Role represents a user role with associated permissions
 */
export interface Role {
    id: number
    name: string
    description: string
    is_system_role: boolean   // true for Admin, Editor, Analyst, Viewer
    permissions: Permission[]
    created_at: string
    updated_at: string
}

/**
 * UserRole represents a user-role assignment with audit trail
 */
export interface UserRole {
    id: number
    user_id: number
    role_id: number
    role: Role
    assigned_by: number
    assigned_by_username?: string  // Populated from join
    assigned_at: string
}

/**
 * User interface (minimal for role assignment)
 */
export interface User {
    id: number
    username: string
    email: string
    created_at: string
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Request body for creating a new role
 */
export interface CreateRoleRequest {
    name: string
    description: string
    permission_ids: number[]
}

/**
 * Request body for updating an existing role
 */
export interface UpdateRoleRequest {
    name?: string
    description?: string
}

/**
 * Request body for assigning permissions to a role
 */
export interface AssignPermissionsRequest {
    permission_ids: number[]
}

/**
 * Request body for assigning a role to a user
 */
export interface AssignRoleToUserRequest {
    role_id: number
}

/**
 * Request body for checking user permission
 */
export interface CheckPermissionRequest {
    user_id: number
    permission_name: string
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response for GET /api/permissions
 */
export interface GetPermissionsResponse {
    permissions: Permission[]
    total: number
}

/**
 * Response for GET /api/permissions/resource/:resource
 */
export interface GetPermissionsByResourceResponse {
    resource: string
    permissions: Permission[]
    total: number
}

/**
 * Response for GET /api/roles
 */
export interface GetRolesResponse {
    roles: Role[]
    total: number
}

/**
 * Response for GET /api/roles/:id
 */
export interface GetRoleResponse {
    id: number
    name: string
    description: string
    is_system_role: boolean
    permissions: Permission[]
    created_at: string
    updated_at: string
}

/**
 * Response for GET /api/users/:id/roles
 */
export interface GetUserRolesResponse {
    user_id: number
    roles: Role[]
    total: number
}

/**
 * Response for GET /api/users/:id/permissions
 */
export interface GetUserPermissionsResponse {
    user_id: number
    permissions: Permission[]
    total: number
}

/**
 * Response for POST /api/permissions/check
 */
export interface CheckPermissionResponse {
    user_id: number
    permission_name: string
    has_permission: boolean
}

/**
 * Standard success message response
 */
export interface MessageResponse {
    message: string
}

/**
 * Standard error response
 */
export interface ErrorResponse {
    error: string
    details?: string
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Grouped permissions by resource for UI display
 */
export interface GroupedPermissions {
    [resource: string]: Permission[]
}

/**
 * Role editor dialog state
 */
export interface RoleEditorState {
    mode: 'create' | 'edit' | 'view'
    role: Role | null
    selectedPermissionIds: Set<number>
    expandedGroups: Set<string>
    isSubmitting: boolean
}

/**
 * User-role assignment dialog state
 */
export interface UserRoleAssignmentState {
    selectedUserId: number | null
    userRoles: Role[]
    availableRoles: Role[]
    isLoadingRoles: boolean
    isAssigning: boolean
}

/**
 * Filter state for role list
 */
export interface RoleFilterState {
    search: string
    roleType: 'all' | 'system' | 'custom'
    sortBy: 'name' | 'created_at' | 'permissions_count'
    sortOrder: 'asc' | 'desc'
}
