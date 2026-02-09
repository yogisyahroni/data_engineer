'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    closestCenter,
    useDraggable,
} from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    Database,
    Columns,
    Link as LinkIcon,
    Trash2,
    Plus,
    Lightbulb,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface TableSchema {
    name: string;
    schema?: string;
    columns: ColumnInfo[];
}

interface ColumnInfo {
    name: string;
    type: string;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
}

interface JoinSuggestion {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    joinType: 'INNER' | 'LEFT' | 'RIGHT';
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}

interface TableNode {
    id: string;
    tableName: string;
    position: { x: number; y: number };
}

interface JoinEdge {
    id: string;
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER';
}

interface VisualBuilderProps {
    connectionId: string;
    tables: TableSchema[];
    onQueryChange: (config: {
        tables: TableNode[];
        joins: JoinEdge[];
    }) => void;
}

export function VisualBuilder({
    connectionId,
    tables,
    onQueryChange,
}: VisualBuilderProps) {
    // State
    const [selectedTables, setSelectedTables] = useState<TableNode[]>([]);
    const [joins, setJoins] = useState<JoinEdge[]>([]);
    const [suggestions, setSuggestions] = useState<JoinSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [draggedTable, setDraggedTable] = useState<TableSchema | null>(null);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Fetch join suggestions when tables change
    useEffect(() => {
        if (selectedTables.length < 2) {
            setSuggestions([]);
            return;
        }

        fetchJoinSuggestions();
    }, [selectedTables]);

    // Propagate changes to parent
    useEffect(() => {
        onQueryChange({ tables: selectedTables, joins });
    }, [selectedTables, joins, onQueryChange]);

    const fetchJoinSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
            const response = await fetch('/api/visual-queries/join-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connectionId,
                    tableNames: selectedTables.map((t) => t.tableName),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch join suggestions');
            }

            const data = await response.json();
            setSuggestions(data.suggestions || []);
        } catch (error) {
            console.error('Error fetching join suggestions:', error);
            toast.error('Failed to fetch join suggestions');
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const tableId = event.active.id as string;
        const table = tables.find((t) => t.name === tableId);
        setActiveId(tableId);
        setDraggedTable(table || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setDraggedTable(null);

        // If dropped on canvas
        if (over && over.id === 'canvas') {
            const tableId = active.id as string;
            const table = tables.find((t) => t.name === tableId);

            if (!table) return;

            // Check if table already added
            if (selectedTables.some((t) => t.tableName === table.name)) {
                toast.warning(`Table "${table.name}" is already on the canvas`);
                return;
            }

            // Calculate position (simple grid layout)
            const newPosition = {
                x: 50 + (selectedTables.length % 3) * 280,
                y: 50 + Math.floor(selectedTables.length / 3) * 250,
            };

            const newNode: TableNode = {
                id: `table-${Date.now()}`,
                tableName: table.name,
                position: newPosition,
            };

            setSelectedTables([...selectedTables, newNode]);
            toast.success(`Added table "${table.name}"`);
        }
    };

    const handleRemoveTable = (tableId: string) => {
        const table = selectedTables.find((t) => t.id === tableId);
        if (!table) return;

        // Remove table
        setSelectedTables(selectedTables.filter((t) => t.id !== tableId));

        // Remove associated joins
        setJoins(
            joins.filter(
                (j) => j.fromTable !== table.tableName && j.toTable !== table.tableName
            )
        );

        toast.success(`Removed table "${table.tableName}"`);
    };

    const handleAddJoin = (
        fromTable: string,
        toTable: string,
        fromColumn: string,
        toColumn: string,
        joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER' = 'INNER'
    ) => {
        // Check if join already exists
        const existingJoin = joins.find(
            (j) =>
                (j.fromTable === fromTable &&
                    j.toTable === toTable &&
                    j.fromColumn === fromColumn &&
                    j.toColumn === toColumn) ||
                (j.fromTable === toTable &&
                    j.toTable === fromTable &&
                    j.fromColumn === toColumn &&
                    j.toColumn === fromColumn)
        );

        if (existingJoin) {
            toast.warning('This join already exists');
            return;
        }

        const newJoin: JoinEdge = {
            id: `join-${Date.now()}`,
            fromTable,
            fromColumn,
            toTable,
            toColumn,
            joinType,
        };

        setJoins([...joins, newJoin]);
        toast.success(`Added ${joinType} join`);
    };

    const handleApplySuggestion = (suggestion: JoinSuggestion) => {
        handleAddJoin(
            suggestion.fromTable,
            suggestion.toTable,
            suggestion.fromColumn,
            suggestion.toColumn,
            suggestion.joinType
        );
    };

    const handleRemoveJoin = (joinId: string) => {
        setJoins(joins.filter((j) => j.id !== joinId));
        toast.success('Removed join');
    };

    const handleUpdateJoinType = (
        joinId: string,
        newType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER'
    ) => {
        setJoins(
            joins.map((j) => (j.id === joinId ? { ...j, joinType: newType } : j))
        );
    };

    const getTableSchema = (tableName: string): TableSchema | undefined => {
        return tables.find((t) => t.name === tableName);
    };

    const getConfidenceBadgeColor = (
        confidence: 'high' | 'medium' | 'low'
    ): string => {
        switch (confidence) {
            case 'high':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'medium':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'low':
                return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        }
    };

    return (
        <div className="flex h-full gap-4">
            {/* Left Panel - Available Tables */}
            <div className="w-64 flex-shrink-0">
                <Card className="h-full">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Available Tables
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[calc(100vh-200px)]">
                            <div className="p-4 space-y-2">
                                {tables.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No tables available
                                    </p>
                                ) : (
                                    tables.map((table) => (
                                        <DraggableTableCard
                                            key={table.name}
                                            table={table}
                                            isSelected={selectedTables.some(
                                                (t) => t.tableName === table.name
                                            )}
                                        />
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Center - Canvas */}
            <div className="flex-1 flex flex-col gap-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <Card className="flex-1">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Table className="h-4 w-4" />
                                    Query Canvas
                                </CardTitle>
                                <Badge variant="outline">
                                    {selectedTables.length} table(s)
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent
                            id="canvas"
                            className="relative bg-muted/20 rounded-lg min-h-[400px] border-2 border-dashed border-muted-foreground/20"
                        >
                            {selectedTables.length === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center space-y-2">
                                        <Table className="h-12 w-12 mx-auto text-muted-foreground/50" />
                                        <p className="text-sm text-muted-foreground">
                                            Drag tables from the left panel to start building your
                                            query
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative w-full h-full min-h-[400px]">
                                    {/* Render table nodes */}
                                    {selectedTables.map((node) => {
                                        const tableSchema = getTableSchema(node.tableName);
                                        if (!tableSchema) return null;

                                        return (
                                            <div
                                                key={node.id}
                                                className="absolute"
                                                style={{
                                                    left: node.position.x,
                                                    top: node.position.y,
                                                }}
                                            >
                                                <Card className="w-64 shadow-lg">
                                                    <CardHeader className="pb-2 bg-primary/5">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Table className="h-4 w-4 text-primary" />
                                                                <span className="font-semibold text-sm">
                                                                    {tableSchema.name}
                                                                </span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => handleRemoveTable(node.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="p-2">
                                                        <ScrollArea className="max-h-32">
                                                            <div className="space-y-1">
                                                                {tableSchema.columns.map((col) => (
                                                                    <div
                                                                        key={col.name}
                                                                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded hover:bg-muted/50"
                                                                    >
                                                                        <Columns className="h-3 w-3 text-muted-foreground" />
                                                                        <span className="flex-1">{col.name}</span>
                                                                        {col.isPrimaryKey && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="h-4 text-[10px] px-1"
                                                                            >
                                                                                PK
                                                                            </Badge>
                                                                        )}
                                                                        {col.isForeignKey && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="h-4 text-[10px] px-1"
                                                                            >
                                                                                FK
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        );
                                    })}

                                    {/* SVG for join lines - simplified version */}
                                    {joins.length > 0 && (
                                        <svg
                                            className="absolute inset-0 pointer-events-none"
                                            style={{ width: '100%', height: '100%' }}
                                        >
                                            {joins.map((join) => {
                                                const fromNode = selectedTables.find(
                                                    (t) => t.tableName === join.fromTable
                                                );
                                                const toNode = selectedTables.find(
                                                    (t) => t.tableName === join.toTable
                                                );

                                                if (!fromNode || !toNode) return null;

                                                // Simple line calculation
                                                const x1 = fromNode.position.x + 128; // center of card
                                                const y1 = fromNode.position.y + 60;
                                                const x2 = toNode.position.x + 128;
                                                const y2 = toNode.position.y + 60;

                                                return (
                                                    <g key={join.id}>
                                                        <line
                                                            x1={x1}
                                                            y1={y1}
                                                            x2={x2}
                                                            y2={y2}
                                                            stroke="hsl(var(--primary))"
                                                            strokeWidth="2"
                                                            strokeDasharray={
                                                                join.joinType === 'LEFT' ? '5,5' : ''
                                                            }
                                                            opacity="0.5"
                                                        />
                                                        <circle
                                                            cx={(x1 + x2) / 2}
                                                            cy={(y1 + y2) / 2}
                                                            r="12"
                                                            fill="hsl(var(--background))"
                                                            stroke="hsl(var(--primary))"
                                                            strokeWidth="2"
                                                        />
                                                        <text
                                                            x={(x1 + x2) / 2}
                                                            y={(y1 + y2) / 2}
                                                            textAnchor="middle"
                                                            dominantBaseline="middle"
                                                            className="text-[10px] font-bold fill-primary"
                                                        >
                                                            {join.joinType[0]}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <DragOverlay>
                        {activeId && draggedTable ? (
                            <Card className="w-64 shadow-xl opacity-50">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <Table className="h-4 w-4" />
                                        <span className="font-semibold text-sm">
                                            {draggedTable.name}
                                        </span>
                                    </div>
                                </CardHeader>
                            </Card>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Right Panel - Joins & Suggestions */}
            <div className="w-80 flex-shrink-0">
                <Tabs defaultValue="joins" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="joins">
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Joins ({joins.length})
                        </TabsTrigger>
                        <TabsTrigger value="suggestions">
                            <Lightbulb className="h-4 w-4 mr-2" />
                            Suggestions
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="joins" className="flex-1 mt-2">
                        <Card className="h-full">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Active Joins</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[calc(100vh-300px)]">
                                    <div className="p-4 space-y-3">
                                        {joins.length === 0 ? (
                                            <div className="text-center py-8 space-y-2">
                                                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                                <p className="text-sm text-muted-foreground">
                                                    No joins defined yet
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Add tables and use suggestions
                                                </p>
                                            </div>
                                        ) : (
                                            joins.map((join) => (
                                                <Card key={join.id} className="p-3">
                                                    <div className="space-y-2">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1 space-y-1">
                                                                <div className="text-xs font-mono">
                                                                    <span className="font-semibold">
                                                                        {join.fromTable}
                                                                    </span>
                                                                    .{join.fromColumn}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    →
                                                                </div>
                                                                <div className="text-xs font-mono">
                                                                    <span className="font-semibold">
                                                                        {join.toTable}
                                                                    </span>
                                                                    .{join.toColumn}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => handleRemoveJoin(join.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <Separator />
                                                        <Select
                                                            value={join.joinType}
                                                            onValueChange={(value) =>
                                                                handleUpdateJoinType(
                                                                    join.id,
                                                                    value as
                                                                    | 'INNER'
                                                                    | 'LEFT'
                                                                    | 'RIGHT'
                                                                    | 'FULL OUTER'
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="h-7 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="INNER">
                                                                    INNER JOIN
                                                                </SelectItem>
                                                                <SelectItem value="LEFT">LEFT JOIN</SelectItem>
                                                                <SelectItem value="RIGHT">
                                                                    RIGHT JOIN
                                                                </SelectItem>
                                                                <SelectItem value="FULL OUTER">
                                                                    FULL OUTER JOIN
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="suggestions" className="flex-1 mt-2">
                        <Card className="h-full">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    Auto Suggestions
                                    {loadingSuggestions && (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[calc(100vh-300px)]">
                                    <div className="p-4 space-y-3">
                                        {selectedTables.length < 2 ? (
                                            <div className="text-center py-8 space-y-2">
                                                <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                                <p className="text-sm text-muted-foreground">
                                                    Add at least 2 tables to see suggestions
                                                </p>
                                            </div>
                                        ) : loadingSuggestions ? (
                                            <div className="text-center py-8">
                                                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    Analyzing relationships...
                                                </p>
                                            </div>
                                        ) : suggestions.length === 0 ? (
                                            <div className="text-center py-8 space-y-2">
                                                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                                <p className="text-sm text-muted-foreground">
                                                    No join suggestions found
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Define joins manually
                                                </p>
                                            </div>
                                        ) : (
                                            suggestions.map((suggestion, idx) => (
                                                <Card key={idx} className="p-3">
                                                    <div className="space-y-2">
                                                        <div className="flex items-start justify-between">
                                                            <Badge
                                                                variant="outline"
                                                                className={getConfidenceBadgeColor(
                                                                    suggestion.confidence
                                                                )}
                                                            >
                                                                {suggestion.confidence}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 text-xs"
                                                                onClick={() =>
                                                                    handleApplySuggestion(suggestion)
                                                                }
                                                            >
                                                                <Plus className="h-3 w-3 mr-1" />
                                                                Apply
                                                            </Button>
                                                        </div>
                                                        <div className="text-xs font-mono space-y-1">
                                                            <div>
                                                                <span className="font-semibold">
                                                                    {suggestion.fromTable}
                                                                </span>
                                                                .{suggestion.fromColumn}
                                                            </div>
                                                            <div className="text-muted-foreground">
                                                                {suggestion.joinType} JOIN →
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold">
                                                                    {suggestion.toTable}
                                                                </span>
                                                                .{suggestion.toColumn}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground italic">
                                                            {suggestion.reason}
                                                        </p>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// Draggable Table Card Component
function DraggableTableCard({
    table,
    isSelected,
}: {
    table: TableSchema;
    isSelected: boolean;
}) {
    const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
        id: table.name,
    });

    return (
        <Card
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={`cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? 'opacity-50' : ''
                } ${isSelected ? 'border-primary bg-primary/5' : ''}`}
        >
            <CardContent className="p-3">
                <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{table.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {table.columns.length} column(s)
                        </p>
                    </div>
                    {isSelected && (
                        <Badge variant="outline" className="text-xs">
                            Added
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


