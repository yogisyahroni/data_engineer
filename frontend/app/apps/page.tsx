
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Layout, ExternalLink, Settings } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface DataApp {
    id: string;
    name: string;
    slug: string;
    description?: string;
    isPublished: boolean;
    _count: {
        pages: number;
    };
    updatedAt: string;
}

export default function AppsPage() {
    const router = useRouter();
    const { workspace } = useWorkspace();
    const { toast } = useToast();
    const [apps, setApps] = useState<DataApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newSlug, setNewSlug] = useState('');

    // Auto-generate slug from name
    useEffect(() => {
        if (createOpen && newName && !newSlug) {
            setNewSlug(
                newName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
            );
        }
    }, [newName, createOpen, newSlug]);

    useEffect(() => {
        if (workspace) {
            fetchApps();
        }
    }, [workspace]);

    const fetchApps = async () => {
        try {
            const res = await fetch(`/api/apps?workspaceId=${workspace?.id}`);
            if (!res.ok) throw new Error('Failed to fetch apps');
            const data = await res.json();
            setApps(data);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: 'Failed to load apps',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!workspace) return;
        setCreating(true);

        try {
            const res = await fetch('/api/apps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    slug: newSlug,
                    workspaceId: workspace.id,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create app');
            }

            const app = await res.json();
            toast({ title: 'Success', description: 'App created successfully' });
            setCreateOpen(false);
            setNewName('');
            setNewSlug('');
            // Redirect to builder
            router.push(`/apps/builder/${app.id}`);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to create app',
                variant: 'destructive',
            });
        } finally {
            setCreating(false);
        }
    };

    if (!workspace) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Data Apps</h1>
                    <p className="text-muted-foreground mt-2">
                        Build standalone analytical portals for your customers or teams.
                    </p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create App
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Data App</DialogTitle>
                            <DialogDescription>
                                This will create a dedicated portal with its own URL structure.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">App Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Sales Portal"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">URL Slug</Label>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground">app.insightengine.ai/</span>
                                    <Input
                                        id="slug"
                                        placeholder="sales-portal"
                                        value={newSlug}
                                        onChange={(e) => setNewSlug(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating}>
                                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create App
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : apps.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <Layout className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No apps yet</h3>
                    <p className="text-muted-foreground">Create your first Data App to get started.</p>
                    <Button variant="link" onClick={() => setCreateOpen(true)} className="mt-2">Create App</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apps.map((app) => (
                        <Card key={app.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="truncate">{app.name}</CardTitle>
                                    {app.isPublished ? (
                                        <Badge variant="default" className="bg-green-600">Published</Badge>
                                    ) : (
                                        <Badge variant="secondary">Draft</Badge>
                                    )}
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {app.description || 'No description provided.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground flex items-center gap-4">
                                    <span>{app._count.pages} Pages</span>
                                    <span>Updated {new Date(app.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 border-t pt-4">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={`/apps/builder/${app.id}`}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Configure
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/apps/public/${app.slug}`} target="_blank">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Preview
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
