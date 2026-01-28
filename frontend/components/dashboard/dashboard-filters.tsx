'use client';

import React from 'react';
import {
    Filter,
    X,
    Calendar as CalendarIcon,
    ChevronDown,
    Search,
    Check,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface DashboardFilter {
    id: string;
    name: string;
    type: 'select' | 'date-range' | 'text';
    value: any;
}

interface DashboardFiltersProps {
    filters: DashboardFilter[];
    onAddFilter: (type: DashboardFilter['type']) => void;
    onRemoveFilter: (id: string) => void;
    onUpdateFilter: (id: string, value: any) => void;
}

export function DashboardFilters({
    filters,
    onAddFilter,
    onRemoveFilter,
    onUpdateFilter,
}: DashboardFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 py-3 px-6 border-b border-border bg-card/50">
            <div className="flex items-center gap-2 mr-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filters</span>
            </div>

            {filters.map((filter) => (
                <div key={filter.id} className="flex items-center gap-1 bg-background border border-border rounded-md pl-2 pr-1 py-1">
                    <span className="text-xs font-semibold text-muted-foreground mr-1 capitalize">{filter.name}:</span>

                    {filter.type === 'text' && (
                        <input
                            type="text"
                            value={filter.value || ''}
                            onChange={(e) => onUpdateFilter(filter.id, e.target.value)}
                            placeholder="Search..."
                            className="bg-transparent text-xs outline-none w-24 border-none p-0 h-4"
                        />
                    )}

                    {filter.type === 'date-range' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="text-xs text-foreground hover:underline min-w-[120px] text-left">
                                    {filter.value?.from ? (
                                        filter.value.to ? (
                                            <>{format(filter.value.from, "LLL dd, y") + " - " + format(filter.value.to, "LLL dd, y")}</>
                                        ) : (
                                            format(filter.value.from, "LLL dd, y")
                                        )
                                    ) : (
                                        "Select date"
                                    )}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={filter.value?.from}
                                    selected={filter.value}
                                    onSelect={(range) => onUpdateFilter(filter.id, range)}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    )}

                    {filter.type === 'select' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger className="text-xs text-foreground hover:underline flex items-center gap-1 min-w-[60px] text-left">
                                {filter.value || "All"}
                                <ChevronDown className="w-3 h-3" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {["All", "Category A", "Category B", "Category C"].map((option) => (
                                    <DropdownMenuItem key={option} onClick={() => onUpdateFilter(filter.id, option === "All" ? null : option)}>
                                        <div className="flex items-center justify-between w-full">
                                            {option}
                                            {filter.value === (option === "All" ? null : option) && <Check className="w-3 h-3 ml-2 text-primary" />}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <button
                        onClick={() => onRemoveFilter(filter.id)}
                        className="hover:bg-muted p-0.5 rounded"
                    >
                        <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                </div>
            ))}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 border-dashed">
                        <Plus className="w-3.5 h-3.5" />
                        Add Filter
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => onAddFilter('date-range')}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Date Range
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddFilter('select')}>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Category / Segment
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddFilter('text')}>
                        <Search className="w-4 h-4 mr-2" />
                        Text Search
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
