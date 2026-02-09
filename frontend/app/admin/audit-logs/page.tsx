'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface AuditLog {
    id: number
    user_id: number | null
    username: string
    action: string
    resource_type: string
    resource_id: number | null
    resource_name: string
    ip_address: string
    user_agent: string
    created_at: string
}

interface FilterState {
    username: string
    action: string
    resource_type: string
    start_date: string
    end_date: string
    limit: number
    offset: number
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [filters, setFilters] = useState<FilterState>({
        username: '',
        action: '',
        resource_type: '',
        start_date: '',
        end_date: '',
        limit: 50,
        offset: 0
    })
    const [currentPage, setCurrentPage] = useState(1)

    // Fetch audit logs
    const fetchLogs = async () => {
        setLoading(true)
        try {
            // Build query params
            const params = new URLSearchParams()
            if (filters.username) params.append('username', filters.username)
            if (filters.action) params.append('action', filters.action)
            if (filters.resource_type) params.append('resource_type', filters.resource_type)
            if (filters.start_date) params.append('start_date', new Date(filters.start_date).toISOString())
            if (filters.end_date) params.append('end_date', new Date(filters.end_date).toISOString())
            params.append('limit', filters.limit.toString())
            params.append('offset', filters.offset.toString())

            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8080/api/admin/audit-logs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) throw new Error('Failed to fetch audit logs')

            const data = await response.json()
            setLogs(data.logs || [])
            setTotal(data.total || 0)
        } catch (error) {
            console.error('Error fetching audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    // Export to CSV
    const exportToCSV = async () => {
        try {
            const params = new URLSearchParams()
            if (filters.username) params.append('username', filters.username)
            if (filters.action) params.append('action', filters.action)
            if (filters.resource_type) params.append('resource_type', filters.resource_type)
            if (filters.start_date) params.append('start_date', new Date(filters.start_date).toISOString())
            if (filters.end_date) params.append('end_date', new Date(filters.end_date).toISOString())

            const token = localStorage.getItem('token')
            const response = await fetch(`http://localhost:8080/api/admin/audit-logs/export?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) throw new Error('Failed to export audit logs')

            // Download CSV
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Error exporting audit logs:', error)
        }
    }

    // Pagination
    const totalPages = Math.ceil(total / filters.limit)

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        setFilters(prev => ({ ...prev, offset: (page - 1) * prev.limit }))
    }

    // Filter handlers
    const handleFilterChange = (key: keyof FilterState, value: string | number) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
        setFilters(prev => ({ ...prev, offset: 0 }))
    }

    const handleSearch = () => {
        fetchLogs()
    }

    const handleReset = () => {
        setFilters({
            username: '',
            action: '',
            resource_type: '',
            start_date: '',
            end_date: '',
            limit: 50,
            offset: 0
        })
        setCurrentPage(1)
    }

    // Fetch on mount and filter changes
    useEffect(() => {
        fetchLogs()
    }, [filters.offset])

    // Action badge color
    const getActionBadgeColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-800'
            case 'UPDATE': return 'bg-blue-100 text-blue-800'
            case 'DELETE': return 'bg-red-100 text-red-800'
            case 'LOGIN': return 'bg-purple-100 text-purple-800'
            case 'LOGOUT': return 'bg-gray-100 text-gray-800'
            case 'EXECUTE': return 'bg-yellow-100 text-yellow-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="text-gray-600 mt-2">
                        Comprehensive audit trail of all user actions and system events
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Filters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                value={filters.username}
                                onChange={(e) => handleFilterChange('username', e.target.value)}
                                placeholder="Search by username"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Action
                            </label>
                            <select
                                value={filters.action}
                                onChange={(e) => handleFilterChange('action', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Actions</option>
                                <option value="CREATE">CREATE</option>
                                <option value="UPDATE">UPDATE</option>
                                <option value="DELETE">DELETE</option>
                                <option value="LOGIN">LOGIN</option>
                                <option value="LOGOUT">LOGOUT</option>
                                <option value="EXECUTE">EXECUTE</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Resource Type
                            </label>
                            <select
                                value={filters.resource_type}
                                onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Resources</option>
                                <option value="dashboards">Dashboards</option>
                                <option value="queries">Queries</option>
                                <option value="connections">Connections</option>
                                <option value="users">Users</option>
                                <option value="auth">Authentication</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={filters.start_date}
                                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={filters.end_date}
                                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rows per page
                            </label>
                            <select
                                value={filters.limit}
                                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="200">200</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Apply Filters
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors ml-auto"
                        >
                            📥 Export CSV
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-semibold">{logs.length}</span> of{' '}
                        <span className="font-semibold">{total}</span> audit logs
                    </p>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Timestamp
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Action
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Resource
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            IP Address
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.username || 'System'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionBadgeColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <div>
                                                    <div className="font-medium">{log.resource_type}</div>
                                                    {log.resource_name && (
                                                        <div className="text-gray-500 text-xs">{log.resource_name}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.ip_address}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-white rounded-lg shadow-sm p-4 mt-6 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
