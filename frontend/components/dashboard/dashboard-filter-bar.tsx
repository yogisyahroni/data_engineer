'use client';

import { useState } from 'react';
import { DashboardFilter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter as FilterIcon, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardFilterBarProps {
    filters: DashboardFilter[]; // The configuration of available filters
    filterValues: Record<string, any>; // The current values
    isEditing: boolean;
    onAddFilter: (filter: DashboardFilter) => void;
    onRemoveFilter: (filterId: string) => void;
    onFilterChange: (key: string, value: any) => void;
}

export function DashboardFilterBar({
    filters,
    filterValues,
    isEditing,
    onAddFilter,
    onRemoveFilter,
    onFilterChange
}: DashboardFilterBarProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newFilter, setNewFilter] = useState<Partial<DashboardFilter>>({
        type: 'text'
    });

    const handleAddFilter = () => {
        if (newFilter.name && newFilter.key && newFilter.type) {
            onAddFilter({
                id: `filter-${Date.now()}`,
                name: newFilter.name,
                key: newFilter.key,
                type: newFilter.type as any,
                defaultValue: newFilter.defaultValue
            });
            setIsAdding(false);
            setNewFilter({ type: 'text' });
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-4 p-2 bg-muted/30 rounded-lg border border-border/50 mb-4 min-h-[50px]">
            {filters?.length === 0 && isEditing && (
                <div className="text-sm text-muted-foreground ml-2">
                    Add filters to allow users to interact with variables in your queries (e.g. {'{{start_date}}'}).
                </div>
            )}

            {filters?.map((filter) => (
                <div key={filter.id} className="flex items-center gap-2 bg-background border rounded-md px-2 py-1 shadow-sm">
                    <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {filter.name}
                    </Label>

                    {/* Render Input based on type */}
                    {filter.type === 'text' && (
                        <Input
                            className="h-7 w-[150px] text-sm border-none shadow-none focus-visible:ring-0 px-1"
                            placeholder="Value..."
                            value={filterValues[filter.key] || ''}
                            onChange={(e) => onFilterChange(filter.key, e.target.value)}
                        />
                    )}

                    {filter.type === 'number' && (
                        <Input
                            type="number"
                            className="h-7 w-[100px] text-sm border-none shadow-none focus-visible:ring-0 px-1"
                            placeholder="0"
                            value={filterValues[filter.key] || ''}
                            onChange={(e) => onFilterChange(filter.key, e.target.value)}
                        />
                    )}

                    {filter.type === 'date' && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"ghost"}
                                    className={cn(
                                        "h-7 w-[140px] justify-start text-left font-normal px-1",
                                        !filterValues[filter.key] && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {filterValues[filter.key] ? format(new Date(filterValues[filter.key]), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={filterValues[filter.key] ? new Date(filterValues[filter.key]) : undefined}
                                    onSelect={(date) => onFilterChange(filter.key, date ? date.toISOString().split('T')[0] : undefined)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    )}

                    {isEditing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-1 text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveFilter(filter.id)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            ))}

            {isEditing && (
                <Popover open={isAdding} onOpenChange={setIsAdding}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1 ml-auto">
                            <Plus className="h-3 w-3" /> Add Filter
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4 space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">New Filter</h4>
                            <p className="text-sm text-muted-foreground">Define variable name to replace in SQL.</p>
                        </div>
                        <div className="grid gap-2">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="name">Label</Label>
                                <Input
                                    id="name"
                                    className="col-span-2 h-8"
                                    value={newFilter.name || ''}
                                    onChange={(e) => setNewFilter({ ...newFilter, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="key">Variable</Label>
                                <Input
                                    id="key"
                                    placeholder="start_date"
                                    className="col-span-2 h-8"
                                    value={newFilter.key || ''}
                                    onChange={(e) => setNewFilter({ ...newFilter, key: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor="type">Type</Label>
                                <Select
                                    value={newFilter.type}
                                    onValueChange={(val) => setNewFilter({ ...newFilter, type: val as any })}
                                >
                                    <SelectTrigger className="col-span-2 h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button size="sm" onClick={handleAddFilter} disabled={!newFilter.name || !newFilter.key}>
                                Create Filter
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
