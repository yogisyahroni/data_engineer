"use client";

import * as React from "react";
import { Check, Columns } from "lucide-react";
import { useQueryBuilderStore } from "@/stores/useQueryBuilderStore";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ColumnSelector() {
    const { config, tableSchemas, toggleColumn } = useQueryBuilderStore();
    const tables = config.tables;

    const getAllColumns = () => {
        const allCols: { table: string, tableAlias: string, name: string }[] = [];
        tables.forEach(t => {
            const schema = tableSchemas[t.name];
            if (schema) {
                schema.columns.forEach(c => {
                    allCols.push({
                        table: t.name,
                        tableAlias: t.alias,
                        name: c.name
                    });
                });
            }
        });
        return allCols;
    };

    const allColumns = getAllColumns();
    const selectedCount = config.columns.length;

    const isSelected = (table: string, column: string) => {
        return config.columns.some(c => c.table === table && c.column === column);
    };

    if (tables.length === 0) return null;

    return (
        <div className="flex items-center space-x-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 lg:flex">
                        <Columns className="mr-2 h-4 w-4" />
                        Columns
                        {selectedCount > 0 && (
                            <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal lg:hidden">
                                {selectedCount}
                            </Badge>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px]">
                    <DropdownMenuLabel>Select Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-[300px]">
                        {tables.map(table => (
                            <React.Fragment key={table.name}>
                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground mt-2">
                                    {table.name} ({table.alias})
                                </DropdownMenuLabel>
                                {tableSchemas[table.name]?.columns.map(col => (
                                    <DropdownMenuCheckboxItem
                                        key={`${table.name}.${col.name}`}
                                        checked={isSelected(table.name, col.name)}
                                        onCheckedChange={() => toggleColumn({
                                            table: table.name,
                                            column: col.name
                                        })}
                                    >
                                        {col.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </React.Fragment>
                        ))}
                    </ScrollArea>
                </DropdownMenuContent>
            </DropdownMenu>
            {selectedCount > 0 && (
                <div className="hidden lg:flex gap-2 flex-wrap">
                    {config.columns.map(col => (
                        <Badge key={`${col.table}.${col.column}`} variant="secondary" className="rounded-sm px-1 font-normal">
                            {col.table}.{col.column}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
