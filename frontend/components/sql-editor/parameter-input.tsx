'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type ParameterType = 'string' | 'number' | 'boolean' | 'date' | 'timestamp' | 'array';

export interface QueryParameter {
    name: string;
    type: ParameterType;
    value: any;
    defaultValue?: any;
    description?: string;
}

interface ParameterInputProps {
    sql: string;
    parameters: QueryParameter[];
    onParametersChange: (parameters: QueryParameter[]) => void;
}

export function ParameterInput({ sql, parameters, onParametersChange }: ParameterInputProps) {
    const [detectedParams, setDetectedParams] = useState<string[]>([]);

    // Extract {{parameter}} from SQL
    useEffect(() => {
        const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
        const matches = Array.from(sql.matchAll(regex));
        const paramNames = Array.from(new Set(matches.map((m) => m[1])));
        setDetectedParams(paramNames);

        // Add new parameters if not exists
        const existingNames = new Set(parameters.map((p) => p.name));
        const newParams = paramNames
            .filter((name) => !existingNames.has(name))
            .map((name) => ({
                name,
                type: 'string' as ParameterType,
                value: '',
            }));

        if (newParams.length > 0) {
            onParametersChange([...parameters, ...newParams]);
        }

        // Remove parameters that are no longer in SQL
        const currentParams = parameters.filter((p) => paramNames.includes(p.name));
        if (currentParams.length !== parameters.length) {
            onParametersChange(currentParams);
        }
    }, [sql]);

    const handleParameterChange = (name: string, field: keyof QueryParameter, value: any) => {
        const updated = parameters.map((p) =>
            p.name === name ? { ...p, [field]: value } : p
        );
        onParametersChange(updated);
    };

    const handleRemoveParameter = (name: string) => {
        const filtered = parameters.filter((p) => p.name !== name);
        onParametersChange(filtered);
    };

    if (detectedParams.length === 0) {
        return null; // No parameters - hide component
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                    <span>Query Parameters</span>
                    <Badge variant="secondary">{detectedParams.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {parameters.map((param) => (
                        <ParameterRow
                            key={param.name}
                            parameter={param}
                            onChange={(field, value) =>
                                handleParameterChange(param.name, field, value)
                            }
                            onRemove={() => handleRemoveParameter(param.name)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

interface ParameterRowProps {
    parameter: QueryParameter;
    onChange: (field: keyof QueryParameter, value: any) => void;
    onRemove: () => void;
}

function ParameterRow({ parameter, onChange, onRemove }: ParameterRowProps) {
    return (
        <div className="grid grid-cols-12 gap-3 items-end">
            {/* Parameter Name */}
            <div className="col-span-3">
                <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                <Input value={parameter.name} disabled className="h-9 text-sm" />
            </div>

            {/* Parameter Type */}
            <div className="col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                <Select
                    value={parameter.type}
                    onValueChange={(value) => onChange('type', value as ParameterType)}
                >
                    <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="timestamp">Timestamp</SelectItem>
                        <SelectItem value="array">Array</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Parameter Value */}
            <div className="col-span-6">
                <Label className="text-xs text-muted-foreground mb-1 block">Value</Label>
                <ParameterValueInput
                    type={parameter.type}
                    value={parameter.value}
                    onChange={(value) => onChange('value', value)}
                />
            </div>

            {/* Remove Button */}
            <div className="col-span-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="h-9 w-9 p-0"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

interface ParameterValueInputProps {
    type: ParameterType;
    value: any;
    onChange: (value: any) => void;
}

function ParameterValueInput({ type, value, onChange }: ParameterValueInputProps) {
    const [arrayItems, setArrayItems] = useState<string[]>(
        type === 'array' && Array.isArray(value) ? value : []
    );
    const [newItem, setNewItem] = useState('');

    useEffect(() => {
        if (type === 'array') {
            onChange(arrayItems);
        }
    }, [arrayItems]);

    if (type === 'string') {
        return (
            <Input
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter text..."
                className="h-9 text-sm"
            />
        );
    }

    if (type === 'number') {
        return (
            <Input
                type="number"
                value={value || ''}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                placeholder="Enter number..."
                className="h-9 text-sm"
            />
        );
    }

    if (type === 'boolean') {
        return (
            <Select value={value?.toString() || 'false'} onValueChange={onChange}>
                <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                </SelectContent>
            </Select>
        );
    }

    if (type === 'date') {
        const dateValue = value ? new Date(value) : undefined;

        return (
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            'h-9 w-full justify-start text-left font-normal text-sm',
                            !dateValue && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateValue ? format(dateValue, 'yyyy-MM-dd') : 'Pick a date'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={(date) =>
                            onChange(date ? format(date, 'yyyy-MM-dd') : '')
                        }
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        );
    }

    if (type === 'timestamp') {
        return (
            <Input
                type="datetime-local"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 text-sm"
            />
        );
    }

    if (type === 'array') {
        return (
            <div className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="Add item..."
                        className="h-9 text-sm flex-1"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newItem.trim()) {
                                setArrayItems([...arrayItems, newItem.trim()]);
                                setNewItem('');
                            }
                        }}
                    />
                    <Button
                        size="sm"
                        onClick={() => {
                            if (newItem.trim()) {
                                setArrayItems([...arrayItems, newItem.trim()]);
                                setNewItem('');
                            }
                        }}
                        className="h-9"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {arrayItems.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {arrayItems.map((item, idx) => (
                            <Badge key={idx} variant="secondary" className="gap-1">
                                {item}
                                <button
                                    onClick={() =>
                                        setArrayItems(arrayItems.filter((_, i) => i !== idx))
                                    }
                                    className="ml-1 rounded-sm hover:bg-muted p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}
