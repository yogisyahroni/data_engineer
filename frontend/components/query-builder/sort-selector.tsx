'use client';

import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Plus, X } from 'lucide-react';
import { SortRule, SortDirection } from '@/lib/query-builder/types';

interface SortSelectorProps {
    availableColumns: string[];
    sorts: SortRule[];
    onSortsChange: (sorts: SortRule[]) => void;
}

export function SortSelector({
    availableColumns,
    sorts,
    onSortsChange,
}: SortSelectorProps) {
    const handleAddSort = () => {
        const newSort: SortRule = {
            id: `sort-${Date.now()}`,
            column: availableColumns[0] || '',
            direction: 'ASC',
        };
        onSortsChange([...sorts, newSort]);
    };

    const handleRemoveSort = (id: string) => {
        onSortsChange(sorts.filter((s) => s.id !== id));
    };

    const handleColumnChange = (id: string, column: string) => {
        onSortsChange(
            sorts.map((s) => (s.id === id ? { ...s, column } : s))
        );
    };

    const handleDirectionChange = (id: string, direction: SortDirection) => {
        onSortsChange(
            sorts.map((s) => (s.id === id ? { ...s, direction } : s))
        );
    };

    if (availableColumns.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Sort By</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Select columns first
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Sort By</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {sorts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No sorting applied
                    </p>
                ) : (
                    <div className="space-y-2">
                        {sorts.map((sort) => (
                            <div
                                key={sort.id}
                                className="flex items-center gap-2 p-2 border rounded-md bg-card"
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                                <Select
                                    value={sort.column}
                                    onValueChange={(value) => handleColumnChange(sort.id, value)}
                                >
                                    <SelectTrigger className="flex-1 h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableColumns.map((col) => (
                                            <SelectItem key={col} value={col}>
                                                {col}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={sort.direction}
                                    onValueChange={(value) =>
                                        handleDirectionChange(sort.id, value as SortDirection)
                                    }
                                >
                                    <SelectTrigger className="w-[100px] h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ASC">Ascending</SelectItem>
                                        <SelectItem value="DESC">Descending</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveSort(sort.id)}
                                    className="h-9 w-9 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddSort}
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sort
                </Button>
            </CardContent>
        </Card>
    );
}
