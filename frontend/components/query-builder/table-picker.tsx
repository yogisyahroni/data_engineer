'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Database } from 'lucide-react';
import { TableSchema } from '@/lib/query-builder/types';

interface TablePickerProps {
    connectionId: string;
    selectedTable: string | null;
    onTableSelect: (table: string) => void;
}

export function TablePicker({
    connectionId,
    selectedTable,
    onTableSelect,
}: TablePickerProps) {
    const [tables, setTables] = useState<TableSchema[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTables();
    }, [connectionId]);

    const fetchTables = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/connections/${connectionId}/schema`);
            if (res.ok) {
                const data = await res.json();
                setTables(data.tables || []);
            }
        } catch (error) {
            console.error('Failed to fetch tables:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTables = tables.filter((table) =>
        table.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Label>Select Table</Label>
                <div className="h-10 bg-muted animate-pulse rounded-md" />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="table-select">Select Table</Label>
            <div className="space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tables..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select value={selectedTable || undefined} onValueChange={onTableSelect}>
                    <SelectTrigger id="table-select">
                        <SelectValue placeholder="Choose a table..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {filteredTables.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No tables found
                            </div>
                        ) : (
                            filteredTables.map((table) => (
                                <SelectItem key={table.name} value={table.name}>
                                    <div className="flex items-center gap-2">
                                        <Database className="h-4 w-4 text-muted-foreground" />
                                        <span>{table.name}</span>
                                        {table.rowCount !== undefined && (
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                ({table.rowCount.toLocaleString()} rows)
                                            </span>
                                        )}
                                    </div>
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            {selectedTable && (
                <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium">{selectedTable}</span>
                </p>
            )}
        </div>
    );
}
