
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface RLSPolicy {
    id: string;
    name: string;
    workspaceId: string;
    connectionId: string;
    tableName: string;
    role?: string;
    userId?: string;
    condition: string;
}

interface PolicyEditorProps {
    onSave: () => void;
    onCancel: () => void;
    initialData?: Partial<RLSPolicy>;
}

export function PolicyEditor({ onSave, onCancel, initialData = {} }: PolicyEditorProps) {
    const [name, setName] = useState(initialData.name || '');
    const [tableName, setTableName] = useState(initialData.tableName || '');
    const [condition, setCondition] = useState(initialData.condition || '');
    const [role, setRole] = useState(initialData.role || 'VIEWER');
    const [connectionId, setConnectionId] = useState(initialData.connectionId || '');
    const [loading, setLoading] = useState(false);

    // TODO: Fetch Connections for dropdown. For MVP using Input or mocking.
    const connections = [
        { id: 'cm6...mock', name: 'Sales DB (Snowflake)' }, // Mock
        // In real app, fetch from /api/connections
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/security/policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    tableName,
                    condition,
                    role,
                    connectionId: connectionId || 'cm6...mock', // Default to mock if empty for MVP
                    workspaceId: 'clq...mock' // Hardcoded for MVP
                })
            });

            if (!res.ok) throw new Error('Failed to save policy');

            toast.success('RLS Policy Saved');
            onSave();
        } catch (err) {
            toast.error('Error saving policy');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg bg-card text-card-foreground">
            <h3 className="text-lg font-medium">Create RLS Policy</h3>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Policy Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sales Region Restriction" required />
                </div>
                <div className="space-y-2">
                    <Label>Target Table</Label>
                    <Input value={tableName} onChange={e => setTableName(e.target.value)} placeholder="e.g. sales_records" required />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Apply to Role</Label>
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="VIEWER">VIEWER</SelectItem>
                            <SelectItem value="EDITOR">EDITOR</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Connection</Label>
                    {/* Simplified for MVP */}
                    <Input value={connectionId} onChange={e => setConnectionId(e.target.value)} placeholder="Connection ID" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>SQL Condition (WHERE Clause)</Label>
                <Textarea
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    placeholder="e.g. region = 'North' OR user_id = :current_user_id"
                    className="font-mono text-sm"
                    rows={4}
                    required
                />
                <p className="text-xs text-muted-foreground">
                    This condition will be injected into all queries targeting the table above.
                </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Policy'}
                </Button>
            </div>
        </form>
    );
}
