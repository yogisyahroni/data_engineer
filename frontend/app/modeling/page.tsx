'use client';

import { useState, useEffect } from 'react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Database, ArrowRight, Table as TableIcon, Code } from 'lucide-react';
import { useConnections } from '@/hooks/use-connections';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ModelingPage() {
    // TODO: Get real workspaceId context
    const workspaceId = 'current_workspace';
    const { connections, isLoading: connectionsLoading } = useConnections({ userId: 'user_123' }); // fallback
    const [selectedConnId, setSelectedConnId] = useState<string>('');
    const [models, setModels] = useState<any[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const router = useRouter();

    // New Model State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newModelName, setNewModelName] = useState('');
    const [newModelTable, setNewModelTable] = useState(''); // Simple table name for MVP
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (selectedConnId) {
            fetchModels(selectedConnId);
        } else {
            setModels([]);
        }
    }, [selectedConnId]);

    const fetchModels = async (connId: string) => {
        setLoadingModels(true);
        try {
            // Fetch definitions linked to the workspace
            // Ideally backend filters by connectionId too, but we can filter client side if needed
            // The API /api/modeling/definitions takes query param workspaceId
            const res = await fetch(`/api/modeling/definitions?workspaceId=${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                // Filter by selected connection
                const relevantModels = data.models.filter((m: any) => m.connectionId === connId);
                setModels(relevantModels);
            }
        } catch (error) {
            console.error('Failed to load models', error);
            toast.error('Failed to load models');
        } finally {
            setLoadingModels(false);
        }
    };

    const handleCreateModel = async () => {
        if (!selectedConnId || !newModelName || !newModelTable) return;
        setCreating(true);
        try {
            const res = await fetch('/api/modeling/definitions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newModelName,
                    connectionId: selectedConnId,
                    workspaceId: workspaceId,
                    tableName: newModelTable, // Assuming direct table mapping for now
                    description: 'Created via Modeling UI'
                })
            });

            if (res.ok) {
                toast.success('Model created');
                setIsCreateOpen(false);
                fetchModels(selectedConnId);
                setNewModelName('');
                setNewModelTable('');
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create model');
            }
        } catch (error) {
            toast.error('Error creating model');
        } finally {
            setCreating(false);
        }
    };

    return (
        <SidebarLayout>
            <div className="flex flex-col h-full bg-background overflow-hidden font-sans">
                {/* Header */}
                <div className="border-b border-border bg-card px-8 py-6">
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Modeling Center</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Create semantic models from your tables. Add calculated metrics and formatting.
                    </p>
                </div>

                <div className="flex-1 overflow-auto p-8 space-y-8 pb-20">
                    {/* Connection Selector */}
                    <Card className="border-primary/10 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Database className="w-4 h-4 text-primary" />
                                Data Source
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {connectionsLoading ? (
                                <Skeleton className="h-10 w-full rounded-lg" />
                            ) : (
                                <Select value={selectedConnId} onValueChange={setSelectedConnId}>
                                    <SelectTrigger className="bg-background/50 border-border/50 ring-offset-background transition-all focus:ring-1 focus:ring-primary w-full md:w-[400px]">
                                        <SelectValue placeholder="Select a connection..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {connections.map(conn => (
                                            <SelectItem key={conn.id} value={conn.id}>
                                                {conn.name} <span className="text-muted-foreground ml-2 text-xs">({conn.type})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </CardContent>
                    </Card>

                    {/* Content Area */}
                    {!selectedConnId ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                            <Database className="w-16 h-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">Select a connection to view models</h3>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <TableIcon className="w-5 h-5 text-secondary" />
                                    Semantic Models
                                </h2>
                                <Button onClick={() => setIsCreateOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Model
                                </Button>
                            </div>

                            {loadingModels ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <Skeleton className="h-40 rounded-xl" />
                                    <Skeleton className="h-40 rounded-xl" />
                                </div>
                            ) : models.length === 0 ? (
                                <Card className="border-dashed border-2 border-muted bg-muted/10">
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <Code className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                                        <h3 className="text-lg font-medium">No Models Defined</h3>
                                        <p className="text-muted-foreground text-sm max-w-sm text-center mt-2 mb-6">
                                            Start by creating a model from a database table. This allows you to define custom metrics and logic.
                                        </p>
                                        <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create First Model</Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {models.map((model: any) => (
                                        <Card
                                            key={model.id}
                                            className="group hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md bg-card"
                                            onClick={() => router.push(`/modeling/${model.id}`)}
                                        >
                                            <CardHeader>
                                                <div className="flex justify-between items-start">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-110 transition-transform">
                                                        <TableIcon className="w-5 h-5" />
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <CardTitle className="text-lg">{model.name}</CardTitle>
                                                <CardDescription className="line-clamp-2">
                                                    Table: <span className="font-mono text-xs bg-muted px-1 rounded">{model.tableName || 'SQL Query'}</span>
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex gap-4 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-bold text-foreground">{model.virtualMetrics?.length || 0}</span> Metrics
                                                    </div>
                                                    {/* Add column count if available */}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Semantic Model</DialogTitle>
                        <DialogDescription>Link a database table to create a robust data model.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Model Name</Label>
                            <Input
                                placeholder="e.g. Sales Transactions"
                                value={newModelName}
                                onChange={e => setNewModelName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Source Table</Label>
                            <Input
                                placeholder="e.g. public.sales"
                                value={newModelTable}
                                onChange={e => setNewModelTable(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Currently supporting direct table mapping.</p>
                            {/* TODO: Add Table Selector Fetching from DB Schema */}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateModel} disabled={creating || !newModelName || !newModelTable}>
                            {creating ? 'Creating...' : 'Create Model'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarLayout>
    );
}
