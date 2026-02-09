'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Eye, Code } from 'lucide-react';
import { RLSPolicy } from './rls-manager';

interface TestPolicyDialogProps {
    policy: RLSPolicy;
    onClose: () => void;
}

interface UserContext {
    userId: string;
    email: string;
    roles: string[];
    teamIds: string[];
    attributes: Record<string, any>;
}

interface TestResult {
    originalQuery: string;
    modifiedQuery: string;
    evaluatedCondition: string;
}

export function TestPolicyDialog({ policy, onClose }: TestPolicyDialogProps) {
    const [userContext, setUserContext] = useState<UserContext>({
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['VIEWER'],
        teamIds: ['team-alpha', 'team-beta'],
        attributes: {}
    });
    const [sampleQuery, setSampleQuery] = useState(`SELECT * FROM ${policy.tableName} WHERE status = 'active'`);
    const [attributeKey, setAttributeKey] = useState('');
    const [attributeValue, setAttributeValue] = useState('');
    const [testing, setTesting] = useState(false);
    const [result, setResult] = useState<TestResult | null>(null);

    const handleAddAttribute = () => {
        if (attributeKey.trim() && attributeValue.trim()) {
            setUserContext({
                ...userContext,
                attributes: {
                    ...userContext.attributes,
                    [attributeKey.trim()]: attributeValue.trim()
                }
            });
            setAttributeKey('');
            setAttributeValue('');
        }
    };

    const handleRemoveAttribute = (key: string) => {
        const newAttributes = { ...userContext.attributes };
        delete newAttributes[key];
        setUserContext({ ...userContext, attributes: newAttributes });
    };

    const handleTest = async () => {
        setTesting(true);
        setResult(null);

        try {
            const res = await fetch(`/api/rls/policies/${policy.id}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    userContext: {
                        userId: userContext.userId,
                        email: userContext.email,
                        roles: userContext.roles,
                        teamIds: userContext.teamIds,
                        attributes: userContext.attributes
                    },
                    sampleQuery
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to test policy');
            }

            const data = await res.json();
            setResult(data);
            toast.success('Policy test completed');
        } catch (err: any) {
            toast.error(err.message || 'Error testing policy');
            console.error(err);
        } finally {
            setTesting(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Test RLS Policy: {policy.name}
                    </DialogTitle>
                    <DialogDescription>
                        Simulate policy execution with a mock user context and sample query
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Policy Info */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-medium mb-2">Policy Details</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">Table:</span>{' '}
                                <code className="bg-muted px-1.5 py-0.5 rounded">{policy.tableName}</code>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Priority:</span>{' '}
                                <Badge variant="secondary">{policy.priority}</Badge>
                            </div>
                            <div className="col-span-2">
                                <span className="text-muted-foreground">Condition:</span>{' '}
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{policy.condition}</code>
                            </div>
                        </div>
                    </div>

                    {/* User Context */}
                    <div className="space-y-3">
                        <h4 className="font-medium">Mock User Context</h4>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="userId">User ID</Label>
                                <Input
                                    id="userId"
                                    value={userContext.userId}
                                    onChange={e => setUserContext({ ...userContext, userId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={userContext.email}
                                    onChange={e => setUserContext({ ...userContext, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="roles">Roles (comma-separated)</Label>
                            <Input
                                id="roles"
                                value={userContext.roles.join(', ')}
                                onChange={e => setUserContext({
                                    ...userContext,
                                    roles: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
                                })}
                                placeholder="VIEWER, EDITOR"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="teamIds">Team IDs (comma-separated)</Label>
                            <Input
                                id="teamIds"
                                value={userContext.teamIds.join(', ')}
                                onChange={e => setUserContext({
                                    ...userContext,
                                    teamIds: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                                })}
                                placeholder="team-alpha, team-beta"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Custom Attributes</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={attributeKey}
                                    onChange={e => setAttributeKey(e.target.value)}
                                    placeholder="Key (e.g., tenant_id)"
                                    className="flex-1"
                                />
                                <Input
                                    value={attributeValue}
                                    onChange={e => setAttributeValue(e.target.value)}
                                    placeholder="Value"
                                    className="flex-1"
                                />
                                <Button type="button" variant="outline" onClick={handleAddAttribute}>
                                    Add
                                </Button>
                            </div>
                            {Object.keys(userContext.attributes).length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {Object.entries(userContext.attributes).map(([key, value]) => (
                                        <Badge key={key} variant="secondary" className="flex items-center gap-1">
                                            {key}: {value}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttribute(key)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sample Query */}
                    <div className="space-y-2">
                        <Label htmlFor="sampleQuery">Sample SQL Query</Label>
                        <Textarea
                            id="sampleQuery"
                            value={sampleQuery}
                            onChange={e => setSampleQuery(e.target.value)}
                            className="font-mono text-sm"
                            rows={4}
                        />
                    </div>

                    {/* Test Button */}
                    <Button onClick={handleTest} disabled={testing} className="w-full">
                        {testing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {testing ? 'Testing...' : 'Run Test'}
                    </Button>

                    {/* Result */}
                    {result && (
                        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                            <h4 className="font-medium flex items-center gap-2">
                                <Code className="h-4 w-4" />
                                Test Result
                            </h4>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Evaluated Condition</Label>
                                    <code className="block bg-muted p-3 rounded text-sm mt-1 overflow-x-auto">
                                        {result.evaluatedCondition}
                                    </code>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Original Query</Label>
                                        <code className="block bg-muted p-3 rounded text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                                            {result.originalQuery}
                                        </code>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Modified Query (with RLS)</Label>
                                        <code className="block bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                                            {result.modifiedQuery}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
