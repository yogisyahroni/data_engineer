'use client'

import { useState } from 'react'

interface OracleFormProps {
    onSubmit: (data: any) => void
    onTest?: (data: any) => void
    initialData?: any
}

export default function OracleForm({ onSubmit, onTest, initialData }: OracleFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: 'oracle',
        host: initialData?.host || 'localhost',
        port: initialData?.port || 1521,
        connect_method: initialData?.connect_method || 'service', // 'service' or 'sid'
        service_name: initialData?.service_name || '',
        sid: initialData?.sid || '',
        username: initialData?.username || '',
        password: initialData?.password || '',
        ssl: initialData?.ssl || false,
        wallet_path: initialData?.wallet_path || '',
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
            // Build connection data based on method
            const testData = {
                ...formData,
                database: formData.connect_method === 'service' ? formData.service_name : formData.sid
            }

            await onTest(testData)
            setTestResult({ success: true, message: 'Connection successful!' })
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Connection failed' })
        } finally {
            setTesting(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Build final data with database field set correctly
        const submitData = {
            ...formData,
            database: formData.connect_method === 'service' ? formData.service_name : formData.sid
        }

        onSubmit(submitData)
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
                    placeholder="My Oracle Database"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
            </div>

            {/* Server/Host and Port */}
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
                        placeholder="localhost"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Default: 1521</p>
                </div>
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
                            name="connect_method"
                            value="service"
                            checked={formData.connect_method === 'service'}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm">
                            Service Name <span className="text-gray-500">(Modern)</span>
                        </span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="connect_method"
                            value="sid"
                            checked={formData.connect_method === 'sid'}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm">
                            SID <span className="text-gray-500">(Legacy)</span>
                        </span>
                    </label>
                </div>
            </div>

            {/* Service Name or SID (conditional) */}
            {formData.connect_method === 'service' ? (
                <div>
                    <label htmlFor="service_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Service Name *
                    </label>
                    <input
                        type="text"
                        id="service_name"
                        name="service_name"
                        value={formData.service_name}
                        onChange={handleChange}
                        required={formData.connect_method === 'service'}
                        placeholder="ORCL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Modern connection method (recommended)
                    </p>
                </div>
            ) : (
                <div>
                    <label htmlFor="sid" className="block text-sm font-medium text-gray-700 mb-1">
                        SID (System Identifier) *
                    </label>
                    <input
                        type="text"
                        id="sid"
                        name="sid"
                        value={formData.sid}
                        onChange={handleChange}
                        required={formData.connect_method === 'sid'}
                        placeholder="ORCL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Legacy connection method
                    </p>
                </div>
            )}

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
                        placeholder="system"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
            </div>

            {/* Advanced Options */}
            <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Advanced Options</h3>
                <div className="space-y-3">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="ssl"
                            checked={formData.ssl}
                            onChange={handleChange}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Enable SSL/TLS encryption</span>
                    </label>

                    {formData.ssl && (
                        <div className="ml-6">
                            <label htmlFor="wallet_path" className="block text-sm font-medium text-gray-700 mb-1">
                                Wallet Path (Optional)
                            </label>
                            <input
                                type="text"
                                id="wallet_path"
                                name="wallet_path"
                                value={formData.wallet_path}
                                onChange={handleChange}
                                placeholder="/path/to/wallet"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Path to Oracle Wallet for SSL/TLS connections
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
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                    Save Connection
                </button>
            </div>
        </form>
    )
}
