'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    Controls,
    Background,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Panel,
    NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Database,
    Plus,
    Play,
    Save,
    X,
    ChevronRight,
    Table as TableIcon,
    Link2,
    Eye,
    Settings2,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Data Blend Types
 */

export type BlendSource = {
    id: string;
    dataSourceId: string;
    dataSourceName: string;
    tableName: string;
    alias: string;
    columns: string[];
    schema?: string;
    databaseType: string;
};

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

export type JoinOperator = '=' | '!=' | '<' | '<=' | '>' | '>=';

export type JoinCondition = {
    leftSource: string;
    leftColumn: string;
    rightSource: string;
    rightColumn: string;
    operator: JoinOperator;
};

export type BlendJoin = {
    id: string;
    leftSource: string;
    rightSource: string;
    type: JoinType;
    conditions: JoinCondition[];
};

export type BlendQuery = {
    id: string;
    name: string;
    sources: BlendSource[];
    joins: BlendJoin[];
    filters?: any[];
    orderBy?: string[];
    limit?: number;
};

export type BlendResult = {
    columns: Array<{ name: string; dataType: string; source: string }>;
    rows: any[][];
    stats: {
        sourceRowCounts: Record<string, number>;
        joinedRowCount: number;
        executionTimeMs: number;
    };
};

/**
 * Props
 */

export interface DataBlendBuilderProps {
    /** Available data sources */
    dataSources: Array<{
        id: string;
        name: string;
        type: string;
        tables?: string[];
    }>;

    /** Initial blend query */
    initialQuery?: BlendQuery;

    /** Callback when blend is executed */
    onExecuteBlend: (query: BlendQuery) => Promise<BlendResult>;

    /** Callback when blend is saved */
    onSaveBlend?: (query: BlendQuery) => Promise<void>;

    /** Show preview by default */
    showPreview?: boolean;
}

/**
 * Source Node Component
 */
function SourceNode({ data }: { data: any }) {
    const { source, onRemove, onToggleColumn } = data;

    return (
        <Card className="min-w-[250px] shadow-lg">
            <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        <div>
                            <div className="font-semibold text-sm">{source.dataSourceName}</div>
                            <div className="text-xs text-muted-foreground">
                                {source.tableName} ({source.alias})
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRemove(source.id)}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>
            <ScrollArea className="max-h-[200px]">
                <div className="p-2 space-y-1">
                    {source.columns.length > 0 ? (
                        source.columns.map((col: string, idx: number) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded text-xs"
                            >
                                <Checkbox
                                    id={`${source.id}-${col}`}
                                    checked={true}
                                    onCheckedChange={(checked) => onToggleColumn(source.id, col, checked)}
                                />
                                <label
                                    htmlFor={`${source.id}-${col}`}
                                    className="flex-1 cursor-pointer"
                                >
                                    {col}
                                </label>
                            </div>
                        ))
                    ) : (
                        <div className="text-xs text-muted-foreground text-center py-2">
                            No columns selected
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-2 border-t bg-muted/10 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                    {source.databaseType}
                </Badge>
            </div>
        </Card>
    );
}

/**
 * Data Blend Builder Component
 */
export function DataBlendBuilder({
    dataSources,
    initialQuery,
    onExecuteBlend,
    onSaveBlend,
    showPreview = true,
}: DataBlendBuilderProps) {
    // State
    const [blendName, setBlendName] = useState(initialQuery?.name || 'Untitled Blend');
    const [sources, setSources] = useState<BlendSource[]>(initialQuery?.sources || []);
    const [joins, setJoins] = useState<BlendJoin[]>(initialQuery?.joins || []);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedJoin, setSelectedJoin] = useState<BlendJoin | null>(null);
    const [showJoinDialog, setShowJoinDialog] = useState(false);
    const [showSourceDialog, setShowSourceDialog] = useState(false);
    const [showPreviewPanel, setShowPreviewPanel] = useState(showPreview);
    const [previewResult, setPreviewResult] = useState<BlendResult | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // Node types
    const nodeTypes: NodeTypes = useMemo(
        () => ({
            source: SourceNode,
        }),
        []
    );

    // Convert sources to nodes
    React.useEffect(() => {
        const newNodes: Node[] = sources.map((source, idx) => ({
            id: source.id,
            type: 'source',
            position: { x: 100 + idx * 300, y: 100 },
            data: {
                source,
                onRemove: handleRemoveSource,
                onToggleColumn: handleToggleColumn,
            },
        }));
        setNodes(newNodes);
    }, [sources]);

    // Convert joins to edges
    React.useEffect(() => {
        const newEdges: Edge[] = joins.map((join) => ({
            id: join.id,
            source: join.leftSource,
            target: join.rightSource,
            label: join.type,
            type: 'smoothstep',
            animated: true,
            style: { stroke: getJoinColor(join.type) },
            data: { join },
        }));
        setEdges(newEdges);
    }, [joins]);

    /**
     * Get join color based on type
     */
    const getJoinColor = (type: JoinType): string => {
        switch (type) {
            case 'INNER':
                return '#3b82f6';
            case 'LEFT':
                return '#10b981';
            case 'RIGHT':
                return '#f59e0b';
            case 'FULL':
                return '#8b5cf6';
            default:
                return '#6b7280';
        }
    };

    /**
     * Handle add source
     */
    const handleAddSource = (dataSourceId: string, tableName: string) => {
        const dataSource = dataSources.find((ds) => ds.id === dataSourceId);
        if (!dataSource) return;

        const newSource: BlendSource = {
            id: `source-${Date.now()}`,
            dataSourceId,
            dataSourceName: dataSource.name,
            tableName,
            alias: `${tableName.toLowerCase()}_${sources.length + 1}`,
            columns: ['*'], // Will be populated when fetching schema
            databaseType: dataSource.type,
        };

        setSources([...sources, newSource]);
        setShowSourceDialog(false);
        toast.success(`Added ${tableName} to blend`);
    };

    /**
     * Handle remove source
     */
    const handleRemoveSource = (sourceId: string) => {
        // Remove related joins
        const updatedJoins = joins.filter(
            (j) => j.leftSource !== sourceId && j.rightSource !== sourceId
        );
        setJoins(updatedJoins);

        // Remove source
        setSources(sources.filter((s) => s.id !== sourceId));
        toast.success('Source removed');
    };

    /**
     * Handle toggle column
     */
    const handleToggleColumn = (sourceId: string, column: string, checked: boolean) => {
        setSources(
            sources.map((s) => {
                if (s.id === sourceId) {
                    if (checked) {
                        return {
                            ...s,
                            columns: s.columns.includes(column) ? s.columns : [...s.columns, column],
                        };
                    } else {
                        return {
                            ...s,
                            columns: s.columns.filter((c) => c !== column),
                        };
                    }
                }
                return s;
            })
        );
    };

    /**
     * Handle connection (drag to create join)
     */
    const onConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) return;

            const newJoin: BlendJoin = {
                id: `join-${Date.now()}`,
                leftSource: connection.source,
                rightSource: connection.target,
                type: 'INNER',
                conditions: [],
            };

            setSelectedJoin(newJoin);
            setShowJoinDialog(true);
        },
        []
    );

    /**
     * Handle save join
     */
    const handleSaveJoin = (join: BlendJoin) => {
        const existingIndex = joins.findIndex((j) => j.id === join.id);
        if (existingIndex >= 0) {
            const updated = [...joins];
            updated[existingIndex] = join;
            setJoins(updated);
        } else {
            setJoins([...joins, join]);
        }
        setShowJoinDialog(false);
        setSelectedJoin(null);
        toast.success('Join configured');
    };

    /**
     * Handle execute blend
     */
    const handleExecuteBlend = async () => {
        if (sources.length < 2) {
            toast.error('Add at least 2 sources to blend');
            return;
        }

        if (joins.length < 1) {
            toast.error('Add at least 1 join between sources');
            return;
        }

        const query: BlendQuery = {
            id: initialQuery?.id || `blend-${Date.now()}`,
            name: blendName,
            sources,
            joins,
        };

        setIsExecuting(true);
        try {
            const result = await onExecuteBlend(query);
            setPreviewResult(result);
            setShowPreviewPanel(true);
            toast.success(`Blend executed: ${result.stats.joinedRowCount} rows`);
        } catch (error: any) {
            toast.error(`Blend failed: ${error.message}`);
        } finally {
            setIsExecuting(false);
        }
    };

    /**
     * Handle save blend
     */
    const handleSaveBlend = async () => {
        if (!onSaveBlend) return;

        const query: BlendQuery = {
            id: initialQuery?.id || `blend-${Date.now()}`,
            name: blendName,
            sources,
            joins,
        };

        try {
            await onSaveBlend(query);
            toast.success('Blend saved successfully');
        } catch (error: any) {
            toast.error(`Save failed: ${error.message}`);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link2 className="h-5 w-5 text-primary" />
                    <Input
                        value={blendName}
                        onChange={(e) => setBlendName(e.target.value)}
                        className="w-[300px]"
                        placeholder="Blend name..."
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSourceDialog(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Source
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        {showPreviewPanel ? 'Hide' : 'Show'} Preview
                    </Button>
                    {onSaveBlend && (
                        <Button variant="outline" size="sm" onClick={handleSaveBlend}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                    )}
                    <Button size="sm" onClick={handleExecuteBlend} disabled={isExecuting}>
                        <Play className="h-4 w-4 mr-2" />
                        {isExecuting ? 'Executing...' : 'Execute'}
                    </Button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                    <Panel position="top-left">
                        <Card className="p-3 shadow-lg">
                            <div className="text-xs space-y-1">
                                <div><strong>Sources:</strong> {sources.length}</div>
                                <div><strong>Joins:</strong> {joins.length}</div>
                            </div>
                        </Card>
                    </Panel>
                </ReactFlow>
            </div>

            {/* Preview Panel */}
            {showPreviewPanel && previewResult && (
                <div className="h-[300px] border-t bg-muted/30">
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Preview Results</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{previewResult.stats.joinedRowCount} rows</span>
                                <span>{previewResult.stats.executionTimeMs}ms</span>
                            </div>
                        </div>
                        <ScrollArea className="h-[200px]">
                            {/* Results table would go here */}
                            <div className="text-sm text-muted-foreground">
                                Preview table implementation...
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}

            {/* Add Source Dialog */}
            <AddSourceDialog
                open={showSourceDialog}
                onOpenChange={setShowSourceDialog}
                dataSources={dataSources}
                onAddSource={handleAddSource}
            />

            {/* Join Editor Dialog */}
            {selectedJoin && (
                <JoinEditorDialog
                    open={showJoinDialog}
                    onOpenChange={setShowJoinDialog}
                    join={selectedJoin}
                    sources={sources}
                    onSave={handleSaveJoin}
                />
            )}
        </div>
    );
}

/**
 * Add Source Dialog
 */
function AddSourceDialog({
    open,
    onOpenChange,
    dataSources,
    onAddSource,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dataSources: any[];
    onAddSource: (dataSourceId: string, tableName: string) => void;
}) {
    const [selectedDataSource, setSelectedDataSource] = useState('');
    const [selectedTable, setSelectedTable] = useState('');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Data Source</DialogTitle>
                    <DialogDescription>
                        Select a data source and table to add to your blend
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Data Source</Label>
                        <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select data source" />
                            </SelectTrigger>
                            <SelectContent>
                                {dataSources.map((ds) => (
                                    <SelectItem key={ds.id} value={ds.id}>
                                        {ds.name} ({ds.type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Table</Label>
                        <Input
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(e.target.value)}
                            placeholder="Enter table name"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => {
                            if (selectedDataSource && selectedTable) {
                                onAddSource(selectedDataSource, selectedTable);
                                setSelectedDataSource('');
                                setSelectedTable('');
                            }
                        }}
                        disabled={!selectedDataSource || !selectedTable}
                    >
                        Add Source
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Join Editor Dialog
 */
function JoinEditorDialog({
    open,
    onOpenChange,
    join,
    sources,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    join: BlendJoin;
    sources: BlendSource[];
    onSave: (join: BlendJoin) => void;
}) {
    const [editedJoin, setEditedJoin] = useState(join);

    const leftSource = sources.find((s) => s.id === join.leftSource);
    const rightSource = sources.find((s) => s.id === join.rightSource);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Configure Join</DialogTitle>
                    <DialogDescription>
                        {leftSource?.alias} → {rightSource?.alias}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Join Type</Label>
                        <Select
                            value={editedJoin.type}
                            onValueChange={(value: JoinType) =>
                                setEditedJoin({ ...editedJoin, type: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INNER">INNER JOIN</SelectItem>
                                <SelectItem value="LEFT">LEFT JOIN</SelectItem>
                                <SelectItem value="RIGHT">RIGHT JOIN</SelectItem>
                                <SelectItem value="FULL">FULL OUTER JOIN</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label>Join Conditions</Label>
                        <div className="text-sm text-muted-foreground mb-2">
                            TODO: Add condition builder UI
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => onSave(editedJoin)}>Save Join</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
