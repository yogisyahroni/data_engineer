'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Database, Filter, TrendingUp, X, Copy, Check } from 'lucide-react';
import { useSemanticModels, useSemanticMetrics, useExecuteSemanticQuery } from '@/hooks/use-semantic-layer';
import { toast } from 'sonner';
import type { SemanticQueryRequest } from '@/lib/types/semantic-layer';

interface SemanticQueryBuilderProps {
    modelId?: string;
    className?: string;
}

export function SemanticQueryBuilder({ modelId: initialModelId, className }: SemanticQueryBuilderProps) {
    const [selectedModelId, setSelectedModelId] = React.useState(initialModelId || '');
    const [selectedDimensions, setSelectedDimensions] = React.useState<string[]>([]);
    const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>([]);
    const [filters, setFilters] = React.useState<Record<string, string>>({});
    const [limit, setLimit] = React.useState(100);
    const [sqlCopied, setSqlCopied] = React.useState(false);

    const { data: models, isLoading: modelsLoading } = useSemanticModels();
    const executeQuery = useExecuteSemanticQuery();

    const selectedModel = models?.find((m) => m.id === selectedModelId);
    const dimensions = selectedModel?.dimensions || [];
    const metrics = selectedModel?.metrics || [];

    const handleExecute = async () => {
        if (!selectedModelId) {
            toast.error('Please select a model');
            return;
        }

        if (selectedDimensions.length === 0 && selectedMetrics.length === 0) {
            toast.error('Please select at least one dimension or metric');
            return;
        }

        const request: SemanticQueryRequest = {
            modelId: selectedModelId,
            dimensions: selectedDimensions,
            metrics: selectedMetrics,
            filters: filters,
            limit,
        };

        try {
            await executeQuery.mutateAsync(request);
            toast.success('Query executed successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to execute query');
        }
    };

    const toggleDimension = (dimName: string) => {
        setSelectedDimensions((prev) =>
            prev.includes(dimName) ? prev.filter((d) => d !== dimName) : [...prev, dimName]
        );
    };

    const toggleMetric = (metricName: string) => {
        setSelectedMetrics((prev) =>
            prev.includes(metricName) ? prev.filter((m) => m !== metricName) : [...prev, metricName]
        );
    };

    const addFilter = (dimName: string) => {
        setFilters({ ...filters, [dimName]: '' });
    };

    const updateFilter = (dimName: string, value: string) => {
        setFilters({ ...filters, [dimName]: value });
    };

    const removeFilter = (dimName: string) => {
        const newFilters = { ...filters };
        delete newFilters[dimName];
        setFilters(newFilters);
    };

    const handleCopySQL = () => {
        if (executeQuery.data?.sql) {
            navigator.clipboard.writeText(executeQuery.data.sql);
            setSqlCopied(true);
            toast.success('SQL copied to clipboard');
            setTimeout(() => setSqlCopied(false), 2000);
        }
    };

    if (modelsLoading) {
        return (
            <Card className={cn('p-6', className)}>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </Card>
        );
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Query Builder */}
            <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-blue-600/20 flex items-center justify-center">
                            <Database className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold">Semantic Query Builder</h3>
                            <p className="text-sm text-muted-foreground">
                                Query your data using business terms
                            </p>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-2">
                        <Label>Select Model</Label>
                        <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a semantic model" />
                            </SelectTrigger>
                            <SelectContent>
                                {models?.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedModelId && (
                        <>
                            {/* Dimensions */}
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <Database className="w-4 h-4 text-blue-500" />
                                    Dimensions
                                </Label>
                                {dimensions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No dimensions available</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {dimensions.map((dim) => (
                                            <Badge
                                                key={dim.id}
                                                variant={selectedDimensions.includes(dim.name) ? 'default' : 'outline'}
                                                className="cursor-pointer hover:bg-primary/80"
                                                onClick={() => toggleDimension(dim.name)}
                                            >
                                                {dim.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Metrics */}
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                    Metrics
                                </Label>
                                {metrics.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No metrics available</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {metrics.map((metric) => (
                                            <Badge
                                                key={metric.id}
                                                variant={selectedMetrics.includes(metric.name) ? 'default' : 'outline'}
                                                className="cursor-pointer hover:bg-primary/80"
                                                onClick={() => toggleMetric(metric.name)}
                                            >
                                                {metric.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Filters */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-purple-500" />
                                        Filters
                                    </Label>
                                    {selectedDimensions.length > 0 && (
                                        <Select
                                            onValueChange={(value) => {
                                                if (!filters[value]) {
                                                    addFilter(value);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="w-[200px] h-8">
                                                <SelectValue placeholder="Add filter" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {selectedDimensions
                                                    .filter((dim) => !filters[dim])
                                                    .map((dim) => (
                                                        <SelectItem key={dim} value={dim}>
                                                            {dim}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {Object.keys(filters).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No filters applied</p>
                                ) : (
                                    <div className="space-y-2">
                                        {Object.entries(filters).map(([dimName, value]) => (
                                            <div key={dimName} className="flex items-center gap-2">
                                                <Label className="w-32 text-sm">{dimName}</Label>
                                                <Input
                                                    placeholder="Filter value"
                                                    value={value}
                                                    onChange={(e) => updateFilter(dimName, e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFilter(dimName)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Limit */}
                            <div className="space-y-2">
                                <Label>Limit</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={10000}
                                    value={limit}
                                    onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                                    className="w-32"
                                />
                            </div>

                            {/* Execute Button */}
                            <Button
                                onClick={handleExecute}
                                disabled={executeQuery.isPending}
                                className="w-full"
                            >
                                {executeQuery.isPending ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span>
                                        Executing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Execute Query
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </Card>

            {/* Results */}
            {executeQuery.data && (
                <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50">
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Generated SQL</h4>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopySQL}
                                className="h-8"
                            >
                                {sqlCopied ? (
                                    <>
                                        <Check className="w-3 h-3 mr-2" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3 mr-2" />
                                        Copy
                                    </>
                                )}
                            </Button>
                        </div>

                        <ScrollArea className="h-[200px]">
                            <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto">
                                <code>{executeQuery.data.sql}</code>
                            </pre>
                        </ScrollArea>

                        {executeQuery.data.args && executeQuery.data.args.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Arguments</h4>
                                <div className="flex flex-wrap gap-2">
                                    {executeQuery.data.args.map((arg, index) => (
                                        <Badge key={index} variant="secondary">
                                            {String(arg)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Dimensions</p>
                                <p className="text-sm font-medium">{executeQuery.data.dimensions.length}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Metrics</p>
                                <p className="text-sm font-medium">{executeQuery.data.metrics.length}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Row Count</p>
                                <p className="text-sm font-medium">{executeQuery.data.rowCount}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Empty State */}
            {!selectedModelId && !modelsLoading && (
                <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50">
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-blue-600/20 flex items-center justify-center mx-auto mb-4">
                            <Database className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Select a Model to Start</h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Choose a semantic model from the dropdown above to start building your query using
                            business-friendly terms.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
