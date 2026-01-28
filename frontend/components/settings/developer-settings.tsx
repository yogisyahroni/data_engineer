'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Copy, Trash2, CheckCircle, Terminal } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    scopes: string[];
}

export function DeveloperSettings() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [createName, setCreateName] = useState('');
    const [openDialog, setOpenDialog] = useState(false);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/settings/keys');
            const data = await res.json();
            if (data.success) {
                setKeys(data.keys);
            }
        } catch (error) {
            toast.error('Failed to load API keys');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateKey = async () => {
        if (!createName) return;
        setIsCreating(true);
        try {
            const res = await fetch('/api/settings/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: createName })
            });
            const data = await res.json();
            if (data.success) {
                setNewKey(data.apiKey.plainTextKey);
                setKeys([data.apiKey, ...keys]);
                toast.success('API Key created');
            } else {
                toast.error(data.error);
            }
        } catch (error) {
            toast.error('Failed to create key');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/settings/keys/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setKeys(keys.filter(k => k.id !== id));
                toast.success('Key revoked');
            }
        } catch (error) {
            toast.error('Failed to revoke key');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setNewKey(null);
        setCreateName('');
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Developer Settings</h2>
                    <p className="text-sm text-muted-foreground">Manage API keys and access documentation.</p>
                </div>
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create New Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create API Key</DialogTitle>
                            <DialogDescription>
                                API keys allow external services to access InsightEngine on your behalf.
                            </DialogDescription>
                        </DialogHeader>

                        {!newKey ? (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Key Name</Label>
                                    <Input
                                        placeholder="e.g. CI/CD Pipeline"
                                        value={createName}
                                        onChange={(e) => setCreateName(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <AlertDescription className="text-green-800 dark:text-green-300">
                                        Key created successfully! Copy it now, you won't see it again.
                                    </AlertDescription>
                                </Alert>
                                <div className="space-y-2">
                                    <Label>Your API Key</Label>
                                    <div className="flex items-center gap-2">
                                        <Input value={newKey} readOnly className="font-mono bg-muted" />
                                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKey)}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            {!newKey ? (
                                <Button onClick={handleCreateKey} disabled={!createName || isCreating}>
                                    {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                    Create Key
                                </Button>
                            ) : (
                                <Button onClick={handleCloseDialog}>Done</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>Active keys associated with your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : keys.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No API keys found. Create one to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Prefix</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Last Used</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-medium">{key.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{key.prefix}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(key.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteKey(key.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Alert>
                <Terminal className="w-4 h-4" />
                <AlertDescription>
                    Looking for the API Reference? Check out the <a href="/docs" target="_blank" className="font-semibold underline hover:text-primary">Interactive Documentation</a>.
                </AlertDescription>
            </Alert>
        </div>
    );
}
