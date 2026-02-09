'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, HelpCircle, Plus, X } from 'lucide-react';
import { RLSPolicy } from './rls-manager';

interface PolicyEditorProps {
    onSave: () => void;
    onCancel: () => void;
    initialData?: Partial<RLSPolicy>;
}

interface Connection {
    id: string;
    name: string;
    type: string;
}

export function PolicyEditor({ onSave, onCancel, initialData }: PolicyEditorProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [tableName, setTableName] = useState(initialData?.tableName || '');
    const [condition, setCondition] = useState(initialData?.condition || '');
    const [connectionId, setConnectionId] = useState(initialData?.connectionId || '');
    const [roleInput, setRoleInput] = useState('');
    const [roles, setRoles] = useState<string[]>(initialData?.roleIds || []);
    const [enabled, setEnabled] = useState(initialData?.enabled !== false);
    const [priority, setPriority] = useState(initialData?.priority || 0);
    const [mode, setMode] = useState<'AND' | 'OR'>(initialData?.mode || 'AND');
    const [loading, setLoading] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(true);

    useEffect(() => {
        fetchConnections();
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/connections', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setConnections(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching connections:', err);
        } finally {
            setLoadingConnections(false);
        }
    };

    const handleAddRole = () => {
        if (roleInput.trim() && !roles.includes(roleInput.trim())) {
            setRoles([...roles, roleInput.trim()]);
            setRoleInput('');
        }
    };

    const handleRemoveRole = (role: string) => {
        setRoles(roles.filter(r => r !== role));
    };

    const insertTemplate = (template: string) => {
        setCondition(condition + template);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !connectionId || !tableName || !condition) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                name,
                description,
                connectionId,
                tableName,
                condition,
                roleIds: roles.length > 0 ? roles : null,
                enabled,
                priority,
                mode,
            };

            const url = initialData?.id
                ? `/api/rls/policies/${initialData.id}`
                : '/api/rls/policies';

            const method = initialData?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save policy');
            }

            toast.success(initialData?.id ? 'Policy updated successfully' : 'Policy created successfully');
            onSave();
        } catch (err: any) {
            toast.error(err.message || 'Error saving policy');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 border p-6 rounded-lg bg-card">
            <div>
                <h3 className="text-lg font-semibold">
                    {initialData?.id ? 'Edit' : 'Create'} RLS Policy
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Define access control rules for your data
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">
                        Policy Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g., Sales Team Filter"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="connection">
                        Connection <span className="text-red-500">*</span>
                    </Label>
                    <Select value={connectionId} onValueChange={setConnectionId} required>
                        <SelectTrigger id="connection">
                            <SelectValue placeholder="Select connection" />
                        </SelectTrigger>
                        <SelectContent>
                            {loadingConnections ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                    Loading connections...
                                </div>
                            ) : connections.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No connections available
                                </div>
                            ) : (
                                connections.map(conn => (
                                    <SelectItem key={conn.id} value={conn.id}>
                                        {conn.name} ({conn.type})
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Optional description of this policy"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="tableName">
                    Table Name <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="tableName"
                    value={tableName}
                    onChange={e => setTableName(e.target.value)}
                    placeholder="e.g., orders or orders_*"
                    required
                />
                <p className="text-xs text-muted-foreground">
                    Supports wildcards: <code className="bg-muted px-1 py-0.5 rounded">orders_*</code> matches all tables starting with "orders_"
                </p>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="condition">
                        SQL Condition <span className="text-red-500">*</span>
                    </Label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => insertTemplate('{{current_user.id}}')}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Insert Template
                    </Button>
                </div>
                <Textarea
                    id="condition"
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    placeholder="team_id IN ({{current_user.team_ids}})"
                    className="font-mono text-sm"
                    rows={4}
                    required
                />
                <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-medium">Available template variables:</p>
                    <div className="grid grid-cols-2 gap-1">
                        <code className="bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80"
                            onClick={() => insertTemplate('{{current_user.id}}')}>
                            {'{{current_user.id}}'}
                        </code>
                        <code className="bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80"
                            onClick={() => insertTemplate('{{current_user.email}}')}>
                            {'{{current_user.email}}'}
                        </code>
                        <code className="bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80"
                            onClick={() => insertTemplate('{{current_user.roles}}')}>
                            {'{{current_user.roles}}'}
                        </code>
                        <code className="bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80"
                            onClick={() => insertTemplate('{{current_user.team_ids}}')}>
                            {'{{current_user.team_ids}}'}
                        </code>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Roles (Optional)</Label>
                <div className="flex gap-2">
                    <Input
                        value={roleInput}
                        onChange={e => setRoleInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                        placeholder="Add role (e.g., VIEWER)"
                    />
                    <Button type="button" variant="outline" onClick={handleAddRole}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {roles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {roles.map(role => (
                            <Badge key={role} variant="secondary" className="flex items-center gap-1">
                                {role}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveRole(role)}
                                    className="ml-1 hover:text-destructive"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    Leave empty to apply to all users
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                        id="priority"
                        type="number"
                        value={priority}
                        onChange={e => setPriority(parseInt(e.target.value) || 0)}
                        placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Higher = applied first</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mode">Mode</Label>
                    <Select value={mode} onValueChange={(val: 'AND' | 'OR') => setMode(val)}>
                        <SelectTrigger id="mode">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="AND">AND (Restrictive)</SelectItem>
                            <SelectItem value="OR">OR (Permissive)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">For multiple policies</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="enabled">Status</Label>
                    <div className="flex items-center gap-2 h-10">
                        <Switch
                            id="enabled"
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                        <span className="text-sm">
                            {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {initialData?.id ? 'Update' : 'Create'} Policy
                </Button>
            </div>
        </form>
    );
}
