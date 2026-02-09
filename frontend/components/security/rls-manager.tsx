'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Trash2, AlertTriangle, Edit, Eye, Loader2 } from 'lucide-react';
import { PolicyEditor } from '@/components/security/policy-editor';
import { TestPolicyDialog } from '@/components/security/test-policy-dialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface RLSPolicy {
    id: string;
    name: string;
    description: string;
    connectionId: string;
    tableName: string;
    condition: string;
    roleIds: string[] | null;
    enabled: boolean;
    priority: number;
    mode: 'AND' | 'OR';
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export function RLSManager() {
    const [policies, setPolicies] = useState<RLSPolicy[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<RLSPolicy | null>(null);
    const [testingPolicy, setTestingPolicy] = useState<RLSPolicy | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchPolicies = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/rls/policies', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                setPolicies(Array.isArray(data) ? data : []);
            } else {
                toast.error('Failed to load policies');
            }
        } catch (err) {
            console.error('Error fetching policies:', err);
            toast.error('Failed to load policies');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this policy?')) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/rls/policies/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (res.ok || res.status === 204) {
                toast.success('Policy deleted successfully');
                fetchPolicies();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to delete policy');
            }
        } catch (err) {
            console.error('Error deleting policy:', err);
            toast.error('Failed to delete policy');
        } finally {
            setDeletingId(null);
        }
    };

    const handleSave = () => {
        setIsCreating(false);
        setEditingPolicy(null);
        fetchPolicies();
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingPolicy(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-600" />
                        Row-Level Security Policies
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Control data access at the row level based on user roles and attributes
                    </p>
                </div>
                {!isCreating && !editingPolicy && (
                    <Button onClick={() => setIsCreating(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Policy
                    </Button>
                )}
            </div>

            {(isCreating || editingPolicy) && (
                <PolicyEditor
                    initialData={editingPolicy || undefined}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}

            <div className="border rounded-lg bg-card">
                <div className="p-4 border-b bg-muted/50">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">Active Policies</span>
                        <Badge variant="secondary">
                            {policies.filter(p => p.enabled).length} / {policies.length} Enabled
                        </Badge>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Loading policies...</p>
                    </div>
                ) : policies.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-3">
                        <AlertTriangle className="h-12 w-12 text-yellow-500 opacity-50" />
                        <div>
                            <p className="font-medium">No RLS policies configured</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                All data is accessible to users with connection access unless restricted.
                            </p>
                        </div>
                        <Button onClick={() => setIsCreating(true)} className="mt-2" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first policy
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Table</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {policies.map(policy => (
                                <TableRow key={policy.id}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{policy.name}</div>
                                            {policy.description && (
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {policy.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{policy.tableName}</TableCell>
                                    <TableCell>
                                        {policy.roleIds && policy.roleIds.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {policy.roleIds.slice(0, 2).map(role => (
                                                    <Badge key={role} variant="outline" className="text-xs">
                                                        {role}
                                                    </Badge>
                                                ))}
                                                {policy.roleIds.length > 2 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{policy.roleIds.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">All users</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{policy.priority}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={policy.mode === 'AND' ? 'default' : 'secondary'}>
                                            {policy.mode}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                                            {policy.enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setTestingPolicy(policy)}
                                                title="Test Policy"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingPolicy(policy)}
                                                title="Edit Policy"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                onClick={() => handleDelete(policy.id)}
                                                disabled={deletingId === policy.id}
                                                title="Delete Policy"
                                            >
                                                {deletingId === policy.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {testingPolicy && (
                <TestPolicyDialog
                    policy={testingPolicy}
                    onClose={() => setTestingPolicy(null)}
                />
            )}
        </div>
    );
}
