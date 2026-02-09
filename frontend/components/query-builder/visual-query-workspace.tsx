'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Play,
    Save,
    FolderOpen,
    RotateCcw,
    Database,
    Filter,
    Calculator,
    Code2,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { VisualBuilder } from './visual-builder';
import { FilterBuilder } from './filter-builder';
import { AggregationBuilder } from './aggregation-builder';
import { SQLPreview } from './sql-preview';
import {
    VisualQueryConfig,
    TableSelection,
    JoinConfig,
    ColumnSelection,
    FilterGroup,
    SortRule,
    createInitialVisualQueryConfig,
} from '@/lib/query-builder/types';

interface VisualQueryWorkspaceProps {
    connectionId: string;
    onSave?: (config: VisualQueryConfig, metadata: SaveMetadata) => Promise<void>;
    onLoad?: () => Promise<VisualQueryConfig | null>;
    initialConfig?: VisualQueryConfig;
}

interface SaveMetadata {
    name: string;
    description?: string;
    tags?: string[];
}

interface QueryExecutionResult {
    success: boolean;
    data?: any[];
    columns?: string[];
    rowCount?: number;
    executionTime?: number;
    error?: string;
}

export function VisualQueryWorkspace({
    connectionId,
    onSave,
    onLoad,
    initialConfig,
}: VisualQueryWorkspaceProps) {
    const [config, setConfig] = useState<VisualQueryConfig>(
        initialConfig || createInitialVisualQueryConfig(connectionId)
    );
    const [activeTab, setActiveTab] = useState('tables');
    const [executing, setExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<QueryExecutionResult | null>(
        null
    );
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Track statistics
    const stats = {
        tables: config.tables.length,
        joins: config.joins.length,
        columns: config.columns.length,
        filters: config.filters.conditions.length,
        aggregations: config.aggregations.length,
        groupBy: config.groupBy.length,
    };

    const canExecute =
        config.tables.length > 0 && (config.columns.length > 0 || config.aggregations.length > 0);

    // Update handlers
    const handleTablesChange = (tables: TableSelection[]) => {
        setConfig((prev) => ({ ...prev, tables }));
        setHasUnsavedChanges(true);
    };

    const handleJoinsChange = (joins: JoinConfig[]) => {
        setConfig((prev) => ({ ...prev, joins }));
        setHasUnsavedChanges(true);
    };

    const handleColumnsChange = (columns: ColumnSelection[]) => {
        setConfig((prev) => ({ ...prev, columns }));
        setHasUnsavedChanges(true);
    };

    const handleFiltersChange = (filters: FilterGroup) => {
        setConfig((prev) => ({ ...prev, filters }));
        setHasUnsavedChanges(true);
    };

    const handleSortsChange = (sorts: SortRule[]) => {
        setConfig((prev) => ({ ...prev, sorts }));
        setHasUnsavedChanges(true);
    };

    const handleGroupByChange = (groupBy: string[]) => {
        setConfig((prev) => ({ ...prev, groupBy }));
        setHasUnsavedChanges(true);
    };

    const handleAggregationsChange = (aggregations: ColumnSelection[]) => {
        setConfig((prev) => ({ ...prev, aggregations }));
        setHasUnsavedChanges(true);
    };

    const handleHavingChange = (having: FilterGroup) => {
        setConfig((prev) => ({ ...prev, having }));
        setHasUnsavedChanges(true);
    };

    // Execute query
    const handleExecute = async () => {
        if (!canExecute) {
            toast.error('Please select tables and columns first');
            return;
        }

        setExecuting(true);
        setExecutionResult(null);

        try {
            const response = await fetch('/api/visual-queries/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connection_id: connectionId,
                    config,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Query execution failed');
            }

            const result = await response.json();
            setExecutionResult({
                success: true,
                data: result.data || [],
                columns: result.columns || [],
                rowCount: result.row_count || 0,
                executionTime: result.execution_time || 0,
            });

            toast.success(
                `Query executed successfully (${result.row_count || 0} rows in ${result.execution_time || 0
                }ms)`
            );
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setExecutionResult({
                success: false,
                error: errorMessage,
            });
            toast.error('Query execution failed: ' + errorMessage);
        } finally {
            setExecuting(false);
        }
    };

    // Clear workspace
    const handleClear = () => {
        if (
            hasUnsavedChanges &&
            !confirm('You have unsaved changes. Are you sure you want to clear the workspace?')
        ) {
            return;
        }

        setConfig(createInitialVisualQueryConfig(connectionId));
        setExecutionResult(null);
        setHasUnsavedChanges(false);
        toast.info('Workspace cleared');
    };

    // Save query
    const handleSaveClick = async () => {
        if (!onSave) {
            toast.error('Save functionality not configured');
            return;
        }

        // TODO: Open SaveQueryDialog to get metadata
        // For now, use simple prompt
        const name = prompt('Enter query name:');
        if (!name) return;

        const description = prompt('Enter query description (optional):');

        try {
            await onSave(config, {
                name,
                description: description || undefined,
            });
            setHasUnsavedChanges(false);
            toast.success('Query saved successfully');
        } catch (err) {
            toast.error('Failed to save query');
        }
    };

    // Load query
    const handleLoadClick = async () => {
        if (!onLoad) {
            toast.error('Load functionality not configured');
            return;
        }

        if (
            hasUnsavedChanges &&
            !confirm('You have unsaved changes. Continue loading?')
        ) {
            return;
        }

        try {
            const loadedConfig = await onLoad();
            if (loadedConfig) {
                setConfig(loadedConfig);
                setHasUnsavedChanges(false);
                setExecutionResult(null);
                toast.success('Query loaded successfully');
            }
        } catch (err) {
            toast.error('Failed to load query');
        }
    };

    // Get available columns for filters/aggregations
    const availableColumns = config.columns.map((col) => col.column);

    // Column types (simplified - could be enhanced with schema info)
    const columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'> = {};
    config.columns.forEach((col) => {
        // Default to string - could be enhanced with actual schema
        columnTypes[col.column] = 'string';
    });

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleExecute}
                                disabled={!canExecute || executing}
                                className="gap-2"
                            >
                                {executing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                                Execute Query
                            </Button>

                            <Separator orientation="vertical" className="h-8" />

                            <Button
                                variant="outline"
                                onClick={handleSaveClick}
                                disabled={!onSave || !canExecute}
                                className="gap-2"
                            >
                                <Save className="h-4 w-4" />
                                Save
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleLoadClick}
                                disabled={!onLoad}
                                className="gap-2"
                            >
                                <FolderOpen className="h-4 w-4" />
                                Load
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleClear}
                                className="gap-2"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Clear
                            </Button>
                        </div>

                        <div className="flex items-center gap-3">
                            {hasUnsavedChanges && (
                                <Badge variant="outline" className="gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Unsaved
                                </Badge>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{stats.tables} tables</span>
                                <span>·</span>
                                <span>{stats.joins} joins</span>
                                <span>·</span>
                                <span>{stats.columns} columns</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Workspace */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="tables" className="gap-2">
                        <Database className="h-4 w-4" />
                        Tables & Joins
                        {stats.tables > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                                {stats.tables}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="filters" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                        {stats.filters > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                                {stats.filters}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="aggregations" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Aggregations
                        {stats.aggregations > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                                {stats.aggregations}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="sql" className="gap-2">
                        <Code2 className="h-4 w-4" />
                        SQL Preview
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tables" className="space-y-0">
                    <VisualBuilder
                        connectionId={connectionId}
                        tables={config.tables}
                        joins={config.joins}
                        columns={config.columns}
                        onTablesChange={handleTablesChange}
                        onJoinsChange={handleJoinsChange}
                        onColumnsChange={handleColumnsChange}
                    />
                </TabsContent>

                <TabsContent value="filters" className="space-y-0">
                    <FilterBuilder
                        availableColumns={availableColumns}
                        columnTypes={columnTypes}
                        filters={config.filters}
                        onFiltersChange={handleFiltersChange}
                    />
                </TabsContent>

                <TabsContent value="aggregations" className="space-y-0">
                    <AggregationBuilder
                        availableColumns={availableColumns}
                        columnTypes={columnTypes}
                        groupBy={config.groupBy}
                        aggregations={config.aggregations}
                        having={config.having}
                        onGroupByChange={handleGroupByChange}
                        onAggregationsChange={handleAggregationsChange}
                        onHavingChange={handleHavingChange}
                    />
                </TabsContent>

                <TabsContent value="sql" className="space-y-0">
                    <SQLPreview config={config} connectionId={connectionId} />
                </TabsContent>
            </Tabs>

            {/* Results Panel */}
            {executionResult && (
                <Card>
                    <CardContent className="pt-6">
                        {executionResult.success ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span className="font-medium">Query Results</span>
                                        <Badge variant="outline">
                                            {executionResult.rowCount} rows
                                        </Badge>
                                        <span className="text-muted-foreground">
                                            in {executionResult.executionTime}ms
                                        </span>
                                    </div>
                                </div>

                                {/* Simple table display - could be enhanced with proper ResultsTable component */}
                                <div className="border rounded-md overflow-auto max-h-[400px]">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted sticky top-0">
                                            <tr>
                                                {executionResult.columns?.map((col) => (
                                                    <th
                                                        key={col}
                                                        className="px-4 py-2 text-left font-medium"
                                                    >
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {executionResult.data?.slice(0, 100).map((row, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-t hover:bg-muted/50"
                                                >
                                                    {executionResult.columns?.map((col) => (
                                                        <td key={col} className="px-4 py-2">
                                                            {String(row[col] ?? '')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {executionResult.rowCount! > 100 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        Showing first 100 of {executionResult.rowCount} rows
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 p-4 border border-destructive/50 rounded-md bg-destructive/5">
                                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium text-destructive">
                                        Query Execution Error
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {executionResult.error}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
