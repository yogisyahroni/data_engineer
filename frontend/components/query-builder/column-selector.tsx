'use client';

import { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ColumnSelection, AggregationFunction, ColumnSchema } from '@/lib/query-builder/types';
import { GripVertical, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AGGREGATION_OPTIONS: { label: string; value: AggregationFunction }[] = [
    { label: 'Count', value: 'COUNT' },
    { label: 'Sum', value: 'SUM' },
    { label: 'Avg', value: 'AVG' },
    { label: 'Min', value: 'MIN' },
    { label: 'Max', value: 'MAX' },
];

interface ColumnSelectorProps {
    connectionId: string;
    tableName: string;
    selectedColumns: ColumnSelection[];
    onColumnsChange: (columns: ColumnSelection[]) => void;
}

// Sortable Item Component
function SortableColumnItem({
    id,
    col,
    index,
    handleAggregationChange,
    handleAliasChange,
    handleRemoveColumn,
}: {
    id: string;
    col: ColumnSelection;
    index: number;
    handleAggregationChange: (index: number, val: AggregationFunction | null) => void;
    handleAliasChange: (index: number, val: string) => void;
    handleRemoveColumn: (index: number) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-2 p-2 border rounded-md bg-card touch-none"
        >
            <div {...attributes} {...listeners} className="cursor-move p-1 hover:bg-muted rounded">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <span className="text-sm font-medium flex-1 truncate" title={col.column}>{col.column}</span>

            {/* Aggregation selector */}
            <Select
                value={col.aggregation || 'none'}
                onValueChange={(value) =>
                    handleAggregationChange(
                        index,
                        value === 'none' ? null : (value as AggregationFunction)
                    )
                }
            >
                <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Function</SelectItem>
                    {AGGREGATION_OPTIONS.map((agg) => (
                        <SelectItem key={agg.value} value={agg.value}>
                            {agg.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Alias input */}
            <Input
                placeholder="Alias..."
                value={col.alias || ''}
                onChange={(e) => handleAliasChange(index, e.target.value)}
                className="w-[90px] h-8 text-xs"
            />

            {/* Remove button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveColumn(index)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function ColumnSelector({
    connectionId,
    tableName,
    selectedColumns,
    onColumnsChange,
}: ColumnSelectorProps) {
    const [availableColumns, setAvailableColumns] = useState<ColumnSchema[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = selectedColumns.findIndex((c) => c.column === active.id);
            const newIndex = selectedColumns.findIndex((c) => c.column === over?.id);
            onColumnsChange(arrayMove(selectedColumns, oldIndex, newIndex));
        }
    };

    useEffect(() => {
        if (tableName) {
            fetchColumns();
        }
    }, [tableName, connectionId]);

    const fetchColumns = async () => {
        // ... existing logic ...
        if (!tableName) return;

        try {
            setIsLoading(true);
            const res = await fetch(`/api/connections/${connectionId}/schema`);
            if (res.ok) {
                const data = await res.json();
                const table = data.tables?.find((t: any) => t.name === tableName);
                setAvailableColumns(table?.columns || []);
            }
        } catch (error) {
            console.error('Failed to fetch columns:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddColumn = (columnName: string) => {
        // ... existing logic ...
        if (!tableName) return;

        const alreadySelected = selectedColumns.some((c) => c.column === columnName);
        if (alreadySelected) return;

        const newColumn: ColumnSelection = {
            table: tableName,
            column: columnName,
        };

        onColumnsChange([...selectedColumns, newColumn]);
    };

    const handleRemoveColumn = (index: number) => {
        // ... existing logic ...
        const updated = selectedColumns.filter((_, i) => i !== index);
        onColumnsChange(updated);
    };

    const handleAggregationChange = (index: number, aggregation: AggregationFunction | null) => {
        // ... existing logic ...
        const updated = [...selectedColumns];
        if (aggregation) {
            updated[index] = { ...updated[index], aggregation };
        } else {
            const { aggregation: _, ...rest } = updated[index];
            updated[index] = rest;
        }
        onColumnsChange(updated);
    };

    const handleAliasChange = (index: number, alias: string) => {
        // ... existing logic ...
        const updated = [...selectedColumns];
        updated[index] = { ...updated[index], alias: alias || undefined };
        onColumnsChange(updated);
    };

    if (!tableName) {
        // ... existing logic ...
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Select Columns</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        Select a table first
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Select Columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Available columns */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase">
                        Available Columns
                    </Label>
                    <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
                        {isLoading ? (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                Loading columns...
                            </div>
                        ) : availableColumns.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-4">
                                No columns found
                            </div>
                        ) : (
                            availableColumns.map((col) => {
                                const isSelected = selectedColumns.some((c) => c.column === col.name);
                                return (
                                    <div
                                        key={col.name}
                                        className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                                        onClick={() => !isSelected && handleAddColumn(col.name)}
                                    >
                                        <Checkbox checked={isSelected} />
                                        <span className="text-sm flex-1">{col.name}</span>
                                        <span className="text-xs text-muted-foreground">{col.type}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Selected columns */}
                {selectedColumns.length > 0 && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase">
                            Selected ({selectedColumns.length})
                        </Label>
                        <div className="space-y-2">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={selectedColumns.map(c => c.column)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {selectedColumns.map((col, index) => (
                                        <SortableColumnItem
                                            key={col.column}
                                            id={col.column}
                                            col={col}
                                            index={index}
                                            handleAggregationChange={handleAggregationChange}
                                            handleAliasChange={handleAliasChange}
                                            handleRemoveColumn={handleRemoveColumn}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                )}

                {selectedColumns.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No columns selected
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
