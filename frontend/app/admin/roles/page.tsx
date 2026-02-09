'use client'

/**
 * RBAC Role Management Page
 * 
 * Admin interface for managing roles, permissions, and user-role assignments.
 * TASK-081: RBAC UI Implementation
 */

import { useState, useEffect, useMemo } from 'react'
import { logger, logApiError } from '@/lib/logger'
import {
    getAllRoles,
    getAllPermissions,
    createRole,
    updateRole,
    deleteRole,
    assignPermissionsToRole,
    getUserRoles,
    assignRoleToUser,
    removeRoleFromUser
} from '@/lib/api/rbac'
import type {
    Role,
    Permission,
    CreateRoleRequest,
    GroupedPermissions
} from '@/types/rbac'

// ============================================================================
// Main Page Component
// ============================================================================

export default function RolesManagementPage() {
    // State management
    const [roles, setRoles] = useState<Role[]>([])
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
    const [isUserRoleDialogOpen, setIsUserRoleDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('view')
    const [searchQuery, setSearchQuery] = useState('')

    // Load initial data
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [rolesData, permissionsData] = await Promise.all([
                getAllRoles(),
                getAllPermissions()
            ])

            setRoles(rolesData.roles || [])
            setPermissions(permissionsData.permissions || [])

            logger.info('rbac_page_loaded', 'RBAC management page data loaded', {
                roles_count: rolesData.roles?.length || 0,
                permissions_count: permissionsData.permissions?.length || 0
            })
        } catch (error) {
            logApiError('rbac_page_load_failed', error, {})
        } finally {
            setLoading(false)
        }
    }

    // Computed values
    const systemRoles = useMemo(() => roles.filter(r => r.is_system_role), [roles])
    const customRoles = useMemo(() => roles.filter(r => !r.is_system_role), [roles])
    const filteredRoles = useMemo(() => {
        if (!searchQuery) return roles
        return roles.filter(r =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [roles, searchQuery])

    // Handlers
    const handleCreateRole = () => {
        setSelectedRole(null)
        setDialogMode('create')
        setIsRoleDialogOpen(true)
    }

    const handleEditRole = (role: Role) => {
        setSelectedRole(role)
        setDialogMode('edit')
        setIsRoleDialogOpen(true)
    }

    const handleViewRole = (role: Role) => {
        setSelectedRole(role)
        setDialogMode('view')
        setIsRoleDialogOpen(true)
    }

    const handleDeleteRole = async (role: Role) => {
        if (role.is_system_role) {
            alert('System roles cannot be deleted')
            return
        }

        if (!confirm(`Are you sure you want to delete role "${role.name}"? This action cannot be undone.`)) {
            return
        }

        try {
            await deleteRole(role.id)
            await loadData()
            alert('Role deleted successfully')
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete role'
            alert(message)
        }
    }

    const handleManageUsers = (role: Role) => {
        setSelectedRole(role)
        setIsUserRoleDialogOpen(true)
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
                        <p className="text-gray-600 mt-2">
                            Manage roles, permissions, and user assignments
                        </p>
                    </div>
                    <button
                        onClick={handleCreateRole}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        + Create Role
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="text-sm text-gray-600">Total Roles</div>
                        <div className="text-3xl font-bold text-gray-900 mt-2">{roles.length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="text-sm text-gray-600">System Roles</div>
                        <div className="text-3xl font-bold text-blue-600 mt-2">{systemRoles.length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <div className="text-sm text-gray-600">Custom Roles</div>
                        <div className="text-3xl font-bold text-green-600 mt-2">{customRoles.length}</div>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search roles by name or description..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Roles Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Permissions
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRoles.map((role) => (
                                <tr key={role.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{role.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-700">{role.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-3 py-1 text-sm font-semibold text-blue-700 bg-blue-100 rounded-full">
                                            {role.permissions?.length || 0} permissions
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {role.is_system_role ? (
                                            <span className="px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">
                                                System
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                                                Custom
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewRole(role)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            View
                                        </button>
                                        {!role.is_system_role && (
                                            <>
                                                <button
                                                    onClick={() => handleEditRole(role)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRole(role)}
                                                    className="text-red-600 hover:text-red-900 mr-3"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleManageUsers(role)}
                                            className="text-green-600 hover:text-green-900"
                                        >
                                            Users
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredRoles.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No roles found</p>
                        </div>
                    )}
                </div>

                {/* Role Editor Dialog */}
                {isRoleDialogOpen && (
                    <RoleEditorDialog
                        mode={dialogMode}
                        role={selectedRole}
                        permissions={permissions}
                        onClose={() => setIsRoleDialogOpen(false)}
                        onSave={loadData}
                    />
                )}

                {/* User-Role Assignment Dialog */}
                {isUserRoleDialogOpen && selectedRole && (
                    <UserRoleDialog
                        role={selectedRole}
                        onClose={() => setIsUserRoleDialogOpen(false)}
                    />
                )}
            </div>
        </div>
    )
}

// ============================================================================
// Role Editor Dialog Component
// ============================================================================

interface RoleEditorDialogProps {
    mode: 'create' | 'edit' | 'view'
    role: Role | null
    permissions: Permission[]
    onClose: () => void
    onSave: () => void
}

function RoleEditorDialog({ mode, role, permissions, onClose, onSave }: RoleEditorDialogProps) {
    const [name, setName] = useState(role?.name || '')
    const [description, setDescription] = useState(role?.description || '')
    const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(
        new Set(role?.permissions?.map(p => p.id) || [])
    )
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Group permissions by resource
    const groupedPermissions: GroupedPermissions = useMemo(() => {
        return permissions.reduce((acc, perm) => {
            if (!acc[perm.resource]) {
                acc[perm.resource] = []
            }
            acc[perm.resource].push(perm)
            return acc
        }, {} as GroupedPermissions)
    }, [permissions])

    const resources = Object.keys(groupedPermissions).sort()

    const togglePermission = (permId: number) => {
        const newSet = new Set(selectedPermissions)
        if (newSet.has(permId)) {
            newSet.delete(permId)
        } else {
            newSet.add(permId)
        }
        setSelectedPermissions(newSet)
    }

    const toggleResourceGroup = (resource: string) => {
        const groupPerms = groupedPermissions[resource]
        const allSelected = groupPerms.every(p => selectedPermissions.has(p.id))

        const newSet = new Set(selectedPermissions)
        groupPerms.forEach(p => {
            if (allSelected) {
                newSet.delete(p.id)
            } else {
                newSet.add(p.id)
            }
        })
        setSelectedPermissions(newSet)
    }

    const toggleExpand = (resource: string) => {
        const newSet = new Set(expandedGroups)
        if (newSet.has(resource)) {
            newSet.delete(resource)
        } else {
            newSet.add(resource)
        }
        setExpandedGroups(newSet)
    }

    const handleSubmit = async () => {
        if (!name.trim()) {
            alert('Role name is required')
            return
        }

        setIsSubmitting(true)
        try {
            if (mode === 'create') {
                const data: CreateRoleRequest = {
                    name: name.trim(),
                    description: description.trim(),
                    permission_ids: Array.from(selectedPermissions)
                }
                await createRole(data)
                alert('Role created successfully')
            } else if (mode === 'edit' && role) {
                await updateRole(role.id, {
                    name: name.trim(),
                    description: description.trim()
                })
                await assignPermissionsToRole(role.id, Array.from(selectedPermissions))
                alert('Role updated successfully')
            }

            onSave()
            onClose()
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save role'
            alert(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const isReadOnly = mode === 'view' || (role?.is_system_role && mode === 'edit')
    const title = mode === 'create' ? 'Create New Role' : mode === 'edit' ? 'Edit Role' : 'View Role'

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Role Info */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Enter role name"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Enter role description"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        />
                    </div>

                    {/* Permissions */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Permissions</h3>
                            <span className="text-sm text-gray-600">
                                {selectedPermissions.size} / {permissions.length} selected
                            </span>
                        </div>

                        {/* Permission Groups */}
                        <div className="space-y-3 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                            {resources.map((resource) => {
                                const resourcePerms = groupedPermissions[resource]
                                const selectedCount = resourcePerms.filter(p => selectedPermissions.has(p.id)).length
                                const isExpanded = expandedGroups.has(resource)
                                const allSelected = selectedCount === resourcePerms.length

                                return (
                                    <div key={resource} className="border-b border-gray-100 last:border-0 pb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleExpand(resource)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    {isExpanded ? '▼' : '►'}
                                                </button>
                                                <button
                                                    onClick={() => !isReadOnly && toggleResourceGroup(resource)}
                                                    disabled={isReadOnly}
                                                    className="flex items-center gap-2"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={() => { }}
                                                        disabled={isReadOnly}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="font-semibold text-gray-900 capitalize">
                                                        {resource}
                                                    </span>
                                                </button>
                                            </div>
                                            <span className="text-sm text-gray-500">
                                                {selectedCount}/{resourcePerms.length}
                                            </span>
                                        </div>

                                        {isExpanded && (
                                            <div className="ml-11 space-y-2">
                                                {resourcePerms.map((perm) => (
                                                    <label
                                                        key={perm.id}
                                                        className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPermissions.has(perm.id)}
                                                            onChange={() => !isReadOnly && togglePermission(perm.id)}
                                                            disabled={isReadOnly}
                                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {perm.name}
                                                            </div>
                                                            {perm.description && (
                                                                <div className="text-xs text-gray-500">
                                                                    {perm.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {role?.is_system_role && mode === 'edit' && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                ⚠️ This is a system role. You can view permissions but editing is restricted to maintain system integrity.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        {mode === 'view' ? 'Close' : 'Cancel'}
                    </button>
                    {mode !== 'view' && !isReadOnly && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Role'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// User-Role Assignment Dialog Component
// ============================================================================

interface UserRoleDialogProps {
    role: Role
    onClose: () => void
}

function UserRoleDialog({ role, onClose }: UserRoleDialogProps) {
    const [userId, setUserId] = useState('')
    const [userRoles, setUserRoles] = useState<Role[]>([])
    const [loading, setLoading] = useState(false)

    const loadUserRoles = async (id: number) => {
        setLoading(true)
        try {
            const roles = await getUserRoles(id)
            setUserRoles(roles)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load user roles'
            alert(message)
        } finally {
            setLoading(false)
        }
    }

    const handleAssignRole = async () => {
        const id = parseInt(userId)
        if (isNaN(id) || id <= 0) {
            alert('Please enter a valid user ID')
            return
        }

        try {
            await assignRoleToUser(id, role.id)
            alert('Role assigned successfully')
            await loadUserRoles(id)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to assign role'
            alert(message)
        }
    }

    const handleRemoveRole = async (roleId: number) => {
        const id = parseInt(userId)
        if (isNaN(id)) return

        if (!confirm('Are you sure you want to remove this role from the user?')) {
            return
        }

        try {
            await removeRoleFromUser(id, roleId)
            alert('Role removed successfully')
            await loadUserRoles(id)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove role'
            alert(message)
        }
    }

    const handleSearchUser = async () => {
        const id = parseInt(userId)
        if (isNaN(id) || id <= 0) {
            alert('Please enter a valid user ID')
            return
        }

        await loadUserRoles(id)
    }

    const hasRole = userRoles.some(r => r.id === role.id)

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">
                        Manage Users for Role: {role.name}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    {/* User Search */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            User ID
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                placeholder="Enter user ID"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSearchUser}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {/* User Roles */}
                    {!loading && userId && userRoles.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-gray-900 mb-3">
                                Current Roles for User {userId}
                            </h3>
                            <div className="space-y-2 mb-6">
                                {userRoles.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                                    >
                                        <div>
                                            <div className="font-medium text-gray-900">{r.name}</div>
                                            <div className="text-sm text-gray-500">{r.description}</div>
                                        </div>
                                        {!r.is_system_role && (
                                            <button
                                                onClick={() => handleRemoveRole(r.id)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Assign Role Button */}
                            {!hasRole && (
                                <button
                                    onClick={handleAssignRole}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Assign "{role.name}" to this user
                                </button>
                            )}
                            {hasRole && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                                    <p className="text-sm text-green-800">
                                        ✓ User already has this role
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && userId && userRoles.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            User not found or has no roles assigned
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
