'use client';

import { useState, useEffect } from 'react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Calculator, Trash2, Save, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { CreateCalculatedFieldDialog } from '@/components/semantic/create-calculated-field-dialog';

interface ModelEditorPageProps {
    params: {
        id: string;
    }
}

export default function ModelEditorPage({ params }: ModelEditorPageProps) {
    const modelId = params.id;
    const router = useRouter();
    const [model, setModel] = useState<any>(null);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    useEffect(() => {
        loadModelData();
    }, [modelId]);

    const loadModelData = async () => {
        setLoading(true);
        try {
            // Load Model Definition
            const resModel = await fetch(`/api/modeling/definitions/${modelId}`);
            if (!resModel.ok) throw new Error('Failed to load model');
            const modelData = await resModel.json();
            setModel(modelData);

            // Load Metrics
            // The model endpoint might return metrics, but let's be explicit or check response
            // Previous api/modeling/definitions/[id] returns "include: { virtualMetrics: true }"
            if (modelData.virtualMetrics) {
                setMetrics(modelData.virtualMetrics);
            } else {
                // Fallback if needed
                const resMetrics = await fetch(`/api/modeling/definitions/${modelId}/metrics`);
                if (resMetrics.ok) {
                    setMetrics(await resMetrics.json());
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load model data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMetric = async (field: any) => {
        try {
            const res = await fetch(`/api/modeling/definitions/${modelId}/metrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: field.name,
                    expression: field.expression,
                    description: field.description,
                    format: field.dataType // Mapping dataType to format for now, or just use description
                })
            });

            if (res.ok) {
                toast.success('Metric created');
                loadModelData(); // Reload to get updated list
            } else {
                toast.error('Failed to create metric');
            }
        } catch (error) {
            toast.error('Error creating metric');
        }
    };

    const handleDeleteMetric = async (metricId: string) => {
        if (!confirm('Are you sure you want to delete this metric?')) return;
        try {
            const res = await fetch(`/api/modeling/metrics/${metricId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success('Metric deleted');
                setMetrics(metrics.filter(m => m.id !== metricId));
            } else {
                toast.error('Failed to delete metric');
            }
        } catch (error) {
            toast.error('Error deleting metric');
        }
    };

    if (loading) {
        return (
            <SidebarLayout>
                <div className="p-8 space-y-4">
                    <Skeleton className="h-12 w-1/3" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </SidebarLayout>
        );
    }

    if (!model) {
        return (
            <SidebarLayout>
                <div className="p-8 text-center">
                    <h2 className="text-xl font-bold text-destructive">Model not found</h2>
                    <Button variant="ghost" onClick={() => router.back()} className="mt-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                </div>
            </SidebarLayout>
        );
    }

    return (
        <SidebarLayout>
            <div className="flex flex-col h-full bg-background font-sans">
                {/* Header */}
                <div className="border-b border-border bg-card px-8 py-6 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-6 px-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Models
                            </Button>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">{model.name}</h1>
                        <p className="text-muted-foreground text-sm font-mono mt-1 bg-muted/50 inline-block px-2 py-0.5 rounded">
                            {model.tableName || 'Custom SQL'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={loadModelData}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                        </Button>
                        {/* <Button size="sm">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button> */}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 space-y-8">

                    {/* Metrics Section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-primary" />
                                    Virtual Metrics
                                </CardTitle>
                                <CardDescription>
                                    Define calculations to be computed on the fly by the SQL engine.
                                </CardDescription>
                            </div>
                            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Metric
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {metrics.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                                    <p>No metrics defined for this model.</p>
                                    <Button variant="link" onClick={() => setShowCreateDialog(true)}>Create one now</Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Expression</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {metrics.map((metric) => (
                                            <TableRow key={metric.id}>
                                                <TableCell className="font-medium text-primary">
                                                    {metric.name}
                                                </TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono border border-border">
                                                        {metric.expression}
                                                    </code>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {metric.description || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteMetric(metric.id)}
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

                    {/* Columns Preview (Future Feature: Hide/Show Columns) */}
                    {/* <Card className="opacity-50">
                        <CardHeader>
                            <CardTitle className="text-base text-muted-foreground">Source Columns (Coming Soon)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Manage column visibility and aliases here.</p>
                        </CardContent>
                    </Card> */}
                </div>
            </div>

            <CreateCalculatedFieldDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                connectionId={model.connectionId}
                modelId={modelId}
                existingMetrics={metrics.map((m: any) => m.name)}
                onSave={handleCreateMetric}
            />
        </SidebarLayout>
    );
}
