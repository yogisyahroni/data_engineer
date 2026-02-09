'use client'

import { useState } from 'react'

interface MongoDBFormProps {
    onSubmit: (data: any) => void
    onTest?: (data: any) => void
    initialData?: any
}

export default function MongoDBForm({ onSubmit, onTest, initialData }: MongoDBFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: 'mongodb',
        connection_method: initialData?.connection_method || 'uri', // 'uri' or 'manual'
        uri: initialData?.uri || '',
        host: initialData?.host || 'localhost',
        port: initialData?.port || 27017,
        database: initialData?.database || '',
        username: initialData?.username || '',
        password: initialData?.password || '',
        auth_source: initialData?.auth_source || 'admin',
        replica_set: initialData?.replica_set || '',
        tls: initialData?.tls || false,
        tls_ca_file: initialData?.tls_ca_file || '',
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
                    placeholder="My MongoDB Database"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            {/* Connection Method */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Connection Method *
                </label>
                <div className="flex gap-6">
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="connection_method"
                            value="uri"
                            checked={formData.connection_method === 'uri'}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm">
                            Connection URI <span className="text-gray-500">(Recommended)</span>
                        </span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="connection_method"
                            value="manual"
                            checked={formData.connection_method === 'manual'}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm">Manual Configuration</span>
                    </label>
                </div>
            </div>

            {/* URI Method */}
            {formData.connection_method === 'uri' ? (
                <div>
                    <label htmlFor="uri" className="block text-sm font-medium text-gray-700 mb-1">
                        Connection URI *
                    </label>
                    <input
                        type="text"
                        id="uri"
                        name="uri"
                        value={formData.uri}
                        onChange={handleChange}
                        required={formData.connection_method === 'uri'}
                        placeholder="mongodb://username:password@host:27017/database"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                    />
                    <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500">Examples:</p>
                        <p className="text-xs text-gray-500 font-mono">
                            • Standard: mongodb://user:pass@host:27017/database
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                            • Atlas: mongodb+srv://user:pass@cluster.mongodb.net/database
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                            • Replica Set: mongodb://host1,host2,host3/db?replicaSet=rs0
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Manual Configuration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
                                Host *
                            </label>
                            <input
                                type="text"
                                id="host"
                                name="host"
                                value={formData.host}
                                onChange={handleChange}
                                required={formData.connection_method === 'manual'}
                                placeholder="localhost"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Default: 27017</p>
                        </div>
                    </div>

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
                            required={formData.connection_method === 'manual'}
                            placeholder="mydb"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="admin"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Leave empty if no authentication</p>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="auth_source" className="block text-sm font-medium text-gray-700 mb-1">
                                Auth Source
                            </label>
                            <input
                                type="text"
                                id="auth_source"
                                name="auth_source"
                                value={formData.auth_source}
                                onChange={handleChange}
                                placeholder="admin"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Default: admin</p>
                        </div>

                        <div>
                            <label htmlFor="replica_set" className="block text-sm font-medium text-gray-700 mb-1">
                                Replica Set (Optional)
                            </label>
                            <input
                                type="text"
                                id="replica_set"
                                name="replica_set"
                                value={formData.replica_set}
                                onChange={handleChange}
                                placeholder="rs0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Advanced Options */}
            <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Advanced Options</h3>
                <div className="space-y-3">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="tls"
                            checked={formData.tls}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Enable TLS/SSL encryption</span>
                    </label>

                    {formData.tls && (
                        <div className="ml-6">
                            <label htmlFor="tls_ca_file" className="block text-sm font-medium text-gray-700 mb-1">
                                CA Certificate File (Optional)
                            </label>
                            <input
                                type="text"
                                id="tls_ca_file"
                                name="tls_ca_file"
                                value={formData.tls_ca_file}
                                onChange={handleChange}
                                placeholder="/path/to/ca.pem"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Path to CA certificate for TLS verification
                            </p>
                        </div>
                    )}
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
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                    Save Connection
                </button>
            </div>
        </form>
    )
}
