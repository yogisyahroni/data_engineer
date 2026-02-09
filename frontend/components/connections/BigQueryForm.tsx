'use client'

import { useState } from 'react'

interface BigQueryFormProps {
    onSubmit: (data: any) => void
    onTest?: (data: any) => void
    initialData?: any
}

export default function BigQueryForm({ onSubmit, onTest, initialData }: BigQueryFormProps) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        type: 'bigquery',
        // BigQuery uses Host for project ID
        host: initialData?.host || '', // GCP Project ID
        database: initialData?.database || '', // Default dataset (optional)
        // Credentials will be stored in Options as base64-encoded JSON
        credentialsJSON: '',
        location: initialData?.options?.location || 'US',
    })

    const [fileName, setFileName] = useState<string>('')
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)

        try {
            const text = await file.text()

            // Validate JSON structure
            const json = JSON.parse(text)
            if (!json.type || !json.project_id || !json.private_key || !json.client_email) {
                throw new Error('Invalid service account JSON')
            }

            // Convert to base64 for storage
            const base64 = btoa(text)
            setFormData(prev => ({ ...prev, credentialsJSON: base64 }))
            setTestResult({ success: true, message: 'Service account JSON loaded successfully' })
        } catch (error: any) {
            setTestResult({
                success: false,
                message: error.message || 'Invalid JSON file. Please upload a valid service account key.'
            })
            setFileName('')
            setFormData(prev => ({ ...prev, credentialsJSON: '' }))
        }
    }

    const handleTestConnection = async () => {
        if (!onTest) return

        if (!formData.host) {
            setTestResult({ success: false, message: 'Please enter Project ID' })
            return
        }

        if (!formData.credentialsJSON) {
            setTestResult({ success: false, message: 'Please upload service account JSON' })
            return
        }

        setTesting(true)
        setTestResult(null)

        // Build connection object with Options
        const connectionData = {
            name: formData.name,
            type: formData.type,
            host: formData.host, // Project ID
            database: formData.database, // Default dataset
            options: {
                credentials: formData.credentialsJSON,
                location: formData.location,
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

        if (!formData.credentialsJSON) {
            setTestResult({ success: false, message: 'Please upload service account JSON' })
            return
        }

        // Build connection object with Options
        const connectionData = {
            name: formData.name,
            type: formData.type,
            host: formData.host, // Project ID
            database: formData.database, // Default dataset
            options: {
                credentials: formData.credentialsJSON,
                location: formData.location,
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
                    placeholder="My BigQuery Data Warehouse"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Project ID */}
            <div>
                <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
                    Project ID *
                </label>
                <input
                    type="text"
                    id="host"
                    name="host"
                    value={formData.host}
                    onChange={handleChange}
                    required
                    placeholder="my-gcp-project-123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Find this in your GCP Console → Project Info
                </p>
            </div>

            {/* Default Dataset (Optional) */}
            <div>
                <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-1">
                    Default Dataset <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                    type="text"
                    id="database"
                    name="database"
                    value={formData.database}
                    onChange={handleChange}
                    placeholder="analytics"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Use this dataset by default for queries (can be overridden)
                </p>
            </div>

            {/* Location */}
            <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                    Dataset Location
                </label>
                <select
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="US">US (United States)</option>
                    <option value="EU">EU (European Union)</option>
                    <option value="asia-east1">asia-east1 (Taiwan)</option>
                    <option value="asia-northeast1">asia-northeast1 (Tokyo)</option>
                    <option value="asia-southeast1">asia-southeast1 (Singapore)</option>
                    <option value="australia-southeast1">australia-southeast1 (Sydney)</option>
                    <option value="europe-west1">europe-west1 (Belgium)</option>
                    <option value="us-central1">us-central1 (Iowa)</option>
                    <option value="us-east1">us-east1 (South Carolina)</option>
                    <option value="us-west1">us-west1 (Oregon)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    Location where datasets are stored
                </p>
            </div>

            {/* Service Account JSON Upload */}
            <div>
                <label htmlFor="credentials" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Account JSON *
                </label>
                <div className="mt-1">
                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Choose JSON File
                        <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="sr-only"
                        />
                    </label>
                    {fileName && (
                        <span className="ml-3 text-sm text-gray-600">
                            ✓ {fileName}
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Upload your GCP service account key (JSON format)
                </p>
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">How to get service account key:</p>
                    <ol className="text-xs text-gray-600 space-y-1 list-decimal ml-4">
                        <li>Go to GCP Console → IAM & Admin → Service Accounts</li>
                        <li>Create or select a service account</li>
                        <li>Click "Keys" → "Add Key" → "Create new key"</li>
                        <li>Select JSON format and download</li>
                        <li>Grant "BigQuery Data Viewer" and "BigQuery Job User" roles</li>
                    </ol>
                </div>
            </div>

            {/* Information Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Security Notice</h4>
                <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Service account credentials are encrypted before storage</li>
                    <li>• Never share your service account JSON publicly</li>
                    <li>• Use principle of least privilege (grant only necessary permissions)</li>
                    <li>• Rotate service account keys regularly</li>
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
