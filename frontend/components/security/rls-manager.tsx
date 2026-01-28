
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { PolicyEditor } from '@/components/security/policy-editor';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RLSPolicy {
    id: string;
    name: string;
    tableName: string;
    role: string;
    condition: string;
    isActive: boolean;
}

export function RLSManager() {
    const [policies, setPolicies] = useState<RLSPolicy[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPolicies = async () => {
        setIsLoading(true);
        try {
            // Hardcoded workspace ID matching the editor
            const res = await fetch('/api/security/policies?workspaceId=clq...mock');
            if (res.ok) {
                const data = await res.json();
                setPolicies(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this policy?')) return;
        try {
            await fetch(`/api/security/policies/${id}`, { method: 'DELETE' });
            toast.success('Policy deleted');
            fetchPolicies();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    {/* Header removed as it will be inside a Tab */}
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Policy
                    </Button>
                )}
            </div>

            {isCreating && (
                <PolicyEditor
                    onSave={() => { setIsCreating(false); fetchPolicies(); }}
                    onCancel={() => setIsCreating(false)}
                />
            )}

            <div className="border rounded-lg bg-card text-card-foreground">
                <div className="p-4 border-b flex justify-between items-center bg-muted/50">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-600" />
                        Active RLS Policies
                    </h3>
                    <span className="text-xs text-muted-foreground">
                        {policies.length} Policies Active
                    </span>
                </div>
                <div className="divide-y">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Loading policies...</div>
                    ) : policies.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
                            <p>No active policies found.</p>
                            <p className="text-xs">All data is visible to users with access unless restricted.</p>
                        </div>
                    ) : (
                        policies.map(policy => (
                            <div key={policy.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {policy.name}
                                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border dark:bg-slate-800 dark:text-slate-400">
                                            {policy.role || 'USER'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1 font-mono">
                                        Table: <span className="text-foreground">{policy.tableName}</span>
                                        {' '} WHERE <span className="text-yellow-600 dark:text-yellow-500">{policy.condition}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(policy.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
