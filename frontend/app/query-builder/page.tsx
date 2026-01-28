'use client';

import { useState } from 'react';
import { useWorkspace } from '@/contexts/workspace-context';
import { TablePicker } from '@/components/query-builder/table-picker';
import { ColumnSelector } from '@/components/query-builder/column-selector';
import { FilterBuilder } from '@/components/query-builder/filter-builder';
import { SortSelector } from '@/components/query-builder/sort-selector';
import { QueryPreview } from '@/components/query-builder/query-preview';
import { SaveQueryDialog } from '@/components/saved-queries/save-query-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    QueryBuilderState,
    createInitialState,
    ColumnSelection,
    FilterGroup,
    SortRule,
} from '@/lib/query-builder/types';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';

export default function QueryBuilderPage() {
    const { workspace } = useWorkspace();
    const [connections, setConnections] = useState<any[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(true);

    // State
    const [connectionId, setConnectionId] = useState<string>('');
    const [qbState, setQbState] = useState<QueryBuilderState | null>(null);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [generatedSql, setGeneratedSql] = useState('');

    // Load connections on mount
    useEffect(() => {
        fetchConnections();
    }, [workspace]);

    // Initial state when connection changes
    useEffect(() => {
        if (connectionId) {
            setQbState(createInitialState(connectionId));
        } else {
            setQbState(null);
        }
    }, [connectionId]);

    const fetchConnections = async () => {
        if (!workspace) return;
        try {
            setIsLoadingConnections(true);
            const res = await fetch(`/api/connections?workspaceId=${workspace.id}`);
            if (res.ok) {
                const data = await res.json();
                setConnections(data);
                // Auto-select first connection if available and none selected
                if (data.length > 0 && !connectionId) {
                    setConnectionId(data[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch connections:', error);
            toast.error('Failed to load connections');
        } finally {
            setIsLoadingConnections(false);
        }
    };

    const handleTableSelect = (table: string) => {
        if (!qbState) return;
        // Reset columns, filters, sorts when table changes
        setQbState({
            ...qbState,
            table,
            columns: [],
            filters: {
                id: 'root',
                operator: 'AND',
                conditions: [],
            },
            sorts: [],
        });
    };

    const handleColumnsChange = (columns: ColumnSelection[]) => {
        if (!qbState) return;
        setQbState({ ...qbState, columns });
    };

    const handleFiltersChange = (filters: FilterGroup) => {
        if (!qbState) return;
        setQbState({ ...qbState, filters });
    };

    const handleSortsChange = (sorts: SortRule[]) => {
        if (!qbState) return;
        setQbState({ ...qbState, sorts });
    };

    const handleReset = () => {
        if (connectionId) {
            setQbState(createInitialState(connectionId));
            toast.success('Query builder reset');
        }
    };

    const handleSaveQuery = (sql: string) => {
        setGeneratedSql(sql);
        setIsSaveDialogOpen(true);
    };

    if (!workspace) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-muted-foreground">Select a workspace to continue</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Query Builder</h1>
                <p className="text-muted-foreground">
                    Visually build SQL queries without writing code.
                </p>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Panel: Configuration */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Data Source</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Connection</label>
                                <Select
                                    value={connectionId}
                                    onValueChange={setConnectionId}
                                    disabled={isLoadingConnections}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select connection..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {connections.map((conn) => (
                                            <SelectItem key={conn.id} value={conn.id}>
                                                {conn.name} ({conn.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {connectionId && qbState && (
                                <>
                                    <Separator />
                                    <TablePicker
                                        connectionId={connectionId}
                                        selectedTable={qbState.table}
                                        onTableSelect={handleTableSelect}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {qbState?.table && (
                        <>
                            <ColumnSelector
                                connectionId={connectionId}
                                tableName={qbState.table}
                                selectedColumns={qbState.columns}
                                onColumnsChange={handleColumnsChange}
                            />

                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleReset}
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reset Query
                            </Button>
                        </>
                    )}
                </div>

                {/* Center Panel: Filters & Logic */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                    {qbState?.table ? (
                        <>
                            <FilterBuilder
                                availableColumns={qbState.columns.map((c) => c.column)}
                                filters={qbState.filters}
                                onFiltersChange={handleFiltersChange}
                            />
                            <SortSelector
                                availableColumns={qbState.columns.map((c) => c.column)}
                                sorts={qbState.sorts}
                                onSortsChange={handleSortsChange}
                            />
                        </>
                    ) : (
                        <Card className="h-full border-dashed bg-muted/50 flex items-center justify-center">
                            <CardContent className="text-center py-10">
                                <p className="text-muted-foreground">
                                    Select a table to configure filters and sorting
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Panel: Preview & Results */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                    {qbState ? (
                        <QueryPreview state={qbState} onSave={handleSaveQuery} />
                    ) : (
                        <Card className="h-full border-dashed bg-muted/50 flex items-center justify-center">
                            <CardContent className="text-center py-10">
                                <p className="text-muted-foreground">
                                    Query preview will appear here
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            {/* Save Query Dialog */}
            <SaveQueryDialog
                open={isSaveDialogOpen}
                onOpenChange={setIsSaveDialogOpen}
                sql={generatedSql}
                connectionId={connectionId}
                aiPrompt="Created via Visual Query Builder"
                onSaveSuccess={() => {
                    // Nothing specific needed here
                }}
            />
        </div>
    );
}
