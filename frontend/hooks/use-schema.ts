'use client';

import { useState, useCallback } from 'react';
import { useConnections, type SchemaInfo, type TableInfo } from './use-connections';

interface UseSchemaOptions {
    connectionId?: string;
}

export function useSchema(options: UseSchemaOptions = {}) {
    const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

    const { schema, isFetchingSchema, fetchSchema } = useConnections({
        autoFetch: false,
    });

    // Filter tables based on search query
    const filteredTables = schema?.tables.filter((table) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            table.name.toLowerCase().includes(query) ||
            table.columns.some((col) => col.name.toLowerCase().includes(query))
        );
    }) || [];

    // Toggle table expansion
    const toggleTableExpansion = useCallback((tableName: string) => {
        setExpandedTables((prev) => {
            const next = new Set(prev);
            if (next.has(tableName)) {
                next.delete(tableName);
            } else {
                next.add(tableName);
            }
            return next;
        });
    }, []);

    // Expand all tables
    const expandAll = useCallback(() => {
        if (schema) {
            setExpandedTables(new Set(schema.tables.map((t) => t.name)));
        }
    }, [schema]);

    // Collapse all tables
    const collapseAll = useCallback(() => {
        setExpandedTables(new Set());
    }, []);

    // Get column type badge color
    const getColumnTypeColor = (type: string): string => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('int') || lowerType.includes('numeric') || lowerType.includes('decimal')) {
            return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
        if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
            return 'bg-green-500/10 text-green-500 border-green-500/20';
        }
        if (lowerType.includes('timestamp') || lowerType.includes('date') || lowerType.includes('time')) {
            return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        }
        if (lowerType.includes('bool')) {
            return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        }
        if (lowerType.includes('uuid')) {
            return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
        }
        if (lowerType.includes('json')) {
            return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        }
        return 'bg-muted text-muted-foreground';
    };

    // Format row count for display
    const formatRowCount = (count: number): string => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        }
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    };

    // Load schema for connection
    const loadSchema = useCallback(async (connectionId: string, useMock: boolean = true) => {
        return fetchSchema(connectionId, useMock);
    }, [fetchSchema]);

    return {
        // State
        schema,
        selectedTable,
        searchQuery,
        expandedTables,
        filteredTables,
        isFetchingSchema,

        // Actions
        setSelectedTable,
        setSearchQuery,
        toggleTableExpansion,
        expandAll,
        collapseAll,
        loadSchema,

        // Helpers
        getColumnTypeColor,
        formatRowCount,
    };
}
