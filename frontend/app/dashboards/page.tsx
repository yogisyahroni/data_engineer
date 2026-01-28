'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Share2,
  Save,
  Edit2,
  Trash2,
  LayoutGrid,
  Search,
  MoreVertical,
  Copy,
  Eye,
  Loader2,
  Settings2,
  Trash,
  Globe,
  Menu,
  Download,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboards } from '@/hooks/use-dashboards';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { DashboardFilters, DashboardFilter } from '@/components/dashboard/dashboard-filters';
import { DashboardShareDialog } from '@/components/dashboard/dashboard-share-dialog';
import { AddWidgetDialog } from '@/components/dashboard/add-widget-dialog';
import { QueryBuilderDialog } from '@/components/dashboard/query-builder-dialog';
import { DrillThroughModal } from '@/components/dashboard/drill-through-modal';
import type { Dashboard, DashboardCard } from '@/lib/types';
import { Layout } from 'react-grid-layout';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useSidebar } from '@/contexts/sidebar-context';
import { ExportService } from '@/lib/services/export-service';
import { toast } from 'sonner';
import React from 'react'; // Added React import for React.useMemo

export default function DashboardsPage() {
  const {
    activeDashboard,
    isLoading: isLoadingDashboards,
    updateDashboard,
    createDashboard,
    deleteDashboard,
    selectDashboard,
    addCard,
    removeCard,
    updateCardPositions,
    duplicateDashboard,
    dashboards, // Keep dashboards for the list
  } = useDashboards({ autoFetch: true });

  // Filters state
  const [filters, setFilters] = useState<DashboardFilter[]>([]);

  // Phase 6.2: Global Filter Logic
  // Transform UI filters array into a simple Record<string, any> for the hook
  const globalFilters = React.useMemo(() => {
    const output: Record<string, any> = {};
    filters.forEach(f => {
      // Use the filter 'name' as the variable key (lowercase, no spaces)
      // In a real app, 'key' should be a separate property in the filter object
      const key = f.name.toLowerCase().replace(/\s+/g, '_');

      if (f.value !== null && f.value !== undefined) {
        if (f.type === 'date-range' && f.value.from) {
          // Special handling for date ranges - flattened to start_date/end_date usually
          output[`${key}_from`] = f.value.from.toISOString();
          output[`${key}_to`] = f.value.to ? f.value.to.toISOString() : f.value.from.toISOString();
        } else {
          output[key] = f.value;
        }
      }
    });
    return output;
  }, [filters]);

  // Phase 6.1: Real Data Integration
  const { results: realQueryResults, isLoading: isDataLoading, refresh: refreshData } = useDashboardData(activeDashboard, {
    globalFilters,
    autoFetch: true
  });

  // Transform results for Grid consumption
  // We map the Record<queryId, QueryResult> to the format expected by DashboardGrid
  const queriesData = React.useMemo(() => {
    const output: Record<string, any> = {};
    if (!activeDashboard) return output;

    // Initialize with loading state if needed
    activeDashboard.cards.forEach(card => {
      if (card.queryId) {
        const result = realQueryResults[card.queryId];
        output[card.queryId] = {
          data: result?.data || [],
          isLoading: isDataLoading,
          name: card.title || 'Query',
          error: result?.error
        };
      }
    });
    return output;
  }, [activeDashboard, realQueryResults, isDataLoading]);

  // Derived state
  const isEditing = false; // Placeholder for 'mode' which is not defined in the snippet. Assuming false for now.
  const { open: openSidebar } = useSidebar();
  const [isEditMode, setIsEditMode] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Dashboard creation state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState('');

  // Drill-through state (Phase 7.1)
  const [drillThroughOpen, setDrillThroughOpen] = useState(false);
  const [drillThroughData, setDrillThroughData] = useState<any[]>([]);
  const [drillThroughTitle, setDrillThroughTitle] = useState('');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState(false);



  // Sync dashboard name when active dashboard changes
  useEffect(() => {
    if (activeDashboard) {
      setDashboardName(activeDashboard.name);
    }
  }, [activeDashboard]);

  // Select first dashboard when loaded
  useEffect(() => {
    if (dashboards.length > 0 && !activeDashboard) {
      selectDashboard(dashboards[0]);
    }
  }, [dashboards, activeDashboard, selectDashboard]);

  // Filter dashboards for sidebar list
  const filteredDashboards = dashboards.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle create dashboard
  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return;

    setIsCreating(true);
    const result = await createDashboard({
      name: newDashboardName,
      description: newDashboardDescription,
    });

    if (result.success) {
      selectDashboard(result.data!);
      setIsCreateDialogOpen(false);
      setNewDashboardName('');
      setNewDashboardDescription('');
    }
    setIsCreating(false);
  };

  // Handle delete dashboard
  const handleDeleteDashboard = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this dashboard?');
    if (confirmed) {
      await deleteDashboard(id);
    }
  };

  // Handle duplicate dashboard
  const handleDuplicateDashboard = async (id: string) => {
    const result = await duplicateDashboard(id);
    if (result.success) {
      selectDashboard(result.data!);
    }
  };

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    if (!activeDashboard) return;

    const updatedCards = activeDashboard.cards.map((card) => {
      const layoutItem = (newLayout.find((l: any) => l.i === card.id) as any);
      if (layoutItem) {
        return {
          ...card,
          position: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
        };
      }
      return card;
    });

    // In a real app, we'd debounce this API call
    updateCardPositions(activeDashboard.id, updatedCards);
  }, [activeDashboard, updateCardPositions]);

  // Filter Management
  const addFilter = (type: DashboardFilter['type']) => {
    const newFilter: DashboardFilter = {
      id: `filter_${Date.now()}`,
      name: type === 'date-range' ? 'Date' : type === 'select' ? 'Category' : 'Search',
      type,
      value: type === 'date-range' ? { from: new Date(), to: new Date() } : null,
    };
    setFilters([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, value: any) => {
    setFilters(filters.map(f => f.id === id ? { ...f, value } : f));
  };

  // Phase 6.5: Chart Interaction Handler
  const handleChartClick = (params: any, cardId: string) => {
    if (!activeDashboard) return;
    const card = activeDashboard.cards.find(c => c.id === cardId);
    if (!card) return;

    // Determine what field we are filtering on
    // Ideally this comes from visualization config
    let filterKey = '';

    // Check if we have a config from the card or the query result
    const queryId = card.queryId;
    const queryData = queryId && queriesData[queryId];
    const config = card.visualizationConfig || (queryData ? queryData.config : undefined);

    if (config && config.xAxis) {
      filterKey = config.xAxis;
    } else if (params.seriesName && params.seriesName !== 'Series 1') {
      // Fallback to series name if it looks like a dimension
      filterKey = params.seriesName;
    } else {
      // Last resort: name
      filterKey = params.name;
    }

    if (!filterKey) return;

    // The value to filter by
    const value = params.name; // ECharts usually puts the category name here

    if (!value) return;

    // Check if we already have a filter for this
    // We match mostly by name or id
    const existingFilter = filters.find(f =>
      f.name.toLowerCase() === filterKey.toLowerCase() ||
      f.id === filterKey
    );

    if (existingFilter) {
      if (existingFilter.value === value) {
        // Toggle off if same value is clicked? Or just keep it?
        // Let's toggle off for better UX
        updateFilter(existingFilter.id, null);
        toast.info(`Generated filter removed: ${filterKey}`);
      } else {
        updateFilter(existingFilter.id, value);
        toast.success(`Filter applied: ${filterKey} = ${value}`);
      }
    } else {
      // Auto-create a new filter
      const newFilter: DashboardFilter = {
        id: `filter_auto_${Date.now()}`,
        name: filterKey.charAt(0).toUpperCase() + filterKey.slice(1), // Capitalize
        type: 'select', // Default to select for dimensions
        value: value
      };
      setFilters([...filters, newFilter]);
      toast.success(`New filter created: ${newFilter.name} = ${value}`);
    }
  };

  // Phase 7.1: Handle Drill Through
  const handleDrillThrough = (cardId: string) => {
    if (!activeDashboard) return;
    const card = activeDashboard.cards.find(c => c.id === cardId);
    if (!card) return;

    // For MVP, show the data currently available in the card
    const queryId = card.queryId;
    if (queryId && queriesData[queryId]) {
      setDrillThroughData(queriesData[queryId].data);
      setDrillThroughTitle(card.title || 'Underlying Data');
      setDrillThroughOpen(true);
      toast.info(`Viewing data references for: ${card.title}`);
    } else {
      toast.warning('No data available for this widget to drill through.');
    }
  };

  // Handle Export
  const handleExport = async (type: 'pdf' | 'png') => {
    if (!activeDashboard) return;

    const id = "dashboard-canvas-root";
    const filename = `${activeDashboard.name.replace(/\s+/g, '_')}_report`;

    toast.loading(`Preparing ${type.toUpperCase()} export...`, { id: 'export' });

    try {
      if (type === 'pdf') {
        await ExportService.exportToPDF(id, `${filename}.pdf`);
      } else {
        await ExportService.exportToPNG(id, `${filename}.png`);
      }
      toast.success(`${type.toUpperCase()} exported successfully`, { id: 'export' });
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: 'export' });
    }
  };

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SidebarLayout>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Dashboard List */}
        <div className="w-80 bg-card border-r border-border overflow-hidden flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => openSidebar()}
              >
                <Menu className="w-4 h-4" />
              </Button>
              <LayoutGrid className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-lg">Dashboards</h1>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter list..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Dashboard List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingDashboards ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))
            ) : filteredDashboards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs italic">
                No dashboards found
              </div>
            ) : (
              filteredDashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  onClick={() => selectDashboard(dashboard)}
                  className={`w-full cursor-pointer text-left p-3 rounded-md transition-all group ${activeDashboard?.id === dashboard.id
                    ? 'bg-primary/10 border-l-4 border-l-primary'
                    : 'hover:bg-muted/50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-sm truncate">{dashboard.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <LayoutGrid className="w-2.5 h-2.5" />
                          {dashboard.cards?.length || 0}
                        </span>
                        <span>{formatDate(dashboard.updatedAt)}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 opacity-0 group-hover:opacity-100 ${activeDashboard?.id === dashboard.id ? 'opacity-100' : ''}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicateDashboard(dashboard.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteDashboard(dashboard.id)}>
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content - Dashboard Editor/Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeDashboard ? (
            <>
              {/* Header Toolbar */}
              <div className="border-b border-border bg-card px-6 py-3 flex-shrink-0 flex items-center justify-between">
                <div className="flex-1">
                  {isEditMode ? (
                    <Input
                      value={dashboardName}
                      onChange={(e) => setDashboardName(e.target.value)}
                      className="text-lg font-bold h-9 max-w-md focus-visible:ring-offset-0"
                      placeholder="Dashboard Title"
                    />
                  ) : (
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        {activeDashboard.name}
                        {activeDashboard.isPublic && (
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20">Public</Badge>
                        )}
                      </h2>
                      {activeDashboard.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {activeDashboard.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditMode ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" className="gap-2" onClick={() => setIsEditMode(false)}>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="gap-2 hidden md:flex" onClick={() => setIsEditMode(true)}>
                        <Edit2 className="w-4 h-4" />
                        Edit Layout
                      </Button>
                      <Button variant="outline" size="icon" className="md:hidden" onClick={() => setIsEditMode(true)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      <Button variant="outline" size="sm" className="gap-2 hidden sm:flex" onClick={() => setIsShareDialogOpen(true)}>
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                      <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setIsShareDialogOpen(true)}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            <span className="hidden xs:inline">Export</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExport('pdf')}>
                            <FileText className="w-4 h-4 mr-2" />
                            Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport('png')}>
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Export as Image
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings2 className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
                            <Globe className="w-4 h-4 mr-2" />
                            Publish to Web
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View as Reader
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteDashboard(activeDashboard.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Dashboard
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>

              {/* Dashboard Filters Bar */}
              <DashboardFilters
                filters={filters}
                onAddFilter={addFilter}
                onRemoveFilter={removeFilter}
                onUpdateFilter={updateFilter}
              />

              {/* Dashboards Canvas */}
              <div id="dashboard-canvas-root" className="flex-1 overflow-y-auto p-6 bg-muted/5 scroll-smooth">
                {isEditMode && (
                  <div className="mb-6 flex items-center justify-between bg-card p-4 border border-dashed border-primary/30 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Drag the cards by the handles or resize from corners to customize your layout.
                    </div>
                    <Button className="gap-2" onClick={() => setIsAddWidgetOpen(true)}>
                      <Plus className="w-4 h-4" />
                      New Chart
                    </Button>
                  </div>
                )}

                {activeDashboard.cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] border-2 border-dashed border-border/50 rounded-xl bg-card/50 m-4">
                    <div className="max-w-sm text-center space-y-6 p-8">
                      <div className="relative mx-auto w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-20" />
                        <div className="relative bg-background p-5 rounded-full shadow-sm border border-border">
                          <LayoutGrid className="w-10 h-10 text-muted-foreground/50" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-foreground">Empty Dashboard</h3>
                        <p className="text-muted-foreground text-sm">
                          This dashboard is waiting for your insights. Add charts to visualize your data.
                        </p>
                      </div>

                      <Button onClick={() => setIsEditMode(true)} variant="outline" className="border-dashed hover:border-primary hover:text-primary transition-colors">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Card
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DashboardGrid
                    cards={activeDashboard.cards}
                    isEditing={isEditMode}
                    onLayoutChange={handleLayoutChange}
                    onRemoveCard={(cardId) => removeCard(activeDashboard.id, cardId)}
                    onChartClick={handleChartClick}
                    onDrillThrough={handleDrillThrough}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/5 p-6">
              <div className="max-w-md text-center space-y-8 animate-in fade-in-50 zoom-in-95 duration-500">
                <div className="relative mx-auto w-32 h-32">
                  <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
                  <div className="relative bg-card shadow-xl border border-border rounded-2xl w-full h-full flex items-center justify-center transform hover:-translate-y-1 transition-transform duration-300">
                    <LayoutGrid className="w-12 h-12 text-primary" />
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-accent/20 rounded-full blur-xl" />
                  <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-primary/20 rounded-full blur-xl" />
                </div>

                <div className="space-y-3">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">
                    Your Data Story Starts Here
                  </h3>
                  <p className="text-muted-foreground text-base leading-relaxed">
                    Select a dashboard to visualize insights, or create a new one to start building your own data narrative.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <Button size="lg" onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold h-12">
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Dashboard
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals and Dialogs */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Dashboard</DialogTitle>
            <DialogDescription>
              Name your dashboard and add an optional description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Product Performance Dashboard"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe what this dashboard shows..."
                value={newDashboardDescription}
                onChange={(e) => setNewDashboardDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDashboard} disabled={!newDashboardName.trim() || isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeDashboard && (
        <DashboardShareDialog
          isOpen={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          dashboardId={activeDashboard.id}
          dashboardName={activeDashboard.name}
          isPublic={activeDashboard.isPublic}
          onVisibilityChange={(isPublic) => {
            // Mock API update
            console.log('Update visibility:', isPublic);
          }}
        />
      )}

      {/* UX: Add Widget Dialogs */}
      <AddWidgetDialog
        open={isAddWidgetOpen}
        onOpenChange={setIsAddWidgetOpen}
        onAddQuery={(queryId) => {
          if (activeDashboard) {
            addCard(activeDashboard.id, {
              queryId,
              position: { x: 0, y: 0, w: 6, h: 4 },
              title: 'New Widget',
              type: 'visualization'
            });
          }
        }}
        onCreateNew={() => setIsQueryBuilderOpen(true)}
      />

      <QueryBuilderDialog
        open={isQueryBuilderOpen}
        onOpenChange={setIsQueryBuilderOpen}
        onSave={(query) => {
          if (activeDashboard) {
            addCard(activeDashboard.id, {
              queryId: query.id,
              position: { x: 0, y: 0, w: 6, h: 4 },
              title: query.name,
              type: 'visualization',
              visualizationConfig: query.visualizationConfig
            });
          }
        }}
      />
      <DrillThroughModal
        open={drillThroughOpen}
        onOpenChange={setDrillThroughOpen}
        title={drillThroughTitle}
        data={drillThroughData}
      />
    </SidebarLayout>
  );
}
