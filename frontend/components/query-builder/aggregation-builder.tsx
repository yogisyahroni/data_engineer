'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Plus,
    X,
    TrendingUp,
    Calculator,
    ListFilter,
    AlertCircle,
} from 'lucide-react';
import { FilterBuilder } from './filter-builder';
import {
    ColumnSelection,
    AggregationFunction,
    FilterGroup,
} from '@/lib/query-builder/types';

interface AggregationBuilderProps {
    availableColumns: string[];
    columnTypes?: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
    groupBy: string[];
    aggregations: ColumnSelection[];
    having: FilterGroup;
    onGroupByChange: (columns: string[]) => void;
    onAggregationsChange: (aggregations: ColumnSelection[]) => void;
    onHavingChange: (having: FilterGroup) => void;
}

const AGGREGATION_FUNCTIONS: {
    value: AggregationFunction;
    label: string;
    description: string;
    requiresColumn: boolean;
}[] = [
        {
            value: 'COUNT',
            label: 'COUNT(*)',
            description: 'Count all rows',
            requiresColumn: false,
        },
        {
            value: 'COUNT_DISTINCT',
            label: 'COUNT DISTINCT',
            description: 'Count unique values',
            requiresColumn: true,
        },
        { value: 'SUM', label: 'SUM', description: 'Sum of values', requiresColumn: true },
        {
            value: 'AVG',
            label: 'AVERAGE',
            description: 'Average value',
            requiresColumn: true,
        },
        {
            value: 'MIN',
            label: 'MINIMUM',
            description: 'Minimum value',
            requiresColumn: true,
        },
        {
            value: 'MAX',
            label: 'MAXIMUM',
            description: 'Maximum value',
            requiresColumn: true,
        },
    ];

export function AggregationBuilder({
    availableColumns,
    columnTypes = {},
    groupBy,
    aggregations,
    having,
    onGroupByChange,
    onAggregationsChange,
    onHavingChange,
}: AggregationBuilderProps) {
    const [selectedColumn, setSelectedColumn] = useState<string>('');

    if (availableColumns.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Aggregation & Grouping
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Select columns first
                    </p>
                </CardContent>
            </Card>
        );
    }

    const handleAddGroupBy = () => {
        if (selectedColumn && !groupBy.includes(selectedColumn)) {
            onGroupByChange([...groupBy, selectedColumn]);
            setSelectedColumn('');
        }
    };

    const handleRemoveGroupBy = (column: string) => {
        onGroupByChange(groupBy.filter((col) => col !== column));
    };

    const handleAddAggregation = () => {
        const newAgg: ColumnSelection = {
            table: '',
            column: '',
            aggregation: 'COUNT',
            alias: `agg_${aggregations.length + 1}`,
        };

        onAggregationsChange([...aggregations, newAgg]);
    };

    const handleUpdateAggregation = (
        index: number,
        updates: Partial<ColumnSelection>
    ) => {
        const updated = aggregations.map((agg, idx) =>
            idx === index ? { ...agg, ...updates } : agg
        );
        onAggregationsChange(updated);
    };

    const handleRemoveAggregation = (index: number) => {
        onAggregationsChange(aggregations.filter((_, idx) => idx !== index));
    };

    // Available columns for HAVING clause
    const havingColumns = [
        ...groupBy,
        ...aggregations
            .filter((agg) => agg.alias)
            .map((agg) => agg.alias as string),
    ];

    const hasAggregations = aggregations.length > 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Aggregation & Grouping
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* GROUP BY Section */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Group By</span>
                    </div>

                    {groupBy.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {groupBy.map((column) => (
                                <Badge
                                    key={column}
                                    variant="secondary"
                                    className="gap-1 pr-1"
                                >
                                    {column}
                                    <button
                                        onClick={() => handleRemoveGroupBy(column)}
                                        className="ml-1 rounded-sm hover:bg-muted p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                            <SelectTrigger className="flex-1 h-9 text-sm">
                                <SelectValue placeholder="Select column to group by..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableColumns
                                    .filter((col) => !groupBy.includes(col))
                                    .map((col) => (
                                        <SelectItem key={col} value={col}>
                                            {col}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddGroupBy}
                            disabled={!selectedColumn}
                            className="h-9"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add
                        </Button>
                    </div>

                    {groupBy.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                            No grouping applied. Results will be aggregated across all rows.
                        </p>
                    )}
                </div>

                <Separator />

                {/* Aggregations Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Aggregate Functions</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {aggregations.length}
                        </Badge>
                    </div>

                    {aggregations.length === 0 ? (
                        <div className="text-center py-6 space-y-2 border-2 border-dashed rounded-lg">
                            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                                No aggregations defined
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Add functions like COUNT, SUM, AVG to summarize your data
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[300px]">
                            <div className="space-y-2">
                                {aggregations.map((agg, index) => (
                                    <AggregationRow
                                        key={index}
                                        index={index}
                                        aggregation={agg}
                                        availableColumns={availableColumns}
                                        columnTypes={columnTypes}
                                        onUpdate={handleUpdateAggregation}
                                        onRemove={handleRemoveAggregation}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddAggregation}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Aggregation
                    </Button>
                </div>

                {/* HAVING Clause Section */}
                {hasAggregations && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <ListFilter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">HAVING Clause</span>
                                <Badge variant="secondary" className="text-xs">
                                    Optional
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Filter results after aggregation (e.g., COUNT {'>'} 10)
                            </p>

                            {havingColumns.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">
                                    Add aggregations with aliases to use HAVING filters
                                </p>
                            ) : (
                                <FilterBuilder
                                    availableColumns={havingColumns}
                                    columnTypes={columnTypes}
                                    filters={having}
                                    onFiltersChange={onHavingChange}
                                    maxNestingDepth={2}
                                />
                            )}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// Aggregation Row Component
interface AggregationRowProps {
    index: number;
    aggregation: ColumnSelection;
    availableColumns: string[];
    columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
    onUpdate: (index: number, updates: Partial<ColumnSelection>) => void;
    onRemove: (index: number) => void;
}

function AggregationRow({
    index,
    aggregation,
    availableColumns,
    columnTypes,
    onUpdate,
    onRemove,
}: AggregationRowProps) {
    const selectedFunction = AGGREGATION_FUNCTIONS.find(
        (f) => f.value === aggregation.aggregation
    );
    const requiresColumn = selectedFunction?.requiresColumn ?? true;

    // Auto-generate alias when function or column changes
    const handleFunctionChange = (fn: AggregationFunction) => {
        const newAlias =
            fn === 'COUNT'
                ? 'count'
                : `${fn.toLowerCase()}_${aggregation.column || 'value'}`;
        onUpdate(index, { aggregation: fn, alias: newAlias });
    };

    const handleColumnChange = (col: string) => {
        const newAlias = aggregation.aggregation
            ? `${aggregation.aggregation.toLowerCase()}_${col}`
            : col;
        onUpdate(index, { column: col, alias: newAlias });
    };

    return (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-card">
            {/* Function selector */}
            <Select
                value={aggregation.aggregation || 'COUNT'}
                onValueChange={(value) =>
                    handleFunctionChange(value as AggregationFunction)
                }
            >
                <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {AGGREGATION_FUNCTIONS.map((fn) => (
                        <SelectItem key={fn.value} value={fn.value}>
                            <div>
                                <div className="font-medium">{fn.label}</div>
                                <div className="text-xs text-muted-foreground">
                                    {fn.description}
                                </div>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Column selector - disabled for COUNT(*) */}
            <Select
                value={aggregation.column}
                onValueChange={handleColumnChange}
                disabled={!requiresColumn}
            >
                <SelectTrigger
                    className={`flex-1 h-9 text-sm ${!requiresColumn ? 'opacity-50' : ''
                        }`}
                >
                    <SelectValue
                        placeholder={requiresColumn ? 'Select column...' : 'N/A'}
                    />
                </SelectTrigger>
                <SelectContent>
                    {availableColumns.map((col) => (
                        <SelectItem key={col} value={col}>
                            {col}
                            {columnTypes[col] && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                    {columnTypes[col]}
                                </Badge>
                            )}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Alias input */}
            <Input
                placeholder="Alias..."
                value={aggregation.alias || ''}
                onChange={(e) => onUpdate(index, { alias: e.target.value })}
                className="w-[120px] h-9 text-sm"
            />

            {/* Remove button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-9 w-9 p-0 flex-shrink-0"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}
