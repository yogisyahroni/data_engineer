'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useSidebar } from '@/contexts/sidebar-context';
import { WorkspaceHeader } from '@/components/workspace-header';
import { VersionHistorySheet } from '@/components/version-control/version-history-sheet';
import { DualEngineEditor } from '@/components/dual-engine-editor';
import { ResultsPanel } from '@/components/results-panel';
import { VisualizationSidebar } from '@/components/visualization-sidebar';
import { SchemaBrowser } from '@/components/schema-browser';
import { ChartVisualization } from '@/components/chart-visualization';
import { AIReasoning } from '@/components/ai-reasoning';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Brain, Eye, Loader2 } from 'lucide-react';
import { useQueryExecution } from '@/hooks/use-query-execution';
import { useConnections } from '@/hooks/use-connections';
import { VisualizationConfig } from '@/lib/types';

export function HomePageContent() {
    const { toggle: toggleSidebar } = useSidebar();
    const [showSchemaBrowser, setShowSchemaBrowser] = useState(false);
    const [resultTab, setResultTab] = useState('table');
    const [visualizationConfig, setVisualizationConfig] = useState<Partial<VisualizationConfig>>({
        type: 'bar',
        xAxis: '',
        yAxis: [],
        seriesBreakout: '',
    });

    // State for current active query (for pinning/saving)
    const [activeQuery, setActiveQuery] = useState<{
        sql: string;
        aiPrompt?: string;
    }>({ sql: 'SELECT * FROM orders LIMIT 10' });

    // Query execution hook
    const {
        data: queryData,
        columns: queryColumns,
        rowCount: queryRowCount,
        executionTime: queryExecutionTime,
        isExecuting,
        error,
        pagination,
        setPage,
        setPageSize,
    } = useQueryExecution();

    // Version Control Integration
    const searchParams = useSearchParams();
    const queryId = searchParams.get('id');
    const initialSql = searchParams.get('sql');

    useEffect(() => {
        if (initialSql) {
            setActiveQuery(prev => ({ ...prev, sql: initialSql }));
            // Also need to push this to Editor if it doesn't auto-sync
        }
    }, [initialSql]);

    // Handle results update from editor
    const handleResultsUpdate = (results: {
        data: any[];
        columns: string[];
        rowCount: number;
        executionTime: number;
        sql: string;
        aiPrompt?: string;
    }) => {
        // Note: We don't need to manually update queryData etc if we use the SAME hook instance
        // but DualEngineEditor has its OWN hook instance. 
        // We should probably lift the hook to Home and pass it down, or manually sync here.
        // For now, let's sync to local state if needed, but easier is to just use these props.
        setActiveQuery({ sql: results.sql, aiPrompt: results.aiPrompt });
    };

    // Connections hook (for mock user)
    const { activeConnection, connections, fetchSchema, schema } = useConnections({
        userId: 'user_123', // Mock user ID
        autoFetch: true,
    });

    // Auto-detect best columns for visualization when data changes
    useEffect(() => {
        if (queryColumns && queryColumns.length >= 2 && queryData && queryData.length > 0) {
            // Try to find a good x-axis (usually name/category/date)
            const xCandidates = queryColumns.filter((col: string) => {
                const lowerCol = col.toLowerCase();
                return (
                    lowerCol.includes('name') ||
                    lowerCol.includes('category') ||
                    lowerCol.includes('date') ||
                    lowerCol.includes('month') ||
                    lowerCol.includes('type')
                );
            });

            // Try to find a good y-axis (usually numeric)
            const yCandidates = queryColumns.filter((col: string) => {
                const firstValue = queryData[0][col];
                return typeof firstValue === 'number';
            });

            if (xCandidates.length > 0 && yCandidates.length > 0) {
                setVisualizationConfig((prev) => ({
                    ...prev,
                    xAxis: xCandidates[0],
                    yAxis: [yCandidates[0]],
                }));
            } else if (queryColumns.length >= 2) {
                // Fallback: use first two columns
                setVisualizationConfig((prev) => ({
                    ...prev,
                    xAxis: queryColumns[0],
                    yAxis: [queryColumns[1]],
                }));
            }
        }
    }, [queryColumns, queryData]);

    // Fetch schema when connection changes
    useEffect(() => {
        if (activeConnection?.id) {
            fetchSchema(activeConnection.id, true); // Use mock for now
        }
    }, [activeConnection?.id, fetchSchema]);

    return (
        <SidebarLayout>
            <WorkspaceHeader
                onToggleSchemaBrowser={() => setShowSchemaBrowser(!showSchemaBrowser)}
                onToggleSidebar={toggleSidebar}
                rightContent={
                    queryId && (
                        <VersionHistorySheet
                            queryId={queryId}
                            onRevert={() => {
                                // Reload page/state logic
                                window.location.reload();
                            }}
                        />
                    )
                }
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Main Editor and Results */}
                <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
                    {/* Query Editor Section - Top */}
                    <div className="flex-shrink-0 border-b border-border bg-card">
                        <DualEngineEditor
                            onSchemaClick={() => setShowSchemaBrowser(true)}
                            onResultsUpdate={(res) => {
                                setActiveQuery({ sql: res.sql, aiPrompt: res.aiPrompt });
                                // We'll pass these down to ResultsPanel
                            }}
                            connectionId={activeConnection?.id || 'db1'}
                        />
                    </div>

                    {/* Results Section - Bottom */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <Tabs value={resultTab} onValueChange={setResultTab} className="flex flex-col h-full">
                            {/* Tab Navigation */}
                            <div className="flex-shrink-0 border-b border-border bg-card px-6 py-3">
                                <div className="flex items-center justify-between">
                                    <TabsList className="bg-muted h-9">
                                        <TabsTrigger value="table" className="text-sm flex items-center gap-2">
                                            {isExecuting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Database className="w-4 h-4" />
                                            )}
                                            Table
                                            {queryData && queryData.length > 0 && (
                                                <span className="ml-1 text-xs text-muted-foreground">
                                                    ({queryData.length})
                                                </span>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="chart"
                                            className="text-sm flex items-center gap-2"
                                            disabled={!queryData || queryData.length === 0}
                                        >
                                            <Eye className="w-4 h-4" />
                                            Visualize
                                        </TabsTrigger>
                                        <TabsTrigger value="reasoning" className="text-sm flex items-center gap-2">
                                            <Brain className="w-4 h-4" />
                                            AI Insights
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <TabsContent value="table" className="flex-1 m-0 overflow-hidden bg-background">
                                <ResultsPanel
                                    data={queryData}
                                    columns={queryColumns}
                                    rowCount={queryRowCount}
                                    executionTime={queryExecutionTime}
                                    isLoading={isExecuting}
                                    error={error}
                                    sql={activeQuery.sql}
                                    aiPrompt={activeQuery.aiPrompt}
                                    connectionId={activeConnection?.id || 'db1'}
                                    visualizationConfig={visualizationConfig}
                                    pagination={pagination}
                                    onPageChange={setPage}
                                    onPageSizeChange={setPageSize}
                                />
                            </TabsContent>

                            <TabsContent value="chart" className="flex-1 m-0 overflow-hidden bg-background">
                                <div className="h-full p-6 overflow-auto">
                                    <ChartVisualization
                                        data={queryData || []}
                                        config={visualizationConfig}
                                        isLoading={isExecuting}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent
                                value="reasoning"
                                className="flex-1 m-0 overflow-hidden bg-background p-6"
                            >
                                <AIReasoning isOpen={true} onClose={() => setResultTab('table')} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Right Sidebar - Visualization Config */}
                <div className="w-80 flex flex-col border-r border-border bg-card overflow-hidden flex-shrink-0">
                    <div className="border-b border-border px-6 py-4 flex-shrink-0">
                        <h3 className="text-sm font-semibold text-foreground">Visualization</h3>
                        <p className="text-xs text-muted-foreground mt-1">Configure your chart</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <VisualizationSidebar
                            config={visualizationConfig as any}
                            onConfigChange={setVisualizationConfig as any}
                            results={queryData}
                            columns={queryColumns}
                        />
                    </div>
                </div>

                {/* Far Right Sidebar - Schema Browser */}
                {showSchemaBrowser && (
                    <div className="w-72 flex flex-col border-r border-border bg-card overflow-hidden flex-shrink-0">
                        <div className="border-b border-border px-6 py-4 flex-shrink-0 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Schema</h3>
                            <button
                                onClick={() => setShowSchemaBrowser(false)}
                                className="text-muted-foreground hover:text-foreground text-xs"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <SchemaBrowser
                                onClose={() => setShowSchemaBrowser(false)}
                                schema={schema}
                            />
                        </div>
                    </div>
                )}
            </div>
        </SidebarLayout>
    );
}
