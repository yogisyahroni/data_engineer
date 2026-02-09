'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useCrossFilter, FilterOperator } from '@/lib/cross-filter-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
    Calendar as CalendarIcon,
    Filter,
    X,
    Plus,
    Search,
    ChevronDown,
    Trash2,
    Check,
} from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { useDebounce } from '@/hooks/use-debounce';

/**
 * Filter configuration for global filters
 */
export interface GlobalFilterConfig {
    id: string;
    label: string;
    fieldName: string;
    type: 'date-range' | 'select' | 'multi-select' | 'search' | 'number-range';
    operator?: FilterOperator;
    options?: Array<{ label: string; value: any }>;
    placeholder?: string;
    defaultValue?: any;
}

/**
 * Props for GlobalFilters component
 */
export interface GlobalFiltersProps {
    /** Pre-defined filter configurations */
    filterConfigs?: GlobalFilterConfig[];

    /** Allow users to add custom filters */
    allowCustomFilters?: boolean;

    /** Show active filter count badge */
    showFilterCount?: boolean;

    /** Sticky position at top */
    sticky?: boolean;

    /** Initial collapsed state */
    initialCollapsed?: boolean;

    /** CSS class for container */
    className?: string;

    /** Callback when filter values change */
    onFiltersChange?: (filters: Record<string, any>) => void;
}

/**
 * Preset date ranges
 */
const DATE_PRESETS = [
    { label: 'Today', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
    { label: 'Yesterday', getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
    { label: 'Last 7 Days', getValue: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
    { label: 'Last 30 Days', getValue: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
    { label: 'Last 3 Months', getValue: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }) },
    { label: 'Last Year', getValue: () => ({ from: startOfDay(subYears(new Date(), 1)), to: endOfDay(new Date()) }) },
];

/**
 * GlobalFilters Component
 * 
 * Provides a global filter bar for dashboards
 * Supports date ranges, dropdowns, multi-select, and search filters
 */
export function GlobalFilters({
    filterConfigs = [],
    allowCustomFilters = true,
    showFilterCount = true,
    sticky = false,
    initialCollapsed = false,
    className,
    onFiltersChange,
}: GlobalFiltersProps) {
    const {
        addFilter,
        removeFilter,
        clearGlobalFilters,
        getActiveFilters,
        getGlobalFilterCount,
    } = useCrossFilter();

    const [collapsed, setCollapsed] = useState(initialCollapsed);
    const [filterValues, setFilterValues] = useState<Record<string, any>>({});
    const [searchValues, setSearchValues] = useState<Record<string, string>>({});

    // Debounce search inputs
    const debouncedSearchValues = useDebounce(searchValues, 300);

    const globalFilterCount = getGlobalFilterCount();

    /**
     * Initialize default values
     */
    useEffect(() => {
        const defaults: Record<string, any> = {};
        filterConfigs.forEach(config => {
            if (config.defaultValue !== undefined) {
                defaults[config.id] = config.defaultValue;
            }
        });
        setFilterValues(defaults);
    }, [filterConfigs]);

    /**
     * Update filter when value changes
     */
    const updateFilterValue = useCallback((configId: string, value: any) => {
        const config = filterConfigs.find(c => c.id === configId);
        if (!config) return;

        setFilterValues(prev => {
            const newValues = { ...prev, [configId]: value };

            // Trigger callback
            if (onFiltersChange) {
                onFiltersChange(newValues);
            }

            return newValues;
        });

        // Remove existing filter for this field if value is null/empty
        const existingFilters = getActiveFilters().filter(
            f => f.type === 'global' && f.fieldName === config.fieldName
        );
        existingFilters.forEach(f => removeFilter(f.id));

        // Add new filter if value is not null/empty
        if (value !== null && value !== undefined && value !== '') {
            let operator: FilterOperator = config.operator || 'equals';
            let filterValue = value;
            let label = `${config.label}: ${value}`;

            // Handle different filter types
            if (config.type === 'date-range') {
                if (value.from && value.to) {
                    operator = 'between';
                    filterValue = [value.from, value.to];
                    label = `${config.label}: ${format(value.from, 'MMM dd')} - ${format(value.to, 'MMM dd, yyyy')}`;
                } else if (value.from) {
                    operator = 'greater_than';
                    filterValue = value.from;
                    label = `${config.label}: After ${format(value.from, 'MMM dd, yyyy')}`;
                } else {
                    return;
                }
            } else if (config.type === 'multi-select') {
                if (Array.isArray(value) && value.length > 0) {
                    operator = 'in';
                    filterValue = value;
                    label = `${config.label}: ${value.length} selected`;
                } else {
                    return;
                }
            } else if (config.type === 'search') {
                operator = 'contains';
                label = `${config.label}: "${value}"`;
            } else if (config.type === 'number-range') {
                if (value.min !== undefined && value.max !== undefined) {
                    operator = 'between';
                    filterValue = [value.min, value.max];
                    label = `${config.label}: ${value.min} - ${value.max}`;
                } else {
                    return;
                }
            }

            addFilter({
                sourceChartId: 'global-filter-bar',
                fieldName: config.fieldName,
                operator,
                value: filterValue,
                label,
                type: 'global',
            });
        }
    }, [filterConfigs, onFiltersChange, getActiveFilters, removeFilter, addFilter]);

    /**
     * Handle search input change
     */
    const handleSearchChange = useCallback((configId: string, value: string) => {
        setSearchValues(prev => ({ ...prev, [configId]: value }));
    }, []);

    /**
     * Apply debounced search values
     */
    useEffect(() => {
        Object.entries(debouncedSearchValues).forEach(([configId, value]) => {
            updateFilterValue(configId, value || null);
        });
    }, [debouncedSearchValues, updateFilterValue]);

    /**
     * Clear all global filters
     */
    const handleClearAll = useCallback(() => {
        clearGlobalFilters();
        setFilterValues({});
        setSearchValues({});

        if (onFiltersChange) {
            onFiltersChange({});
        }
    }, [clearGlobalFilters, onFiltersChange]);

    /**
     * Render filter control based on type
     */
    const renderFilterControl = useCallback((config: GlobalFilterConfig) => {
        const value = filterValues[config.id];

        switch (config.type) {
            case 'date-range':
                return (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    'h-9 justify-start text-left font-normal border-dashed',
                                    !value?.from && 'text-muted-foreground'
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {value?.from ? (
                                    value.to ? (
                                        <>
                                            {format(value.from, 'MMM dd')} - {format(value.to, 'MMM dd, yyyy')}
                                        </>
                                    ) : (
                                        format(value.from, 'MMM dd, yyyy')
                                    )
                                ) : (
                                    <span>{config.placeholder || 'Pick a date range'}</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <div className="flex">
                                <div className="border-r p-3 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Quick Select</p>
                                    {DATE_PRESETS.map((preset) => (
                                        <Button
                                            key={preset.label}
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start text-xs"
                                            onClick={() => updateFilterValue(config.id, preset.getValue())}
                                        >
                                            {preset.label}
                                        </Button>
                                    ))}
                                </div>
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={value?.from}
                                    selected={value}
                                    onSelect={(range) => updateFilterValue(config.id, range)}
                                    numberOfMonths={2}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                );

            case 'select':
                return (
                    <Select
                        value={value || ''}
                        onValueChange={(val) => updateFilterValue(config.id, val || null)}
                    >
                        <SelectTrigger className="h-9 w-[180px] border-dashed">
                            <SelectValue placeholder={config.placeholder || 'Select...'} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All</SelectItem>
                            {config.options?.map((option) => (
                                <SelectItem key={String(option.value)} value={String(option.value)}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case 'multi-select':
                const selectedValues = Array.isArray(value) ? value : [];
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 border-dashed justify-between min-w-[180px]"
                            >
                                {selectedValues.length > 0 ? (
                                    <span className="text-sm">
                                        {selectedValues.length} selected
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground text-sm">
                                        {config.placeholder || 'Select...'}
                                    </span>
                                )}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            {config.options?.map((option) => (
                                <DropdownMenuCheckboxItem
                                    key={String(option.value)}
                                    checked={selectedValues.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                        const newValues = checked
                                            ? [...selectedValues, option.value]
                                            : selectedValues.filter(v => v !== option.value);
                                        updateFilterValue(config.id, newValues.length > 0 ? newValues : null);
                                    }}
                                >
                                    {option.label}
                                </DropdownMenuCheckboxItem>
                            ))}
                            {selectedValues.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => updateFilterValue(config.id, null)}>
                                        Clear Selection
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );

            case 'search':
                return (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={config.placeholder || 'Search...'}
                            value={searchValues[config.id] || ''}
                            onChange={(e) => handleSearchChange(config.id, e.target.value)}
                            className="h-9 pl-9 w-[200px] border-dashed"
                        />
                        {searchValues[config.id] && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                                onClick={() => {
                                    handleSearchChange(config.id, '');
                                    updateFilterValue(config.id, null);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                );

            case 'number-range':
                const rangeValue = value || { min: '', max: '' };
                return (
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            placeholder="Min"
                            value={rangeValue.min}
                            onChange={(e) => updateFilterValue(config.id, {
                                ...rangeValue,
                                min: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="h-9 w-[90px] border-dashed"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                            type="number"
                            placeholder="Max"
                            value={rangeValue.max}
                            onChange={(e) => updateFilterValue(config.id, {
                                ...rangeValue,
                                max: e.target.value ? Number(e.target.value) : undefined
                            })}
                            className="h-9 w-[90px] border-dashed"
                        />
                    </div>
                );

            default:
                return null;
        }
    }, [filterValues, searchValues, updateFilterValue, handleSearchChange]);

    if (collapsed) {
        return (
            <div className={cn(
                'flex items-center gap-3 p-3 bg-muted/30 border-b border-border',
                sticky && 'sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
                className
            )}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCollapsed(false)}
                    className="gap-2"
                >
                    <Filter className="h-4 w-4" />
                    <span>Show Filters</span>
                    {showFilterCount && globalFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                            {globalFilterCount}
                        </Badge>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className={cn(
            'p-4 bg-muted/30 border-b border-border space-y-3',
            sticky && 'sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
            className
        )}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Global Filters</h3>
                    {showFilterCount && globalFilterCount > 0 && (
                        <Badge variant="secondary">{globalFilterCount} active</Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {globalFilterCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear All
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCollapsed(true)}
                        className="h-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
                {filterConfigs.map((config) => (
                    <div key={config.id} className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {config.label}
                        </Label>
                        {renderFilterControl(config)}
                    </div>
                ))}
            </div>

            {/* Active Filters Display */}
            {globalFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                    <span className="text-xs font-medium text-muted-foreground">Active:</span>
                    {getActiveFilters()
                        .filter(f => f.type === 'global')
                        .map((filter) => (
                            <Badge
                                key={filter.id}
                                variant="secondary"
                                className="gap-1.5 pr-1 bg-primary/10 text-primary border-primary/20"
                            >
                                <span className="text-xs">{filter.label}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 hover:bg-primary/20"
                                    onClick={() => removeFilter(filter.id)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))}
                </div>
            )}
        </div>
    );
}
