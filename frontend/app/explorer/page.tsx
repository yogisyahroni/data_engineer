'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CollectionsSidebar } from '@/components/collections-sidebar';
import { SavedQueriesList } from '@/components/saved-queries-list';
import { DualEngineEditor } from '@/components/dual-engine-editor';
import { ConnectionSelector } from '@/components/connection-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Grid, List, ArrowLeft, Menu, Table as TableIcon, BarChart3 } from 'lucide-react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useSidebar } from '@/contexts/sidebar-context';
import { ResultsTable } from '@/components/query-results/results-table';
import { ChartVisualization } from '@/components/chart-visualization';
import { VisualizationSidebar } from '@/components/visualization-sidebar';
import { VisualizationConfig } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

export default function ExplorerPage() {
  const { open: openSidebar } = useSidebar();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // New State for Query Runner
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<string>('');

  // State for Query Results
  const [queryResults, setQueryResults] = useState<{
    data: any[];
    columns: string[];
    rowCount: number;
    executionTime: number;
    isLoading: boolean;
  }>({
    data: [],
    columns: [],
    rowCount: 0,
    executionTime: 0,
    isLoading: false,
  });

  // State for Visualization
  const [activeResultTab, setActiveResultTab] = useState<'table' | 'chart'>('table');
  const [vizConfig, setVizConfig] = useState<Partial<VisualizationConfig>>({
    type: 'bar',
    xAxis: '',
    yAxis: [],
  });

  const handleResultsUpdate = (results: {
    data: any[];
    columns: string[];
    rowCount: number;
    executionTime: number;
  }) => {
    setQueryResults({
      ...results,
      isLoading: false,
    });
    // Reset visualization tab to table on new query run
    setActiveResultTab('table');
  };

  const handleChartClick = (params: any) => {
    if (params?.type === 'ANNOTATION_ADD') {
      const newAnnotation = params.payload;
      setVizConfig(prev => ({
        ...prev,
        annotations: [...(prev.annotations || []), newAnnotation]
      }));
    }
  };

  // Forecast Request Logic
  const [augmentedData, setAugmentedData] = useState<any[]>([]);

  useEffect(() => {
    // Start with raw data
    let currentData = [...(queryResults.data || [])];
    if (!currentData.length) {
      setAugmentedData([]);
      return;
    }

    const runAnalytics = async () => {
      // 1. Forecasting
      if (vizConfig.forecast?.enabled) {
        const dateCol = vizConfig.xAxis;
        const valueCol = vizConfig.yAxis?.[0];
        if (dateCol && valueCol) {
          try {
            const res = await fetch('/api/engine/forecast', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: currentData,
                dateColumn: dateCol,
                valueColumn: valueCol,
                periods: vizConfig.forecast.periods,
                model: vizConfig.forecast.model
              })
            });
            if (res.ok) {
              const json = await res.json();
              if (json.forecast) {
                currentData = [...currentData, ...json.forecast];
              }
            }
          } catch (e) { console.error('Forecast error', e); }
        }
      }

      // 2. Anomaly Detection
      if (vizConfig.anomaly?.enabled) {
        const valueCol = vizConfig.yAxis?.[0];
        if (valueCol) {
          try {
            const res = await fetch('/api/engine/anomaly', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: currentData.filter(d => !d._isForecast), // Only historical
                valueColumn: valueCol,
                method: vizConfig.anomaly.method,
                sensitivity: vizConfig.anomaly.sensitivity
              })
            });
            if (res.ok) {
              const json = await res.json();
              // Mark anomalies
              json.anomalies.forEach((ann: any) => {
                if (currentData[ann.index]) {
                  currentData[ann.index] = {
                    ...currentData[ann.index],
                    _isAnomaly: true,
                    _anomalyLabel: ann.label,
                    _anomalyScore: ann.score
                  };
                }
              });
            }
          } catch (e) { console.error('Anomaly error', e); }
        }
      }

      // 3. Clustering
      if (vizConfig.clustering?.enabled) {
        try {
          const features = vizConfig.clustering.features.length ? vizConfig.clustering.features : vizConfig.yAxis;
          if (features?.length) {
            const res = await fetch('/api/engine/clustering', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: currentData.filter(d => !d._isForecast),
                features: features,
                k: vizConfig.clustering.k
              })
            });
            if (res.ok) {
              const json = await res.json();
              json.clusters.forEach((c: any) => {
                if (currentData[c.dataIndex]) {
                  currentData[c.dataIndex] = {
                    ...currentData[c.dataIndex],
                    _clusterId: c.clusterId
                  };
                }
              });
            }
          }
        } catch (e) { console.error('Clustering error', e); }
      }

      setAugmentedData(currentData);
    };

    runAnalytics();
  }, [vizConfig.forecast, vizConfig.anomaly, vizConfig.clustering, queryResults.data, vizConfig.xAxis, vizConfig.yAxis]);

  return (
    <SidebarLayout>
      <div className="flex flex-1 h-full overflow-hidden">
        {/* Sidebar - Collections */}
        <div className="w-72 border-r border-border bg-card overflow-hidden flex flex-col hidden lg:flex">
          <CollectionsSidebar
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={setSelectedCollectionId}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => openSidebar()}
                >
                  <Menu className="w-5 h-5" />
                </Button>
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold text-foreground">Query Explorer</h1>
                  <p className="text-sm text-muted-foreground">
                    Browse saved queries or execute new ones
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Connection Selector is crucial for running queries */}
                <ConnectionSelector
                  value={activeConnectionId}
                  onValueChange={setActiveConnectionId}
                />

                {isEditorOpen ? (
                  <Button variant="outline" onClick={() => setIsEditorOpen(false)} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to List
                  </Button>
                ) : (
                  <Button className="gap-2" onClick={() => setIsEditorOpen(true)}>
                    <Plus className="w-4 h-4" />
                    New Query
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden bg-background">
            {isEditorOpen ? (
              <div className="h-full flex flex-col">
                {!activeConnectionId ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p>Please select a database connection above to start querying.</p>
                  </div>
                ) : (
                  <ResizablePanelGroup direction="vertical">
                    {/* Top Panel: Editor */}
                    <ResizablePanel defaultSize={40} minSize={30}>
                      <div className="h-full overflow-y-auto p-4">
                        <DualEngineEditor
                          connectionId={activeConnectionId}
                          onSchemaClick={() => console.log('Show Schema')}
                          onResultsUpdate={handleResultsUpdate}
                        />
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Bottom Panel: Results & Visualization */}
                    <ResizablePanel defaultSize={60} minSize={30}>
                      <div className="h-full flex flex-col bg-background">
                        {/* Result Tabs */}
                        <div className="border-b border-border bg-muted/40 px-4 pt-2">
                          <Tabs
                            value={activeResultTab}
                            onValueChange={(v) => setActiveResultTab(v as 'table' | 'chart')}
                            className="w-full"
                          >
                            <TabsList>
                              <TabsTrigger value="table" className="gap-2">
                                <TableIcon className="w-4 h-4" />
                                Table Result
                              </TabsTrigger>
                              <TabsTrigger value="chart" className="gap-2" disabled={queryResults.rowCount === 0}>
                                <BarChart3 className="w-4 h-4" />
                                Visualization
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden relative">
                          {activeResultTab === 'table' ? (
                            <div className="absolute inset-0 overflow-auto p-4">
                              <ResultsTable
                                data={queryResults.data}
                                columns={queryResults.columns}
                                rowCount={queryResults.rowCount}
                                executionTime={queryResults.executionTime}
                                isLoading={queryResults.isLoading}
                              />
                            </div>
                          ) : (
                            <ResizablePanelGroup direction="horizontal">
                              {/* Chart Area */}
                              <ResizablePanel defaultSize={75} minSize={50}>
                                <div className="h-full p-4 overflow-hidden">
                                  <ChartVisualization
                                    data={augmentedData}
                                    config={vizConfig}
                                    isLoading={queryResults.isLoading}
                                    onDataClick={handleChartClick}
                                  />
                                </div>
                              </ResizablePanel>

                              <ResizableHandle withHandle />

                              {/* Config Sidebar */}
                              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                                <div className="h-full border-l border-border bg-card">
                                  <VisualizationSidebar
                                    config={vizConfig}
                                    onConfigChange={setVizConfig}
                                    results={queryResults.data}
                                    columns={queryResults.columns}
                                  />
                                </div>
                              </ResizablePanel>
                            </ResizablePanelGroup>
                          )}
                        </div>
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                )}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Search & Sort Controls */}
                <div className="border-b border-border bg-card px-6 py-3 flex-shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        placeholder="Search queries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {/* View Toggles */}
                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* List */}
                <div className="p-6">
                  <SavedQueriesList
                    collectionId={selectedCollectionId}
                    onQuerySelect={(queryId: string) => {
                      console.log('[v0] Query selected:', queryId);
                      // TODO: Load into editor with saved query data
                      setIsEditorOpen(true);
                      // In real impl, we'd fetch the query details here
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
