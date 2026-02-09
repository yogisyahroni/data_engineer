'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Globe,
    Key,
    Plus,
    Trash2,
    TestTube,
    CheckCircle,
    XCircle,
    Loader2,
    Eye,
    EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Types
 */

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type AuthType = 'none' | 'api_key' | 'basic' | 'bearer' | 'oauth2' | 'custom';

export type PaginationType = 'none' | 'offset' | 'cursor' | 'page';

export type RESTAPIConfig = {
    id?: string;
    name: string;
    baseURL: string;
    method: HTTPMethod;
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    body?: string;
    authType: AuthType;
    authConfig: Record<string, string>;
    paginationType: PaginationType;
    paginationConfig: Record<string, string>;
    dataPath: string;
    timeout: number;
    retryCount: number;
    retryDelay: number;
};

export interface RESTAPIFormProps {
    /** Initial configuration */
    initialConfig?: RESTAPIConfig;

    /** Callback when configuration is saved */
    onSave: (config: RESTAPIConfig) => Promise<void>;

    /** Callback when connection is tested */
    onTest?: (config: RESTAPIConfig) => Promise<{ success: boolean; message: string; data?: any }>;

    /** Show advanced options */
    showAdvanced?: boolean;
}

/**
 * REST API Connection Form Component
 */
export function RESTAPIForm({
    initialConfig,
    onSave,
    onTest,
    showAdvanced = true,
}: RESTAPIFormProps) {
    // State
    const [config, setConfig] = useState<RESTAPIConfig>(
        initialConfig || {
            name: '',
            baseURL: '',
            method: 'GET',
            headers: {},
            queryParams: {},
            authType: 'none',
            authConfig: {},
            paginationType: 'none',
            paginationConfig: {},
            dataPath: '',
            timeout: 30,
            retryCount: 3,
            retryDelay: 1,
        }
    );

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

    /**
     * Update config field
     */
    function updateConfig<K extends keyof RESTAPIConfig>(key: K, value: RESTAPIConfig[K]) {
        setConfig((prev) => ({ ...prev, [key]: value }));
        setTestResult(null); // Clear test result on config change
    }

    /**
     * Add header
     */
    function addHeader() {
        const key = `header_${Object.keys(config.headers).length + 1}`;
        updateConfig('headers', { ...config.headers, [key]: '' });
    }

    /**
     * Update header
     */
    function updateHeader(oldKey: string, newKey: string, value: string) {
        const newHeaders = { ...config.headers };
        delete newHeaders[oldKey];
        newHeaders[newKey] = value;
        updateConfig('headers', newHeaders);
    }

    /**
     * Remove header
     */
    function removeHeader(key: string) {
        const newHeaders = { ...config.headers };
        delete newHeaders[key];
        updateConfig('headers', newHeaders);
    }

    /**
     * Add query parameter
     */
    function addQueryParam() {
        const key = `param_${Object.keys(config.queryParams).length + 1}`;
        updateConfig('queryParams', { ...config.queryParams, [key]: '' });
    }

    /**
     * Update query parameter
     */
    function updateQueryParam(oldKey: string, newKey: string, value: string) {
        const newParams = { ...config.queryParams };
        delete newParams[oldKey];
        newParams[newKey] = value;
        updateConfig('queryParams', newParams);
    }

    /**
     * Remove query parameter
     */
    function removeQueryParam(key: string) {
        const newParams = { ...config.queryParams };
        delete newParams[key];
        updateConfig('queryParams', newParams);
    }

    /**
     * Update auth config
     */
    function updateAuthConfig(key: string, value: string) {
        updateConfig('authConfig', { ...config.authConfig, [key]: value });
    }

    /**
     * Handle test connection
     */
    async function handleTest() {
        if (!onTest) return;

        setIsTesting(true);
        setTestResult(null);

        try {
            const result = await onTest(config);
            setTestResult(result);

            if (result.success) {
                toast.success(result.message || 'Connection successful');
            } else {
                toast.error(result.message || 'Connection failed');
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message });
            toast.error(`Test failed: ${error.message}`);
        } finally {
            setIsTesting(false);
        }
    }

    /**
     * Handle save
     */
    async function handleSave() {
        // Validation
        if (!config.name.trim()) {
            toast.error('Connection name is required');
            return;
        }
        if (!config.baseURL.trim()) {
            toast.error('Base URL is required');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(config);
            toast.success('Configuration saved successfully');
        } catch (error: any) {
            toast.error(`Save failed: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Basic Configuration */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Basic Configuration</h3>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Connection Name *</Label>
                        <Input
                            id="name"
                            value={config.name}
                            onChange={(e) => updateConfig('name', e.target.value)}
                            placeholder="My API Connection"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="baseURL">Base URL *</Label>
                            <Input
                                id="baseURL"
                                value={config.baseURL}
                                onChange={(e) => updateConfig('baseURL', e.target.value)}
                                placeholder="https://api.example.com/v1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="method">Method</Label>
                            <Select value={config.method} onValueChange={(val) => updateConfig('method', val as HTTPMethod)}>
                                <SelectTrigger id="method">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                    <SelectItem value="DELETE">DELETE</SelectItem>
                                    <SelectItem value="PATCH">PATCH</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dataPath">Data Path (JSON Path)</Label>
                        <Input
                            id="dataPath"
                            value={config.dataPath}
                            onChange={(e) => updateConfig('dataPath', e.target.value)}
                            placeholder="data.results"
                        />
                        <p className="text-xs text-muted-foreground">
                            Path to the data array in the response (e.g., "data.results")
                        </p>
                    </div>
                </div>
            </Card>

            {/* Authentication */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Key className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Authentication</h3>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="authType">Authentication Type</Label>
                        <Select value={config.authType} onValueChange={(val) => updateConfig('authType', val as AuthType)}>
                            <SelectTrigger id="authType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Authentication</SelectItem>
                                <SelectItem value="api_key">API Key</SelectItem>
                                <SelectItem value="basic">HTTP Basic Auth</SelectItem>
                                <SelectItem value="bearer">Bearer Token</SelectItem>
                                <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                                <SelectItem value="custom">Custom Headers</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Auth-specific fields */}
                    {config.authType === 'api_key' && (
                        <APIKeyAuth authConfig={config.authConfig} onUpdate={updateAuthConfig} showPassword={showPassword} setShowPassword={setShowPassword} />
                    )}
                    {config.authType === 'basic' && (
                        <BasicAuth authConfig={config.authConfig} onUpdate={updateAuthConfig} showPassword={showPassword} setShowPassword={setShowPassword} />
                    )}
                    {config.authType === 'bearer' && (
                        <BearerTokenAuth authConfig={config.authConfig} onUpdate={updateAuthConfig} showPassword={showPassword} setShowPassword={setShowPassword} />
                    )}
                    {config.authType === 'oauth2' && (
                        <OAuth2Auth authConfig={config.authConfig} onUpdate={updateAuthConfig} showPassword={showPassword} setShowPassword={setShowPassword} />
                    )}
                </div>
            </Card>

            {/* Advanced Options */}
            {showAdvanced && (
                <Accordion type="single" collapsible>
                    <AccordionItem value="advanced">
                        <AccordionTrigger>Advanced Options</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-6 pt-4">
                                {/* Headers */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label>Custom Headers</Label>
                                        <Button variant="outline" size="sm" onClick={addHeader}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Header
                                        </Button>
                                    </div>
                                    {Object.entries(config.headers).length > 0 ? (
                                        <div className="space-y-2">
                                            {Object.entries(config.headers).map(([key, value]) => (
                                                <KeyValueRow
                                                    key={key}
                                                    keyValue={key}
                                                    value={value}
                                                    onUpdate={(newKey, newValue) => updateHeader(key, newKey, newValue)}
                                                    onRemove={() => removeHeader(key)}
                                                    keyPlaceholder="Header-Name"
                                                    valuePlaceholder="Header Value"
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No custom headers</p>
                                    )}
                                </div>

                                <Separator />

                                {/* Query Parameters */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <Label>Query Parameters</Label>
                                        <Button variant="outline" size="sm" onClick={addQueryParam}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Parameter
                                        </Button>
                                    </div>
                                    {Object.entries(config.queryParams).length > 0 ? (
                                        <div className="space-y-2">
                                            {Object.entries(config.queryParams).map(([key, value]) => (
                                                <KeyValueRow
                                                    key={key}
                                                    keyValue={key}
                                                    value={value}
                                                    onUpdate={(newKey, newValue) => updateQueryParam(key, newKey, newValue)}
                                                    onRemove={() => removeQueryParam(key)}
                                                    keyPlaceholder="param_name"
                                                    valuePlaceholder="param_value"
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No query parameters</p>
                                    )}
                                </div>

                                <Separator />

                                {/* Request Body (for POST/PUT/PATCH) */}
                                {(config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="body">Request Body (JSON)</Label>
                                            <Textarea
                                                id="body"
                                                value={config.body || ''}
                                                onChange={(e) => updateConfig('body', e.target.value)}
                                                placeholder='{"key": "value"}'
                                                rows={6}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Pagination */}
                                <div className="space-y-3">
                                    <Label>Pagination</Label>
                                    <Select
                                        value={config.paginationType}
                                        onValueChange={(val) => updateConfig('paginationType', val as PaginationType)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="offset">Offset/Limit</SelectItem>
                                            <SelectItem value="cursor">Cursor-based</SelectItem>
                                            <SelectItem value="page">Page-based</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Separator />

                                {/* Performance */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="timeout">Timeout (seconds)</Label>
                                        <Input
                                            id="timeout"
                                            type="number"
                                            min="1"
                                            value={config.timeout}
                                            onChange={(e) => updateConfig('timeout', parseInt(e.target.value) || 30)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="retryCount">Retry Count</Label>
                                        <Input
                                            id="retryCount"
                                            type="number"
                                            min="0"
                                            value={config.retryCount}
                                            onChange={(e) => updateConfig('retryCount', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="retryDelay">Retry Delay (s)</Label>
                                        <Input
                                            id="retryDelay"
                                            type="number"
                                            min="0"
                                            value={config.retryDelay}
                                            onChange={(e) => updateConfig('retryDelay', parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}

            {/* Test Result */}
            {testResult && (
                <Card className={cn('p-4', testResult.success ? 'border-green-500' : 'border-red-500')}>
                    <div className="flex items-start gap-3">
                        {testResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <p className="font-semibold">
                                {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">{testResult.message}</p>

                            {testResult.data && (
                                <ScrollArea className="h-[200px] mt-3 border rounded-md p-3">
                                    <pre className="text-xs">{JSON.stringify(testResult.data, null, 2)}</pre>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                {onTest && (
                    <Button variant="outline" onClick={handleTest} disabled={isTesting}>
                        {isTesting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <TestTube className="h-4 w-4 mr-2" />
                                Test Connection
                            </>
                        )}
                    </Button>
                )}
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save Configuration'
                    )}
                </Button>
            </div>
        </div>
    );
}

/**
 * Key-Value Row Component
 */
function KeyValueRow({
    keyValue,
    value,
    onUpdate,
    onRemove,
    keyPlaceholder,
    valuePlaceholder,
}: {
    keyValue: string;
    value: string;
    onUpdate: (key: string, value: string) => void;
    onRemove: () => void;
    keyPlaceholder: string;
    valuePlaceholder: string;
}) {
    return (
        <div className="flex gap-2">
            <Input
                value={keyValue}
                onChange={(e) => onUpdate(e.target.value, value)}
                placeholder={keyPlaceholder}
                className="flex-1"
            />
            <Input
                value={value}
                onChange={(e) => onUpdate(keyValue, e.target.value)}
                placeholder={valuePlaceholder}
                className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

/**
 * API Key Auth Component
 */
function APIKeyAuth({
    authConfig,
    onUpdate,
    showPassword,
    setShowPassword,
}: {
    authConfig: Record<string, string>;
    onUpdate: (key: string, value: string) => void;
    showPassword: Record<string, boolean>;
    setShowPassword: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
    return (
        <div className="space-y-3">
            <PasswordField
                id="api_key"
                label="API Key"
                value={authConfig.api_key || ''}
                onChange={(val) => onUpdate('api_key', val)}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
            />
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label>Location</Label>
                    <Select value={authConfig.location || 'header'} onValueChange={(val) => onUpdate('location', val)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="header">Header</SelectItem>
                            <SelectItem value="query">Query Parameter</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Parameter Name</Label>
                    <Input
                        value={authConfig.param_name || 'X-API-Key'}
                        onChange={(e) => onUpdate('param_name', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Basic Auth Component
 */
function BasicAuth({
    authConfig,
    onUpdate,
    showPassword,
    setShowPassword,
}: {
    authConfig: Record<string, string>;
    onUpdate: (key: string, value: string) => void;
    showPassword: Record<string, boolean>;
    setShowPassword: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>Username</Label>
                <Input value={authConfig.username || ''} onChange={(e) => onUpdate('username', e.target.value)} />
            </div>
            <PasswordField
                id="password"
                label="Password"
                value={authConfig.password || ''}
                onChange={(val) => onUpdate('password', val)}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
            />
        </div>
    );
}

/**
 * Bearer Token Auth Component
 */
function BearerTokenAuth({
    authConfig,
    onUpdate,
    showPassword,
    setShowPassword,
}: {
    authConfig: Record<string, string>;
    onUpdate: (key: string, value: string) => void;
    showPassword: Record<string, boolean>;
    setShowPassword: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
    return (
        <PasswordField
            id="token"
            label="Bearer Token"
            value={authConfig.token || ''}
            onChange={(val) => onUpdate('token', val)}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
        />
    );
}

/**
 * OAuth2 Auth Component
 */
function OAuth2Auth({
    authConfig,
    onUpdate,
    showPassword,
    setShowPassword,
}: {
    authConfig: Record<string, string>;
    onUpdate: (key: string, value: string) => void;
    showPassword: Record<string, boolean>;
    setShowPassword: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>Client ID</Label>
                <Input value={authConfig.client_id || ''} onChange={(e) => onUpdate('client_id', e.target.value)} />
            </div>
            <PasswordField
                id="client_secret"
                label="Client Secret"
                value={authConfig.client_secret || ''}
                onChange={(val) => onUpdate('client_secret', val)}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
            />
            <div className="space-y-2">
                <Label>Token URL</Label>
                <Input
                    value={authConfig.token_url || ''}
                    onChange={(e) => onUpdate('token_url', e.target.value)}
                    placeholder="https://oauth.example.com/token"
                />
            </div>
            <div className="space-y-2">
                <Label>Grant Type</Label>
                <Select value={authConfig.grant_type || 'client_credentials'} onValueChange={(val) => onUpdate('grant_type', val)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="client_credentials">Client Credentials</SelectItem>
                        <SelectItem value="password">Password</SelectItem>
                        <SelectItem value="refresh_token">Refresh Token</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

/**
 * Password Field Component
 */
function PasswordField({
    id,
    label,
    value,
    onChange,
    showPassword,
    setShowPassword,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    showPassword: Record<string, boolean>;
    setShowPassword: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
    const isVisible = showPassword[id] || false;

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <Input
                    id={id}
                    type={isVisible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword((prev) => ({ ...prev, [id]: !isVisible }))}
                >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
