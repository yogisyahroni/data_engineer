'use client'

import { useState } from 'react'

interface SqlServerFormProps {
    onSubmit: (data: any) => void
    onTest?: (data: any) => void
    initialData?: any
}

export default function SqlServerForm({ onSubmit, onTest, initialData }: SqlServerFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: 'sqlserver',
        host: initialData?.host || 'localhost',
        port: initialData?.port || 1433,
        database: initialData?.database || '',
        username: initialData?.username || '',
        password: initialData?.password || '',
        auth_type: initialData?.auth_type || 'sql', // 'sql' or 'windows'
        encrypt: initialData?.encrypt !== undefined ? initialData.encrypt : true,
        trust_cert: initialData?.trust_cert || false,
    })

    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        const checked = (e.target as HTMLInputElement).checked

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'port' ? parseInt(value) : value)
        }))
    }

    const handleTestConnection = async () => {
        if (!onTest) return

        setTesting(true)
        setTestResult(null)

        try {
            await onTest(formData)
            setTestResult({ success: true, message: 'Connection successful!' })
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Connection failed' })
        } finally {
            setTesting(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
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
                    placeholder="My SQL Server"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Server/Host */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
                        Server Address *
                    </label>
                    <input
                        type="text"
                        id="host"
                        name="host"
                        value={formData.host}
                        onChange={handleChange}
                        required
                        placeholder="localhost or localhost\\SQLEXPRESS"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Include instance name if needed (e.g., localhost\SQLEXPRESS)
                    </p>
                </div>

                <div>
                    <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
                        Port
                    </label>
                    <input
                        type="number"
                        id="port"
                        name="port"
                        value={formData.port}
                        onChange={handleChange}
                        min="1"
                        max="65535"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 1433</p>
                </div>
            </div>

            {/* Database Name */}
            <div>
                <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-1">
                    Database Name *
                </label>
                <input
                    type="text"
                    id="database"
                    name="database"
                    value={formData.database}
                    onChange={handleChange}
                    required
                    placeholder="mydatabase"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Authentication Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Authentication Type *
                </label>
                <div className="flex gap-6">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="auth_type"
                            value="sql"
                            checked={formData.auth_type === 'sql'}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm">SQL Server Authentication</span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="auth_type"
                            value="windows"
                            checked={formData.auth_type === 'windows'}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm">Windows Authentication</span>
                    </label>
                </div>
            </div>

            {/* Credentials (only for SQL Auth) */}
            {formData.auth_type === 'sql' && (
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
                            required={formData.auth_type === 'sql'}
                            placeholder="sa"
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
                            required={formData.auth_type === 'sql'}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}

            {/* Advanced Options */}
            <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Advanced Options</h3>
                <div className="space-y-3">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="encrypt"
                            checked={formData.encrypt}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Encrypt connection (recommended)</span>
                    </label>

                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="trust_cert"
                            checked={formData.trust_cert}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                            Trust server certificate (for self-signed certificates)
                        </span>
                    </label>
                </div>
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
