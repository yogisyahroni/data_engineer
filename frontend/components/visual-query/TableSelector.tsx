"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { connectionsApi } from "@/lib/api/connections";
import { SchemaTable } from "@/types/visual-query";
import { useQueryBuilderStore } from "@/stores/useQueryBuilderStore";
import { toast } from "sonner";

interface TableSelectorProps {
    connectionId: string;
    disabled?: boolean;
}

export function TableSelector({ connectionId, disabled }: TableSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [tables, setTables] = React.useState<SchemaTable[]>([]);
    const [loading, setLoading] = React.useState(false);

    const { config, addTable } = useQueryBuilderStore();

    React.useEffect(() => {
        if (!connectionId) return;

        const fetchSchema = async () => {
            setLoading(true);
            try {
                const schema = await connectionsApi.getSchema(connectionId);
                setTables(schema.tables || []);
            } catch (error) {
                toast.error("Failed to load tables");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchSchema();
    }, [connectionId]);

    const handleSelect = (tableName: string) => {
        // Generate simple alias (t1, t2, or first char)
        const existingAliases = config.tables.map(t => t.alias);
        let alias = tableName.charAt(0).toLowerCase();
        let counter = 1;
        while (existingAliases.includes(alias)) {
            alias = `${tableName.charAt(0).toLowerCase()}${counter}`;
            counter++;
        }

        // Find table schema
        const tableSchema = tables.find(t => t.name === tableName);
        if (!tableSchema) {
            toast.error("Table schema not found");
            return;
        }

        addTable({
            name: tableName,
            alias: alias
        }, tableSchema); // Pass schema to store
        setOpen(false);
        toast.success(`Table ${tableName} added`);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                    disabled={disabled || loading}
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        "Add Table..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search table..." />
                    <CommandList>
                        <CommandEmpty>No table found.</CommandEmpty>
                        <CommandGroup>
                            {tables.map((table) => {
                                const isSelected = config.tables.some(t => t.name === table.name);
                                return (
                                    <CommandItem
                                        key={table.name}
                                        value={table.name}
                                        onSelect={() => handleSelect(table.name)}
                                        disabled={isSelected}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {table.name}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
