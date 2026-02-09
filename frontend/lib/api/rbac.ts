/**
 * RBAC API Service
 * 
 * Service layer for Role-Based Access Control API calls.
 * Provides type-safe methods for managing roles, permissions, and user-role assignments.
 */

import { logApiError, logger } from '../logger'
import { apiGet, apiPost, apiPut, apiDelete } from './config'
import type {
    // Response types
    GetPermissionsResponse,
    GetPermissionsByResourceResponse,
    GetRolesResponse,
    GetRoleResponse,
    GetUserRolesResponse,
    GetUserPermissionsResponse,
    CheckPermissionResponse,
    MessageResponse,
    // Request types
    CreateRoleRequest,
    UpdateRoleRequest,
    AssignPermissionsRequest,
    AssignRoleToUserRequest,
    CheckPermissionRequest,
    // Entity types
    Permission,
    Role
} from '@/types/rbac'

// ============================================================================
// Permission API
// ============================================================================

/**
 * Get all permissions in the system
 * 
 * @returns List of all permissions with total count
 */
export async function getAllPermissions(): Promise<GetPermissionsResponse> {
    try {
        logger.debug('permissions_fetch_start', 'Fetching all permissions', {})

        const response = await apiGet<GetPermissionsResponse>('/api/permissions')

        logger.info('permissions_loaded', 'Permissions loaded successfully', {
            count: response.permissions?.length || 0
        })

        return response
    } catch (error) {
        logApiError('permissions_load_failed', error, {
            endpoint: '/api/permissions'
        })
        throw error
    }
}

/**
 * Get permissions filtered by resource type
 * 
 * @param resource Resource name (e.g., 'query', 'dashboard')
 * @returns Permissions for the specified resource
 */
export async function getPermissionsByResource(resource: string): Promise<GetPermissionsByResourceResponse> {
    try {
        logger.debug('permissions_by_resource_fetch', 'Fetching permissions by resource', { resource })

        const response = await apiGet<GetPermissionsByResourceResponse>(`/api/permissions/resource/${resource}`)

        logger.info('permissions_by_resource_loaded', 'Resource permissions loaded', {
            resource,
            count: response.permissions?.length || 0
        })

        return response
    } catch (error) {
        logApiError('permissions_by_resource_failed', error, {
            endpoint: `/api/permissions/resource/${resource}`,
            resource
        })
        throw error
    }
}

/**
 * Check if a user has a specific permission
 * 
 * @param userId User ID to check
 * @param permissionName Permission name (e.g., 'query:create')
 * @returns Boolean indicating if user has the permission
 */
export async function checkUserPermission(
    userId: number,
    permissionName: string
): Promise<boolean> {
    try {
        const request: CheckPermissionRequest = {
            user_id: userId,
            permission_name: permissionName
        }

        const response = await apiPost<CheckPermissionResponse>('/api/permissions/check', request)

        logger.debug('permission_check_complete', 'Permission check completed', {
            user_id: userId,
            permission: permissionName,
            has_permission: response.has_permission
        })

        return response.has_permission
    } catch (error) {
        logApiError('permission_check_failed', error, {
            user_id: userId,
            permission: permissionName
        })
        throw error
    }
}

/**
 * Get all permissions assigned to a user
 * 
 * @param userId User ID
 * @returns User's effective permissions (from all assigned roles)
 */
export async function getUserPermissions(userId: number): Promise<Permission[]> {
    try {
        const response = await apiGet<GetUserPermissionsResponse>(`/api/users/${userId}/permissions`)

        logger.info('user_permissions_loaded', 'User permissions loaded', {
            user_id: userId,
            count: response.permissions?.length || 0
        })

        return response.permissions || []
    } catch (error) {
        logApiError('user_permissions_load_failed', error, {
            user_id: userId
        })
        throw error
    }
}

// ============================================================================
// Role API
// ============================================================================

/**
 * Get all roles in the system
 * 
 * @returns List of all roles with their permissions
 */
export async function getAllRoles(): Promise<GetRolesResponse> {
    try {
        logger.debug('roles_fetch_start', 'Fetching all roles', {})

        const response = await apiGet<GetRolesResponse>('/api/roles')

        logger.info('roles_loaded', 'Roles loaded successfully', {
            count: response.roles?.length || 0,
            system_roles: response.roles?.filter(r => r.is_system_role).length || 0,
            custom_roles: response.roles?.filter(r => !r.is_system_role).length || 0
        })

        return response
    } catch (error) {
        logApiError('roles_load_failed', error, {
            endpoint: '/api/roles'
        })
        throw error
    }
}

/**
 * Get a single role by ID with full details
 * 
 * @param roleId Role ID
 * @returns Role details including all permissions
 */
export async function getRoleById(roleId: number): Promise<Role> {
    try {
        logger.debug('role_fetch_start', 'Fetching role by ID', { role_id: roleId })

        const response = await apiGet<GetRoleResponse>(`/api/roles/${roleId}`)

        logger.info('role_loaded', 'Role loaded successfully', {
            role_id: roleId,
            name: response.name,
            permissions_count: response.permissions?.length || 0
        })

        return response as Role
    } catch (error) {
        logApiError('role_load_failed', error, {
            role_id: roleId
        })
        throw error
    }
}

/**
 * Create a new custom role
 * 
 * @param data Role creation data
 * @returns Newly created role
 */
export async function createRole(data: CreateRoleRequest): Promise<Role> {
    try {
        logger.debug('role_create_start', 'Creating new role', {
            name: data.name,
            permissions_count: data.permission_ids.length
        })

        const response = await apiPost<Role>('/api/roles', data)

        logger.info('role_created', 'Role created successfully', {
            role_id: response.id,
            name: response.name,
            permission_count: response.permissions?.length || 0
        })

        return response
    } catch (error) {
        logApiError('role_create_failed', error, {
            name: data.name,
            permissions_count: data.permission_ids.length
        })
        throw error
    }
}

/**
 * Update an existing role
 * 
 * @param roleId Role ID to update
 * @param data Update data (name and/or description)
 * @returns Success message
 */
export async function updateRole(roleId: number, data: UpdateRoleRequest): Promise<MessageResponse> {
    try {
        logger.debug('role_update_start', 'Updating role', {
            role_id: roleId,
            updates: Object.keys(data)
        })

        const response = await apiPut<MessageResponse>(`/api/roles/${roleId}`, data)

        logger.info('role_updated', 'Role updated successfully', {
            role_id: roleId
        })

        return response
    } catch (error) {
        logApiError('role_update_failed', error, {
            role_id: roleId
        })
        throw error
    }
}

/**
 * Delete a custom role (system roles cannot be deleted)
 * 
 * @param roleId Role ID to delete
 * @returns Success message
 */
export async function deleteRole(roleId: number): Promise<MessageResponse> {
    try {
        logger.debug('role_delete_start', 'Deleting role', { role_id: roleId })

        const response = await apiDelete<MessageResponse>(`/api/roles/${roleId}`)

        logger.info('role_deleted', 'Role deleted successfully', {
            role_id: roleId
        })

        return response
    } catch (error) {
        logApiError('role_delete_failed', error, {
            role_id: roleId
        })
        throw error
    }
}

/**
 * Assign permissions to a role
 * 
 * @param roleId Role ID
 * @param permissionIds Array of permission IDs to assign
 * @returns Success message
 */
export async function assignPermissionsToRole(
    roleId: number,
    permissionIds: number[]
): Promise<MessageResponse> {
    try {
        logger.debug('permissions_assign_start', 'Assigning permissions to role', {
            role_id: roleId,
            permissions_count: permissionIds.length
        })

        const data: AssignPermissionsRequest = { permission_ids: permissionIds }
        const response = await apiPut<MessageResponse>(`/api/roles/${roleId}/permissions`, data)

        logger.info('permissions_assigned', 'Permissions assigned to role', {
            role_id: roleId,
            permissions_count: permissionIds.length
        })

        return response
    } catch (error) {
        logApiError('permissions_assign_failed', error, {
            role_id: roleId,
            permissions_count: permissionIds.length
        })
        throw error
    }
}

// ============================================================================
// User-Role Assignment API
// ============================================================================

/**
 * Get all roles assigned to a user
 * 
 * @param userId User ID
 * @returns User's assigned roles
 */
export async function getUserRoles(userId: number): Promise<Role[]> {
    try {
        logger.debug('user_roles_fetch_start', 'Fetching user roles', { user_id: userId })

        const response = await apiGet<GetUserRolesResponse>(`/api/users/${userId}/roles`)

        logger.info('user_roles_loaded', 'User roles loaded', {
            user_id: userId,
            count: response.roles?.length || 0
        })

        return response.roles || []
    } catch (error) {
        logApiError('user_roles_load_failed', error, {
            user_id: userId
        })
        throw error
    }
}

/**
 * Assign a role to a user
 * 
 * @param userId User ID
 * @param roleId Role ID to assign
 * @returns Success message
 */
export async function assignRoleToUser(userId: number, roleId: number): Promise<MessageResponse> {
    try {
        logger.debug('user_role_assign_start', 'Assigning role to user', {
            user_id: userId,
            role_id: roleId
        })

        const data: AssignRoleToUserRequest = { role_id: roleId }
        const response = await apiPost<MessageResponse>(`/api/users/${userId}/roles`, data)

        logger.info('user_role_assigned', 'Role assigned to user successfully', {
            user_id: userId,
            role_id: roleId
        })

        return response
    } catch (error) {
        logApiError('user_role_assign_failed', error, {
            user_id: userId,
            role_id: roleId
        })
        throw error
    }
}

/**
 * Remove a role from a user
 * 
 * @param userId User ID
 * @param roleId Role ID to remove
 * @returns Success message
 */
export async function removeRoleFromUser(userId: number, roleId: number): Promise<MessageResponse> {
    try {
        logger.debug('user_role_remove_start', 'Removing role from user', {
            user_id: userId,
            role_id: roleId
        })

        const response = await apiDelete<MessageResponse>(`/api/users/${userId}/roles/${roleId}`)

        logger.info('user_role_removed', 'Role removed from user successfully', {
            user_id: userId,
            role_id: roleId
        })

        return response
    } catch (error) {
        logApiError('user_role_remove_failed', error, {
            user_id: userId,
            role_id: roleId
        })
        throw error
    }
}
