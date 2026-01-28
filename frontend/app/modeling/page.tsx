'use client';

import { useState, useEffect } from 'react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Database, Calculator, LayoutGrid, Trash2, ArrowRight, Info, Link2, Share2 } from 'lucide-react';
import { useConnections } from '@/hooks/use-connections';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function ModelingPage() {
    // TODO: Get real userId
    const userId = 'user_123';
    const { connections, isLoading: connectionsLoading } = useConnections({ userId });
    const [selectedConnId, setSelectedConnId] = useState<string>('');
    const [metrics, setMetrics] = useState<any[]>([]);
    const [dimensions, setDimensions] = useState<any[]>([]);
    const [relationships, setRelationships] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Metric Form State
    const [newMetric, setNewMetric] = useState({
        name: '',
        label: '',
        type: 'sum',
        definition: '',
        description: ''
    });

    // New Dimension Form State
    const [newDimension, setNewDimension] = useState({
        name: '',
        label: '',
        type: 'string',
        columnName: '',
        tableName: '',
        description: ''
    });

    // New Relationship Form State
    const [newRel, setNewRel] = useState({
        fromTable: '',
        fromColumn: '',
        toTable: '',
        toColumn: '',
        type: 'one-to-many'
    });

    useEffect(() => {
        if (selectedConnId) {
            fetchMetrics(selectedConnId);
            fetchDimensions(selectedConnId);
            fetchRelationships(selectedConnId);
        }
    }, [selectedConnId]);

    const fetchMetrics = async (connId: string) => {
        const res = await fetch(`/api/semantic/metrics?connectionId=${connId}`);
        const data = await res.json();
        setMetrics(data);
    };

    const fetchDimensions = async (connId: string) => {
        const res = await fetch(`/api/semantic/dimensions?connectionId=${connId}`);
        const data = await res.json();
        setDimensions(data);
    };

    const fetchRelationships = async (connId: string) => {
        const res = await fetch(`/api/semantic/relationships?connectionId=${connId}`);
        const data = await res.json();
        setRelationships(data);
    };

    const handleCreateMetric = async () => {
        if (!selectedConnId) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/semantic/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newMetric, connectionId: selectedConnId })
            });
            if (res.ok) {
                toast.success('Metric created');
                fetchMetrics(selectedConnId);
                setNewMetric({ name: '', label: '', type: 'sum', definition: '', description: '' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateDimension = async () => {
        if (!selectedConnId) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/semantic/dimensions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newDimension, connectionId: selectedConnId })
            });
            if (res.ok) {
                toast.success('Dimension created');
                fetchDimensions(selectedConnId);
                setNewDimension({ name: '', label: '', type: 'string', columnName: '', tableName: '', description: '' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateRelationship = async () => {
        if (!selectedConnId) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/semantic/relationships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newRel, connectionId: selectedConnId })
            });
            if (res.ok) {
                toast.success('Relationship created');
                fetchRelationships(selectedConnId);
                setNewRel({ fromTable: '', fromColumn: '', toTable: '', toColumn: '', type: 'one-to-many' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMetric = async (id: string) => {
        if (!confirm('Delete this metric? This cannot be undone.')) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/semantic/metrics/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Metric deleted');
                fetchMetrics(selectedConnId);
            } else {
                toast.error('Failed to delete metric');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDimension = async (id: string) => {
        if (!confirm('Delete this dimension? This cannot be undone.')) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/semantic/dimensions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Dimension deleted');
                fetchDimensions(selectedConnId);
            } else {
                toast.error('Failed to delete dimension');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRelationship = async (id: string) => {
        if (!confirm('Delete this relationship? This cannot be undone.')) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/semantic/relationships/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Relationship deleted');
                fetchRelationships(selectedConnId);
            } else {
                toast.error('Failed to delete relationship');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SidebarLayout>
            <div className="flex flex-col h-full bg-background overflow-hidden font-sans">
                {/* Header */}
                <div className="border-b border-border bg-card px-8 py-6">
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Modeling Center</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Define metrics, dimensions, and logical joins for your business brain.
                    </p>
                </div>

                <div className="flex-1 overflow-auto p-8 space-y-8 pb-20">
                    {/* Connection Selector */}
                    <Card className="border-primary/10 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Database className="w-4 h-4 text-primary" />
                                Active Connection
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {connectionsLoading ? (
                                <Skeleton className="h-10 w-full rounded-lg" />
                            ) : (
                                <Select value={selectedConnId} onValueChange={setSelectedConnId}>
                                    <SelectTrigger className="bg-background/50 border-border/50 ring-offset-background transition-all focus:ring-1 focus:ring-primary">
                                        <SelectValue placeholder="Select a connection to manage its model..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {connections.map(conn => (
                                            <SelectItem key={conn.id} value={conn.id} className="focus:bg-primary/10 transition-colors">
                                                {conn.name}
                                                <span className="ml-2 text-[10px] opacity-50 uppercase tracking-widest">{conn.type}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </CardContent>
                    </Card>

                    {!selectedConnId && (
                        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner mb-6 rotate-3">
                                <Database className="w-10 h-10 text-primary opacity-40 hover:scale-110 transition-transform cursor-pointer" />
                            </div>
                            <h3 className="text-xl font-semibold tracking-tight">Ready to Model</h3>
                            <p className="text-muted-foreground max-w-[320px] mt-2 leading-relaxed">Choose a data source above to begin defining your business definitions and table relationships.</p>
                        </div>
                    )}

                    {selectedConnId && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
                            {/* Control Panel */}
                            <div className="lg:col-span-4 space-y-6">
                                <Tabs defaultValue="metric" className="w-full">
                                    <TabsList className="grid grid-cols-3 w-full h-11 p-1 bg-muted/50 rounded-xl border border-border/50">
                                        <TabsTrigger value="metric" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all text-xs font-medium">Metric</TabsTrigger>
                                        <TabsTrigger value="dimension" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all text-xs font-medium">Dim</TabsTrigger>
                                        <TabsTrigger value="rel" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all text-xs font-medium">Join</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="metric" className="mt-4 ring-offset-background focus-visible:outline-none">
                                        <Card className="border-primary/20 bg-primary/[0.02] overflow-hidden shadow-lg shadow-primary/5">
                                            <div className="h-1 w-full bg-gradient-to-r from-primary to-transparent" />
                                            <CardHeader className="pb-4">
                                                <CardTitle className="text-base font-bold">New Metric</CardTitle>
                                                <CardDescription className="text-xs">Aggregated calculations like Revenue or Conversion.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Identifier</Label>
                                                    <Input placeholder="total_profit" className="h-9 font-mono text-xs focus-visible:ring-1" value={newMetric.name} onChange={e => setNewMetric({ ...newMetric, name: e.target.value })} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Display Label</Label>
                                                    <Input placeholder="Total Profit" className="h-9 focus-visible:ring-1" value={newMetric.label} onChange={e => setNewMetric({ ...newMetric, label: e.target.value })} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Operation</Label>
                                                    <Select value={newMetric.type} onValueChange={v => setNewMetric({ ...newMetric, type: v })}>
                                                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="sum">Sum</SelectItem>
                                                            <SelectItem value="avg">Avg</SelectItem>
                                                            <SelectItem value="count">Count</SelectItem>
                                                            <SelectItem value="formula">SQL Formula</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Formula</Label>
                                                    <Input placeholder="revenue - costs" className="h-9 font-mono text-xs focus-visible:ring-1" value={newMetric.definition} onChange={e => setNewMetric({ ...newMetric, definition: e.target.value })} />
                                                </div>
                                                <Button className="w-full mt-2 shadow-inner" size="sm" disabled={isSubmitting || !newMetric.name || !newMetric.definition} onClick={handleCreateMetric}>
                                                    <Plus className="w-3.5 h-3.5 mr-2" /> Create Metric
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="dimension" className="mt-4 ring-offset-background focus-visible:outline-none">
                                        <Card className="border-secondary/20 bg-secondary/[0.02] overflow-hidden shadow-lg shadow-secondary/5">
                                            <div className="h-1 w-full bg-gradient-to-r from-secondary to-transparent" />
                                            <CardHeader className="pb-4">
                                                <CardTitle className="text-base font-bold">New Dimension</CardTitle>
                                                <CardDescription className="text-xs">Logical groups for filtering and breakdowns.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Identifier</Label>
                                                    <Input placeholder="geo_region" className="h-9 font-mono text-xs focus-visible:ring-1" value={newDimension.name} onChange={e => setNewDimension({ ...newDimension, name: e.target.value })} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Display Label</Label>
                                                    <Input placeholder="Region" className="h-9 focus-visible:ring-1" value={newDimension.label} onChange={e => setNewDimension({ ...newDimension, label: e.target.value })} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Table</Label>
                                                        <Input placeholder="users" className="h-9 font-mono text-xs focus-visible:ring-1" value={newDimension.tableName} onChange={e => setNewDimension({ ...newDimension, tableName: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Column</Label>
                                                        <Input placeholder="region_name" className="h-9 font-mono text-xs focus-visible:ring-1" value={newDimension.columnName} onChange={e => setNewDimension({ ...newDimension, columnName: e.target.value })} />
                                                    </div>
                                                </div>
                                                <Button className="w-full mt-2 shadow-inner variant-secondary" size="sm" disabled={isSubmitting || !newDimension.name || !newDimension.columnName} onClick={handleCreateDimension}>
                                                    <Plus className="w-3.5 h-3.5 mr-2" /> Create Dimension
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="rel" className="mt-4 ring-offset-background focus-visible:outline-none">
                                        <Card className="border-amber-500/20 bg-amber-500/[0.02] overflow-hidden shadow-lg shadow-amber-500/5">
                                            <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-transparent" />
                                            <CardHeader className="pb-4">
                                                <CardTitle className="text-base font-bold text-amber-600">Virtual Join</CardTitle>
                                                <CardDescription className="text-xs text-amber-600/70">Connect tables logically without SQL Foreign Keys.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">From Table</Label>
                                                        <Input placeholder="orders" className="h-9 font-mono text-xs" value={newRel.fromTable} onChange={e => setNewRel({ ...newRel, fromTable: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Key</Label>
                                                        <Input placeholder="user_id" className="h-9 font-mono text-xs" value={newRel.fromColumn} onChange={e => setNewRel({ ...newRel, fromColumn: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">To Table</Label>
                                                        <Input placeholder="users" className="h-9 font-mono text-xs" value={newRel.toTable} onChange={e => setNewRel({ ...newRel, toTable: e.target.value })} />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Key</Label>
                                                        <Input placeholder="id" className="h-9 font-mono text-xs" value={newRel.toColumn} onChange={e => setNewRel({ ...newRel, toColumn: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Cardinality</Label>
                                                    <Select value={newRel.type} onValueChange={v => setNewRel({ ...newRel, type: v as any })}>
                                                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="one-to-one">One to One (1:1)</SelectItem>
                                                            <SelectItem value="one-to-many">One to Many (1:N)</SelectItem>
                                                            <SelectItem value="many-to-many">Many to Many (N:M)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white shadow-inner" size="sm" disabled={isSubmitting || !newRel.fromTable || !newRel.toTable} onClick={handleCreateRelationship}>
                                                    <Link2 className="w-3.5 h-3.5 mr-2" /> Save Relationship
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* Viewer Panel */}
                            <div className="lg:col-span-8 space-y-6">
                                <Tabs defaultValue="metrics" className="w-full">
                                    <TabsList className="bg-transparent h-10 border-b border-border/50 w-full justify-start rounded-none px-0 gap-6">
                                        <TabsTrigger value="metrics" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 h-10 text-sm font-semibold transition-all">
                                            Metrics <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">{metrics.length}</Badge>
                                        </TabsTrigger>
                                        <TabsTrigger value="dimensions" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 h-10 text-sm font-semibold transition-all">
                                            Dimensions <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">{dimensions.length}</Badge>
                                        </TabsTrigger>
                                        <TabsTrigger value="rels" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none px-0 h-10 text-sm font-semibold transition-all">
                                            Visual Schema <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">{relationships.length}</Badge>
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="metrics" className="mt-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {metrics.length === 0 ? (
                                                <EmptyState icon={<Calculator className="w-10 h-10 opacity-20" />} title="Empty Metrics" description="Define how your business KPIs are calculated." />
                                            ) : metrics.map(m => (
                                                <ModelingCard key={m.id} badge={m.type} title={m.label} sub={m.name} formula={m.definition} color="primary" onDelete={() => handleDeleteMetric(m.id)} />
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="dimensions" className="mt-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {dimensions.length === 0 ? (
                                                <EmptyState icon={<LayoutGrid className="w-10 h-10 opacity-20" />} title="Empty Dimensions" description="Identify categories for analysis." />
                                            ) : dimensions.map(d => (
                                                <ModelingCard key={d.id} badge={d.type} title={d.label} sub={d.name} detail={`${d.tableName}.${d.columnName}`} color="secondary" onDelete={() => handleDeleteDimension(d.id)} />
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="rels" className="mt-6 animate-in slide-in-from-left-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {relationships.length === 0 ? (
                                                <EmptyState icon={<Link2 className="w-10 h-10 opacity-20" />} title="No joins defined" description="Connect tables to enable automatic JOIN generation." />
                                            ) : relationships.map(r => (
                                                <Card key={r.id} className="group hover:border-amber-500/50 transition-all border-border shadow-md shadow-black/5 bg-card">
                                                    <CardContent className="p-5">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="bg-amber-500/10 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border border-amber-500/20">{r.type}</div>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRelationship(r.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                                                            <div className="flex flex-col items-center gap-1 flex-1">
                                                                <span className="text-[10px] text-muted-foreground uppercase font-mono">{r.fromTable}</span>
                                                                <span className="text-xs font-bold font-mono tracking-tight">{r.fromColumn}</span>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-8 h-[1px] bg-amber-500/30 relative">
                                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                                                        <Link2 className="w-2.5 h-2.5 text-amber-600" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-center gap-1 flex-1">
                                                                <span className="text-[10px] text-muted-foreground uppercase font-mono">{r.toTable}</span>
                                                                <span className="text-xs font-bold font-mono tracking-tight">{r.toColumn}</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SidebarLayout>
    );
}

function ModelingCard({ badge, title, sub, formula, detail, color, onDelete }: { badge: string, title: string, sub: string, formula?: string, detail?: string, color: 'primary' | 'secondary', onDelete?: () => void }) {
    const isPrimary = color === 'primary';
    return (
        <Card className={`group hover:scale-[1.02] transition-all border-border shadow-md shadow-black/5 bg-card relative overflow-hidden active:scale-100`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPrimary ? 'bg-primary' : 'bg-secondary'}`} />
            <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <Badge variant="secondary" className={`text-[9px] uppercase font-bold py-0 h-4 border-none shadow-sm ${isPrimary ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>{badge}</Badge>
                        <CardTitle className="text-base font-bold tracking-tight mt-1">{title}</CardTitle>
                        <CardDescription className="text-xs font-mono opacity-60">{sub}</CardDescription>
                    </div>
                    {onDelete && <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all text-destructive hover:bg-destructive/5"><Trash2 className="w-3.5 h-3.5" /></Button>}
                </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
                {formula ? (
                    <div className="bg-muted/30 p-2.5 rounded-lg text-[11px] font-mono border border-border/50 text-muted-foreground">
                        <span className={isPrimary ? 'text-primary/70' : 'text-secondary/70'}>{badge.toUpperCase()}(</span>
                        {formula}
                        <span className={isPrimary ? 'text-primary/70' : 'text-secondary/70'}>)</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/50">
                        <Database className="w-3 h-3 opacity-40 text-secondary" /> {detail}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="col-span-full py-20 flex flex-col items-center justify-center bg-card/40 rounded-3xl border border-dashed border-border/60">
            {icon}
            <h4 className="mt-4 font-bold text-base tracking-tight">{title}</h4>
            <p className="text-muted-foreground text-xs mt-1 px-8 text-center leading-relaxed opacity-60">{description}</p>
        </div>
    );
}
