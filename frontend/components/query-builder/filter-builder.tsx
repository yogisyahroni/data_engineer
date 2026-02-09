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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, X, FolderPlus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    FilterGroup,
    FilterCondition,
    ComparisonOperator,
    LogicalOperator,
} from '@/lib/query-builder/types';

interface FilterBuilderProps {
    availableColumns: string[];
    columnTypes?: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
    filters: FilterGroup;
    onFiltersChange: (filters: FilterGroup) => void;
    maxNestingDepth?: number;
}

const OPERATOR_OPTIONS: { value: ComparisonOperator; label: string }[] = [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not Equals' },
    { value: '>', label: 'Greater Than' },
    { value: '<', label: 'Less Than' },
    { value: '>=', label: 'Greater or Equal' },
    { value: '<=', label: 'Less or Equal' },
    { value: 'LIKE', label: 'Contains' },
    { value: 'IN', label: 'In List' },
    { value: 'NOT IN', label: 'Not In List' },
    { value: 'BETWEEN', label: 'Between' },
    { value: 'IS NULL', label: 'Is Null' },
    { value: 'IS NOT NULL', label: 'Is Not Null' },
];

// Type guard
function isFilterGroup(item: FilterCondition | FilterGroup): item is FilterGroup {
    return 'conditions' in item && Array.isArray(item.conditions);
}

// Helper: Deep clone with update
function updateItemInGroup(
    group: FilterGroup,
    itemId: string,
    updates: Partial<FilterCondition | FilterGroup>
): FilterGroup {
    return {
        ...group,
        conditions: group.conditions.map((item) => {
            if (isFilterGroup(item)) {
                // Check if this is the target group
                if (item.id === itemId && 'operator' in updates) {
                    return { ...item, ...updates } as FilterGroup;
                }
                // Recursive search in nested groups
                return updateItemInGroup(item, itemId, updates);
            } else {
                // Update condition if ID matches
                if (item.id === itemId) {
                    return { ...item, ...updates } as FilterCondition;
                }
                return item;
            }
        }),
    };
}

// Helper: Deep remove
function removeItemFromGroup(group: FilterGroup, itemId: string): FilterGroup {
    return {
        ...group,
        conditions: group.conditions
            .filter((item) => {
                if (isFilterGroup(item)) {
                    return item.id !== itemId;
                } else {
                    return item.id !== itemId;
                }
            })
            .map((item) => {
                if (isFilterGroup(item)) {
                    return removeItemFromGroup(item, itemId);
                }
                return item;
            }),
    };
}

// Helper: Add to specific group
function addToGroup(
    group: FilterGroup,
    targetGroupId: string,
    newItem: FilterCondition | FilterGroup
): FilterGroup {
    if (group.id === targetGroupId) {
        return {
            ...group,
            conditions: [...group.conditions, newItem],
        };
    }

    return {
        ...group,
        conditions: group.conditions.map((item) => {
            if (isFilterGroup(item)) {
                return addToGroup(item, targetGroupId, newItem);
            }
            return item;
        }),
    };
}

export function FilterBuilder({
    availableColumns,
    columnTypes = {},
    filters,
    onFiltersChange,
    maxNestingDepth = 3,
}: FilterBuilderProps) {
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

    const handleAddCondition = (groupId: string) => {
        const newCondition: FilterCondition = {
            id: `cond-${Date.now()}`,
            column: availableColumns[0] || '',
            operator: '=',
            value: '',
        };

        const updated = addToGroup(filters, groupId, newCondition);
        onFiltersChange(updated);
    };

    const handleAddGroup = (parentGroupId: string) => {
        const newGroup: FilterGroup = {
            id: `group-${Date.now()}`,
            operator: 'AND',
            conditions: [],
        };

        const updated = addToGroup(filters, parentGroupId, newGroup);
        onFiltersChange(updated);
    };

    const handleRemoveItem = (itemId: string) => {
        const updated = removeItemFromGroup(filters, itemId);
        onFiltersChange(updated);
    };

    const handleUpdateCondition = (
        conditionId: string,
        updates: Partial<FilterCondition>
    ) => {
        const updated = updateItemInGroup(filters, conditionId, updates);
        onFiltersChange(updated);
    };

    const handleUpdateGroupOperator = (groupId: string, operator: LogicalOperator) => {
        const updated = updateItemInGroup(filters, groupId, { operator });
        onFiltersChange(updated);
    };

    return (
        <Card>
            <CardHeader className="space-y-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Filters</CardTitle>
                    {filters.conditions.length > 1 && (
                        <Select
                            value={filters.operator}
                            onValueChange={(value) =>
                                handleUpdateGroupOperator(filters.id, value as LogicalOperator)
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
                <FilterGroupRenderer
                    group={filters}
                    availableColumns={availableColumns}
                    columnTypes={columnTypes}
                    onUpdateCondition={handleUpdateCondition}
                    onUpdateGroupOperator={handleUpdateGroupOperator}
                    onRemove={handleRemoveItem}
                    onAddCondition={handleAddCondition}
                    onAddGroup={handleAddGroup}
                    depth={0}
                    maxDepth={maxNestingDepth}
                    isRoot={true}
                />
            </CardContent>
        </Card>
    );
}

// Recursive Group Renderer
interface FilterGroupRendererProps {
    group: FilterGroup;
    availableColumns: string[];
    columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
    onUpdateCondition: (id: string, updates: Partial<FilterCondition>) => void;
    onUpdateGroupOperator: (groupId: string, operator: LogicalOperator) => void;
    onRemove: (id: string) => void;
    onAddCondition: (groupId: string) => void;
    onAddGroup: (groupId: string) => void;
    depth: number;
    maxDepth: number;
    isRoot?: boolean;
}

function FilterGroupRenderer({
    group,
    availableColumns,
    columnTypes,
    onUpdateCondition,
    onUpdateGroupOperator,
    onRemove,
    onAddCondition,
    onAddGroup,
    depth,
    maxDepth,
    isRoot = false,
}: FilterGroupRendererProps) {
    const canNest = depth < maxDepth;

    return (
        <div
            className={cn(
                'space-y-2',
                !isRoot && 'pl-4 border-l-2 border-primary/30 bg-muted/20 p-3 rounded-r-md'
            )}
        >
            {!isRoot && (
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                            {group.operator}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            Group Level {depth}
                        </span>
                    </div>
                    {group.conditions.length > 1 && (
                        <Select
                            value={group.operator}
                            onValueChange={(value) =>
                                onUpdateGroupOperator(group.id, value as LogicalOperator)
                            }
                        >
                            <SelectTrigger className="w-[80px] h-7 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AND">AND</SelectItem>
                                <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(group.id)}
                        className="h-7 w-7 p-0"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}

            {group.conditions.length === 0 && !isRoot ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                    No conditions in this group
                </p>
            ) : (
                group.conditions.map((item) => {
                    if (isFilterGroup(item)) {
                        return (
                            <FilterGroupRenderer
                                key={item.id}
                                group={item}
                                availableColumns={availableColumns}
                                columnTypes={columnTypes}
                                onUpdateCondition={onUpdateCondition}
                                onUpdateGroupOperator={onUpdateGroupOperator}
                                onRemove={onRemove}
                                onAddCondition={onAddCondition}
                                onAddGroup={onAddGroup}
                                depth={depth + 1}
                                maxDepth={maxDepth}
                            />
                        );
                    } else {
                        return (
                            <FilterConditionRow
                                key={item.id}
                                condition={item}
                                availableColumns={availableColumns}
                                columnTypes={columnTypes}
                                onUpdate={onUpdateCondition}
                                onRemove={onRemove}
                            />
                        );
                    }
                })
            )}

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddCondition(group.id)}
                    className="flex-1 h-8"
                >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Condition
                </Button>
                {canNest && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddGroup(group.id)}
                        className="flex-1 h-8"
                    >
                        <FolderPlus className="h-3 w-3 mr-1" />
                        Add Group
                    </Button>
                )}
            </div>
        </div>
    );
}

// Condition Row Component
interface FilterConditionRowProps {
    condition: FilterCondition;
    availableColumns: string[];
    columnTypes: Record<string, 'string' | 'number' | 'date' | 'boolean'>;
    onUpdate: (id: string, updates: Partial<FilterCondition>) => void;
    onRemove: (id: string) => void;
}

function FilterConditionRow({
    condition,
    availableColumns,
    columnTypes,
    onUpdate,
    onRemove,
}: FilterConditionRowProps) {
    const columnType = columnTypes[condition.column] || 'string';
    const requiresValue =
        condition.operator !== 'IS NULL' && condition.operator !== 'IS NOT NULL';

    return (
        <div className="flex items-start gap-2 p-2 border rounded-md bg-card">
            {/* Column selector */}
            <Select
                value={condition.column}
                onValueChange={(value) => onUpdate(condition.id, { column: value })}
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
                value={condition.operator}
                onValueChange={(value) =>
                    onUpdate(condition.id, { operator: value as ComparisonOperator })
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

            {/* Value input - type aware */}
            {requiresValue && (
                <ValueInputField
                    value={condition.value}
                    operator={condition.operator}
                    columnType={columnType}
                    onChange={(newValue) => onUpdate(condition.id, { value: newValue })}
                />
            )}

            {/* Remove button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(condition.id)}
                className="h-9 w-9 p-0 flex-shrink-0"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

// Type-aware Value Input
interface ValueInputFieldProps {
    value: any;
    operator: ComparisonOperator;
    columnType: 'string' | 'number' | 'date' | 'boolean';
    onChange: (value: any) => void;
}

function ValueInputField({ value, operator, columnType, onChange }: ValueInputFieldProps) {
    // BETWEEN operator - two inputs
    if (operator === 'BETWEEN') {
        const [start, end] = Array.isArray(value) ? value : [value || '', ''];

        if (columnType === 'date') {
            return (
                <div className="flex gap-2 flex-1">
                    <DatePicker
                        value={start}
                        onChange={(newStart) => onChange([newStart, end])}
                        placeholder="From"
                    />
                    <DatePicker
                        value={end}
                        onChange={(newEnd) => onChange([start, newEnd])}
                        placeholder="To"
                    />
                </div>
            );
        }

        return (
            <div className="flex gap-2 flex-1">
                <Input
                    type={columnType === 'number' ? 'number' : 'text'}
                    placeholder="From"
                    value={start}
                    onChange={(e) => onChange([e.target.value, end])}
                    className="h-9 text-sm"
                />
                <Input
                    type={columnType === 'number' ? 'number' : 'text'}
                    placeholder="To"
                    value={end}
                    onChange={(e) => onChange([start, e.target.value])}
                    className="h-9 text-sm"
                />
            </div>
        );
    }

    // IN / NOT IN operators - comma-separated array
    if (operator === 'IN' || operator === 'NOT IN') {
        const displayValue = Array.isArray(value) ? value.join(', ') : String(value || '');

        return (
            <Input
                placeholder="value1, value2, value3"
                value={displayValue}
                onChange={(e) => {
                    const arrayValue = e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter((v) => v);
                    onChange(arrayValue.length > 0 ? arrayValue : e.target.value);
                }}
                className="flex-1 h-9 text-sm"
            />
        );
    }

    // Date type
    if (columnType === 'date') {
        return <DatePicker value={value} onChange={onChange} />;
    }

    // Number type
    if (columnType === 'number') {
        return (
            <Input
                type="number"
                placeholder="Value..."
                value={String(value || '')}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 h-9 text-sm"
            />
        );
    }

    // Boolean type
    if (columnType === 'boolean') {
        return (
            <Select value={String(value || 'true')} onValueChange={onChange}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                </SelectContent>
            </Select>
        );
    }

    // Default: string type
    return (
        <Input
            placeholder="Value..."
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-9 text-sm"
        />
    );
}

// Date Picker Component
interface DatePickerProps {
    value: any;
    onChange: (value: string) => void;
    placeholder?: string;
}

function DatePicker({ value, onChange, placeholder = 'Pick a date' }: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const dateValue = value ? new Date(value) : undefined;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'flex-1 h-9 text-sm justify-start text-left font-normal',
                        !value && 'text-muted-foreground'
                    )}
                >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateValue ? format(dateValue, 'PPP') : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={(date) => {
                        onChange(date ? date.toISOString() : '');
                        setOpen(false);
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
