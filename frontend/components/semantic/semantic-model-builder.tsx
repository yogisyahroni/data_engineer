'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Database, Sparkles, Save, X } from 'lucide-react';
import { useCreateSemanticModel } from '@/hooks/use-semantic-layer';
import { toast } from 'sonner';
import type { CreateDimensionRequest, CreateMetricRequest } from '@/lib/types/semantic-layer';

interface SemanticModelBuilderProps {
    dataSourceId?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
    className?: string;
}

export function SemanticModelBuilder({
    dataSourceId: initialDataSourceId,
    onSuccess,
    onCancel,
    className,
}: SemanticModelBuilderProps) {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [dataSourceId, setDataSourceId] = React.useState(initialDataSourceId || '');
    const [tableName, setTableName] = React.useState('');
    const [dimensions, setDimensions] = React.useState<CreateDimensionRequest[]>([]);
    const [metrics, setMetrics] = React.useState<CreateMetricRequest[]>([]);

    const createModel = useCreateSemanticModel();

    const addDimension = () => {
        setDimensions([
            ...dimensions,
            {
                name: '',
                columnName: '',
                dataType: 'string',
                description: '',
                isHidden: false,
            },
        ]);
    };

    const removeDimension = (index: number) => {
        setDimensions(dimensions.filter((_, i) => i !== index));
    };

    const updateDimension = (index: number, field: keyof CreateDimensionRequest, value: any) => {
        const updated = [...dimensions];
        updated[index] = { ...updated[index], [field]: value };
        setDimensions(updated);
    };

    const addMetric = () => {
        setMetrics([
            ...metrics,
            {
                name: '',
                formula: '',
                description: '',
                format: '',
            },
        ]);
    };

    const removeMetric = (index: number) => {
        setMetrics(metrics.filter((_, i) => i !== index));
    };

    const updateMetric = (index: number, field: keyof CreateMetricRequest, value: string) => {
        const updated = [...metrics];
        updated[index] = { ...updated[index], [field]: value };
        setMetrics(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Model name is required');
            return;
        }
        if (!dataSourceId.trim()) {
            toast.error('Data source ID is required');
            return;
        }
        if (!tableName.trim()) {
            toast.error('Table name is required');
            return;
        }

        try {
            await createModel.mutateAsync({
                name: name.trim(),
                description: description.trim(),
                dataSourceId: dataSourceId.trim(),
                tableName: tableName.trim(),
                dimensions,
                metrics,
            });

            toast.success('Semantic model created successfully');
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create semantic model');
        }
    };

    return (
        <Card
            className={cn(
                'bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50',
                className
            )}
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                            <Database className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Create Semantic Model</h3>
                            <p className="text-sm text-muted-foreground">
                                Define business-friendly names for your data
                            </p>
                        </div>
                    </div>
                    {onCancel && (
                        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-500" />
                                Basic Information
                            </h4>

                            <div className="space-y-2">
                                <Label htmlFor="name">Model Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Sales, Customers, Products"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe what this model represents"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dataSourceId">Data Source ID *</Label>
                                    <Input
                                        id="dataSourceId"
                                        placeholder="e.g., ds-123"
                                        value={dataSourceId}
                                        onChange={(e) => setDataSourceId(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tableName">Table Name *</Label>
                                    <Input
                                        id="tableName"
                                        placeholder="e.g., sales_fact"
                                        value={tableName}
                                        onChange={(e) => setTableName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dimensions */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Dimensions</h4>
                                <Button type="button" variant="outline" size="sm" onClick={addDimension}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Dimension
                                </Button>
                            </div>

                            {dimensions.length === 0 ? (
                                <div className="text-center py-8 text-sm text-muted-foreground">
                                    No dimensions yet. Add dimensions to define business-friendly column names.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {dimensions.map((dim, index) => (
                                        <Card key={index} className="p-4 bg-card/50">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Dimension {index + 1}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeDimension(index)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Business Name</Label>
                                                        <Input
                                                            placeholder="e.g., Customer Name"
                                                            value={dim.name}
                                                            onChange={(e) => updateDimension(index, 'name', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Column Name</Label>
                                                        <Input
                                                            placeholder="e.g., customer_name"
                                                            value={dim.columnName}
                                                            onChange={(e) => updateDimension(index, 'columnName', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Data Type</Label>
                                                        <Select
                                                            value={dim.dataType}
                                                            onValueChange={(value) => updateDimension(index, 'dataType', value)}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="string">String</SelectItem>
                                                                <SelectItem value="number">Number</SelectItem>
                                                                <SelectItem value="date">Date</SelectItem>
                                                                <SelectItem value="boolean">Boolean</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Description</Label>
                                                        <Input
                                                            placeholder="Optional description"
                                                            value={dim.description}
                                                            onChange={(e) => updateDimension(index, 'description', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Metrics */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Metrics</h4>
                                <Button type="button" variant="outline" size="sm" onClick={addMetric}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Metric
                                </Button>
                            </div>

                            {metrics.length === 0 ? (
                                <div className="text-center py-8 text-sm text-muted-foreground">
                                    No metrics yet. Add metrics to define calculated measures.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {metrics.map((metric, index) => (
                                        <Card key={index} className="p-4 bg-card/50">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Metric {index + 1}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeMetric(index)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-destructive" />
                                                    </Button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Business Name</Label>
                                                        <Input
                                                            placeholder="e.g., Total Revenue"
                                                            value={metric.name}
                                                            onChange={(e) => updateMetric(index, 'name', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Formula</Label>
                                                        <Input
                                                            placeholder="e.g., SUM(revenue)"
                                                            value={metric.formula}
                                                            onChange={(e) => updateMetric(index, 'formula', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Format</Label>
                                                        <Input
                                                            placeholder="e.g., currency, percentage"
                                                            value={metric.format}
                                                            onChange={(e) => updateMetric(index, 'format', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Description</Label>
                                                        <Input
                                                            placeholder="Optional description"
                                                            value={metric.description}
                                                            onChange={(e) => updateMetric(index, 'description', e.target.value)}
                                                            className="h-9"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={createModel.isPending}>
                        {createModel.isPending ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Creating...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Create Model
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
