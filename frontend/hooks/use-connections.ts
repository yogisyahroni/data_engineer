'use client';

import { useState, useCallback, useEffect } from 'react';
import type { DatabaseConnection } from '@/lib/types';

// Schema types for frontend
export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    isPrimary: boolean;
    defaultValue: string | null;
    description: string | null;
}

export interface TableInfo {
    name: string;
    schema: string;
    columns: ColumnInfo[];
    foreignKeys: Array<{
        column: string;
        referencedTable: string;
        referencedSchema: string;
        referencedColumn: string;
    }>;
    rowCount: number;
}

export interface SchemaInfo {
    tables: TableInfo[];
    lastSyncedAt: Date;
}

export interface TestConnectionResult {
    success: boolean;
    message: string;
    latencyMs?: number;
    version?: string;
}

interface UseConnectionsOptions {
    userId?: string;
    autoFetch?: boolean;
}

export function useConnections(options: UseConnectionsOptions = {}) {
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [activeConnection, setActiveConnection] = useState<DatabaseConnection | null>(null);
    const [schema, setSchema] = useState<SchemaInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [isFetchingSchema, setIsFetchingSchema] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch all connections
    const fetchConnections = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (options.userId) params.append('userId', options.userId);

            const response = await fetch(`/api/connections?${params.toString()}`);

            if (!response.ok) {
                if (response.status === 401) throw new Error('Unauthorized');
                throw new Error(`Failed to fetch connections: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setConnections(result.data);
                // Set first connection as active if none selected
                if (result.data.length > 0 && !activeConnection) {
                    setActiveConnection(result.data[0]);
                }
            } else {
                throw new Error(result.error || 'Failed to fetch connections');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('[Hooks] Error fetching connections:', errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [options.userId, activeConnection]);

    // Create new connection
    const createConnection = useCallback(async (data: Partial<DatabaseConnection>) => {
        try {
            const response = await fetch('/api/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create connection');
            }

            if (result.success) {
                setConnections((prev) => [result.data, ...prev]);
                return { success: true, data: result.data };
            }
            return { success: false, error: result.error || 'Unknown error' };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }, []);

    // Update connection
    const updateConnection = useCallback(async (id: string, data: Partial<DatabaseConnection>) => {
        try {
            const response = await fetch(`/api/connections/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update connection');
            }

            if (result.success) {
                setConnections((prev) =>
                    prev.map((conn) => (conn.id === id ? result.data : conn))
                );
                return { success: true, data: result.data };
            }
            return { success: false, error: result.error || 'Unknown error' };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }, []);

    // Delete connection
    const deleteConnection = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/connections/${id}`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete connection');
            }

            if (result.success) {
                setConnections((prev) => prev.filter((conn) => conn.id !== id));
                if (activeConnection?.id === id) {
                    setActiveConnection(null);
                    setSchema(null);
                }
                return { success: true };
            }
            return { success: false, error: result.error || 'Unknown error' };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: errorMessage };
        }
    }, [activeConnection]);

    // Test connection
    const testConnection = useCallback(async (id: string): Promise<TestConnectionResult> => {
        setIsTestingConnection(true);
        try {
            const response = await fetch(`/api/connections/${id}/test`, {
                method: 'POST',
            });

            const result = await response.json();
            return result.data || { success: false, message: 'Unknown error' };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, message: errorMessage };
        } finally {
            setIsTestingConnection(false);
        }
    }, []);

    // Fetch schema for a connection
    const fetchSchema = useCallback(async (id: string, useMock: boolean = false) => {
        setIsFetchingSchema(true);
        try {
            const params = new URLSearchParams();
            if (useMock) params.append('mock', 'true');

            const response = await fetch(`/api/connections/${id}/schema?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setSchema(result.data);
                return { success: true, data: result.data, isMock: result.isMock };
            }
            return { success: false, error: result.error || 'Unknown error' };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: errorMessage };
        } finally {
            setIsFetchingSchema(false);
        }
    }, []);

    // Select active connection
    const selectConnection = useCallback((connection: DatabaseConnection | null) => {
        setActiveConnection(connection);
        setSchema(null); // Reset schema when switching connections
    }, []);

    // Auto-fetch connections on mount
    useEffect(() => {
        if (options.autoFetch !== false && options.userId) {
            fetchConnections();
        }
    }, [fetchConnections, options.autoFetch, options.userId]);

    return {
        // State
        connections,
        activeConnection,
        schema,
        isLoading,
        isTestingConnection,
        isFetchingSchema,
        error,

        // Actions
        refreshConnections: fetchConnections, // Alias for UI consistency
        refetch: fetchConnections,
        createConnection,
        updateConnection,
        deleteConnection,
        testConnection,
        fetchSchema,
        selectConnection,
    };
}

export type { DatabaseConnection };
