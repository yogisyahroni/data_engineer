"use client";

import * as React from "react";
import { Filter, Trash2, Plus } from "lucide-react";
import { useQueryBuilderStore } from "@/stores/useQueryBuilderStore";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FilterOperator, LogicOperator } from "@/types/visual-query";

export function FilterBuilder() {
    const { config, tableSchemas, addFilter, removeFilter, updateFilter } = useQueryBuilderStore();
    const tables = config.tables;

    const getAllColumns = () => {
        const allCols: { table: string, name: string }[] = [];
        tables.forEach(t => {
            const schema = tableSchemas[t.name];
            if (schema) {
                schema.columns.forEach(c => {
                    allCols.push({ table: t.name, name: c.name });
                });
            }
        });
        return allCols;
    };

    const columns = getAllColumns();

    const handleAddFilter = () => {
        if (columns.length === 0) return;
        // Default to first column
        const firstCol = columns[0];
        addFilter({
            column: `${firstCol.table}.${firstCol.name}`, // Should we store fully qualified? Or structured? Type says 'column: string'
            // Let's assume 'table.column' string format for now or just column name if unambiguous.
            // Ideally type should be { table: string, column: string }.
            // But `FilterCondition` says `column: string`.
            // Let's us specific format "TableName.ColumnName" to be safe.
            operator: '=',
            value: '',
            logic: 'AND'
        });
    };

    if (tables.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                </h3>
                <Button onClick={handleAddFilter} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Add Filter
                </Button>
            </div>

            {config.filters.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                    No filters applied.
                </div>
            ) : (
                <div className="grid gap-2">
                    {config.filters.map((filter, index) => (
                        <div key={filter.id} className="flex items-center gap-2">
                            {index > 0 && (
                                <Select
                                    value={filter.logic}
                                    onValueChange={(val) => updateFilter(filter.id, { logic: val as LogicOperator })}
                                >
                                    <SelectTrigger className="w-[80px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AND">AND</SelectItem>
                                        <SelectItem value="OR">OR</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            <Select
                                value={filter.column}
                                onValueChange={(val) => updateFilter(filter.id, { column: val })}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Column" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.map(c => (
                                        <SelectItem key={`${c.table}.${c.name}`} value={`${c.table}.${c.name}`}>
                                            {c.table}.{c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filter.operator}
                                onValueChange={(val) => updateFilter(filter.id, { operator: val as FilterOperator })}
                            >
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Operator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'BETWEEN'].map(op => (
                                        <SelectItem key={op} value={op}>{op}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Input
                                className="flex-1"
                                placeholder="Value"
                                value={filter.value}
                                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                            />

                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => removeFilter(filter.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
