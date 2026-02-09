'use client'

import { useState } from 'react'

interface SnowflakeFormProps {
    onSubmit: (data: any) => void
    onTest?: (data: any) => void
    initialData?: any
}

export default function SnowflakeForm({ onSubmit, onTest, initialData }: SnowflakeFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: 'snowflake',
        // Snowflake uses Host for account identifier
        host: initialData?.host || '', // Account identifier (e.g., "xy12345" or "xy12345.us-east-1.aws")
        database: initialData?.database || '',
        username: initialData?.username || '',
        password: initialData?.password || '',
        // Store Snowflake-specific options
        warehouse: initialData?.options?.warehouse || '',
        role: initialData?.options?.role || 'SYSADMIN',
        schema: initialData?.options?.schema || 'PUBLIC',
    })

    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleTestConnection = async () => {
        if (!onTest) return

        setTesting(true)
        setTestResult(null)

        // Build connection object with Options
        const connectionData = {
            name: formData.name,
            type: formData.type,
            host: formData.host,
            database: formData.database,
            username: formData.username,
            password: formData.password,
            options: {
                warehouse: formData.warehouse,
                role: formData.role,
                schema: formData.schema,
            }
        }

        try {
            await onTest(connectionData)
            setTestResult({ success: true, message: 'Connection successful!' })
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Connection failed' })
        } finally {
            setTesting(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Build connection object with Options
        const connectionData = {
            name: formData.name,
            type: formData.type,
            host: formData.host,
            database: formData.database,
            username: formData.username,
            password: formData.password,
            options: {
                warehouse: formData.warehouse,
                role: formData.role,
                schema: formData.schema,
            }
        }

        onSubmit(connectionData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Connection Name */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Connection Name *
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="My Snowflake Warehouse"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Account Identifier */}
            <div>
                <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
                    Account Identifier *
                </label>
                <input
                    type="text"
                    id="host"
                    name="host"
                    value={formData.host}
                    onChange={handleChange}
                    required
                    placeholder="xy12345.us-east-1.aws"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Format: <span className="font-mono">account.region.cloud</span> or <span className="font-mono">account-locator</span>
                </p>
                <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">Examples:</p>
                    <p className="text-xs text-gray-500 font-mono">• xy12345.us-east-1.aws</p>
                    <p className="text-xs text-gray-500 font-mono">• xy12345.us-central1.gcp</p>
                    <p className="text-xs text-gray-500 font-mono">• xy12345.east-us-2.azure</p>
                </div>
            </div>

            {/* Database */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-1">
                        Database *
                    </label>
                    <input
                        type="text"
                        id="database"
                        name="database"
                        value={formData.database}
                        onChange={handleChange}
                        required
                        placeholder="DEMO_DB"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="schema" className="block text-sm font-medium text-gray-700 mb-1">
                        Schema
                    </label>
                    <input
                        type="text"
                        id="schema"
                        name="schema"
                        value={formData.schema}
                        onChange={handleChange}
                        placeholder="PUBLIC"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: PUBLIC</p>
                </div>
            </div>

            {/* Warehouse */}
            <div>
                <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse *
                </label>
                <input
                    type="text"
                    id="warehouse"
                    name="warehouse"
                    value={formData.warehouse}
                    onChange={handleChange}
                    required
                    placeholder="COMPUTE_WH"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Virtual warehouse name (e.g., COMPUTE_WH, ANALYTICS_WH)
                </p>
            </div>

            {/* Role */}
            <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                </label>
                <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="SYSADMIN">SYSADMIN</option>
                    <option value="ACCOUNTADMIN">ACCOUNTADMIN</option>
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="SECURITYADMIN">SECURITYADMIN</option>
                    <option value="USERADMIN">USERADMIN</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    Default: SYSADMIN
                </p>
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Information Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Snowflake Connection Tips</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Find your Account Identifier in Snowflake Admin → Account → Locator</li>
                    <li>• Virtual warehouse must be created and running</li>
                    <li>• Ensure your Snowflake user has access to the database and warehouse</li>
                    <li>• Use SYSADMIN or ACCOUNTADMIN role for full access</li>
                </ul>
            </div>

            {/* Test Result */}
            {testResult && (
                <div
                    className={`p-3 rounded-md ${testResult.success
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                        }`}
                >
                    <p className="text-sm font-medium">
                        {testResult.success ? '✅ ' : '❌ '}
                        {testResult.message}
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                {onTest && (
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testing}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                )}

                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Save Connection
                </button>
            </div>
        </form>
    )
}
