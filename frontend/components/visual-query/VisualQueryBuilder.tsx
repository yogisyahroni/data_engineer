"use client";

import * as React from "react";
import { TableSelector } from "./TableSelector";
import { JoinConfigurator } from "./JoinConfigurator";
import { ColumnSelector } from "./ColumnSelector";
import { FilterBuilder } from "./FilterBuilder";
import { useQueryBuilderStore } from "@/stores/useQueryBuilderStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

interface VisualQueryBuilderProps {
    connectionId: string;
}

export function VisualQueryBuilder({ connectionId }: VisualQueryBuilderProps) {
    const { config, removeTable, reset } = useQueryBuilderStore();

    // Reset store on mount if connection changes (optional, depends on UX)
    // For now, let's keep it manual or reset on unmount
    React.useEffect(() => {
        return () => reset(); // Cleanup on unmount
    }, [reset]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">Query Builder</h2>
                    <p className="text-sm text-muted-foreground">
                        Construct your query by adding tables and configuring joins.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={reset} disabled={config.tables.length === 0}>
                        Reset
                    </Button>
                    <ColumnSelector />
                    <TableSelector connectionId={connectionId} />
                </div>
            </div>

            {config.tables.length === 0 ? (
                <div className="flex h-[200px] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    No tables selected. Click "Add Table" to start.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {config.tables.map((table, index) => (
                        <Card key={`${table.name}-${index}`} className="relative">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {table.name}
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => removeTable(table.name)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">
                                    Alias: <span className="font-mono text-foreground">{table.alias}</span>
                                </div>
                                {/* Placeholder for column selection inside table card? or keep it separate? */}
                                {/* Implementation Plan said "ColumnSelector" as separate component, but grouping by table might be nice. */}
                                {/* For now, just listing selected tables. Columns will be in next Phase/Component */}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Joins */}
            {config.tables.length > 1 && (
                <div className="space-y-4">
                    <Separator />
                    <JoinConfigurator />
                </div>
            )}

            {/* Filters */}
            {config.tables.length > 0 && (
                <div className="space-y-4">
                    <Separator />
                    <FilterBuilder />
                </div>
            )}

            {/* Actions */}
            {config.tables.length > 0 && (
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => {
                        import('@/lib/api/visualQueryApi').then(({ visualQueryApi }) => {
                            import('sonner').then(({ toast }) => {
                                toast.promise(visualQueryApi.generateSql(config), {
                                    loading: 'Generating SQL...',
                                    success: (data) => {
                                        console.log("SQL Generated:", data);
                                        return `SQL Generated! Check console.`;
                                    },
                                    error: 'Failed to generate SQL'
                                });
                            });
                        });
                    }}>
                        Generate SQL
                    </Button>
                    <Button onClick={() => {
                        console.log("Preview Data for:", config);
                    }}>
                        Preview Data
                    </Button>
                </div>
            )}

            {/* Debug View */}
            <div className="mt-8 rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-50 overflow-auto max-h-[300px]">
                <pre>{JSON.stringify(config, null, 2)}</pre>
            </div>
        </div>
    );
}
