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
import { Plus, X } from 'lucide-react';
import {
    FilterGroup,
    FilterCondition,
    ComparisonOperator,
    LogicalOperator,
} from '@/lib/query-builder/types';

interface FilterBuilderProps {
    availableColumns: string[];
    filters: FilterGroup;
    onFiltersChange: (filters: FilterGroup) => void;
}

const OPERATOR_OPTIONS: { value: ComparisonOperator; label: string }[] = [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not Equals' },
    { value: '>', label: 'Greater Than' },
    { value: '<', label: 'Less Than' },
    { value: '>=', label: 'Greater or Equal' },
    { value: '<=', label: 'Less or Equal' },
    { value: 'LIKE', label: 'Contains' },
    { value: 'IS NULL', label: 'Is Null' },
    { value: 'IS NOT NULL', label: 'Is Not Null' },
];

export function FilterBuilder({
    availableColumns,
    filters,
    onFiltersChange,
}: FilterBuilderProps) {
    const handleAddCondition = () => {
        const newCondition: FilterCondition = {
            id: `cond-${Date.now()}`,
            column: availableColumns[0] || '',
            operator: '=',
            value: '',
        };

        onFiltersChange({
            ...filters,
            conditions: [...filters.conditions, newCondition],
        });
    };

    const handleRemoveCondition = (id: string) => {
        onFiltersChange({
            ...filters,
            conditions: filters.conditions.filter((c: any) => c.id !== id),
        });
    };

    const handleConditionChange = (
        id: string,
        field: string,
        value: any
    ) => {
        onFiltersChange({
            ...filters,
            conditions: filters.conditions.map((cond: any) =>
                cond.id === id ? { ...cond, [field]: value } : cond
            ),
        });
    };

    const handleOperatorChange = (operator: LogicalOperator) => {
        onFiltersChange({ ...filters, operator });
    };

    if (availableColumns.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filters</CardTitle>
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
            <CardHeader className="space-y-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Filters</CardTitle>
                    {filters.conditions.length > 1 && (
                        <Select
                            value={filters.operator}
                            onValueChange={(value) =>
                                handleOperatorChange(value as LogicalOperator)
                            }
                        >
                            <SelectTrigger className="w-[80px] h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {filters.conditions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No filters applied
                    </p>
                ) : (
                    <div className="space-y-2">
                        {filters.conditions.map((condition: any, index) => {
                            const cond = condition as FilterCondition;
                            const showValue =
                                cond.operator !== 'IS NULL' && cond.operator !== 'IS NOT NULL';

                            return (
                                <div
                                    key={cond.id}
                                    className="flex items-center gap-2 p-2 border rounded-md bg-card"
                                >
                                    {/* Column selector */}
                                    <Select
                                        value={cond.column}
                                        onValueChange={(value) =>
                                            handleConditionChange(cond.id, 'column', value)
                                        }
                                    >
                                        <SelectTrigger className="w-[140px] h-9 text-sm">
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

                                    {/* Operator selector */}
                                    <Select
                                        value={cond.operator}
                                        onValueChange={(value) =>
                                            handleConditionChange(cond.id, 'operator', value)
                                        }
                                    >
                                        <SelectTrigger className="w-[140px] h-9 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OPERATOR_OPTIONS.map((op) => (
                                                <SelectItem key={op.value} value={op.value}>
                                                    {op.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Value input */}
                                    {showValue && (
                                        <Input
                                            placeholder="Value..."
                                            value={String(cond.value || '')}
                                            onChange={(e) =>
                                                handleConditionChange(cond.id, 'value', e.target.value)
                                            }
                                            className="flex-1 h-9 text-sm"
                                        />
                                    )}

                                    {/* Remove button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveCondition(cond.id)}
                                        className="h-9 w-9 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddCondition}
                    className="w-full"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Filter
                </Button>
            </CardContent>
        </Card>
    );
}
