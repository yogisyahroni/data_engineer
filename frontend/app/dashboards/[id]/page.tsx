'use client';

import { useParams } from 'next/navigation';
import { useDashboard } from '@/hooks/use-dashboard'; // Use the singular hook we just created
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { AddCardDialog } from '@/components/dashboard/add-card-dialog';
import { DashboardFilterBar } from '@/components/dashboard/dashboard-filter-bar';
import { ShareDialog } from '@/components/dashboard/share-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Save, Layout, Share2, PencilOff } from 'lucide-react';
import { useState } from 'react';
import { useSavedQueries } from '@/hooks/use-saved-queries';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { toast } from 'sonner';

export default function DashboardPage() {
    const params = useParams();
    const dashboardId = params.id as string;

    // Hooks
    const {
        dashboard,
        filters,
        filterValues,
        isLoading,
        isEditing,
        setIsEditing,
        updateLayout,
        addCard,
        removeCard,
        addFilter,
        removeFilter,
        setFilterValue,
        saveDashboard,
        togglePublic
    } = useDashboard(dashboardId);

    const { queries } = useSavedQueries({ autoFetch: true }); // Fetch available queries for "Add Card" check

    // Fetch data for cards with filters
    const { results: queriesData } = useDashboardData(dashboard, { globalFilters: filterValues });

    // UI State
    const [isAddCardOpen, setIsAddCardOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h1 className="text-2xl font-bold">Dashboard not found</h1>
                <p className="text-muted-foreground">The dashboard you are looking for does not exist or you do not have permission to view it.</p>
            </div>
        );
    }

    const handleChartClick = (params: any, cardId: string) => {
        if (!dashboard) return;

        const card = dashboard.cards.find(c => c.id === cardId);
        if (!card) return;

        // Determine filter column from x-axis
        const config = card.visualizationConfig || card.query?.visualizationConfig;
        const xAxisField = config?.xAxis;

        if (xAxisField && params.name) {
            // Apply filter
            setFilterValue(xAxisField, params.name);
            toast.success(`Filtered by ${xAxisField}: ${params.name}`);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Header */}
            <header className="border-b h-14 flex items-center justify-between px-6 bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-lg font-semibold flex items-center gap-2">
                            <Layout className="h-4 w-4 text-muted-foreground" />
                            {dashboard.name}
                        </h1>
                        {dashboard.description && (
                            <p className="text-xs text-muted-foreground">{dashboard.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddCardOpen(true)}
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Card
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={saveDashboard}
                                className="gap-2"
                            >
                                <Save className="h-4 w-4" />
                                Save Layout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="gap-2"
                            >
                                <PencilOff className="h-4 w-4" />
                                Edit Layout
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsShareOpen(true)}>
                                <Share2 className="h-4 w-4" />
                                Share
                            </Button>
                        </>
                    )}
                </div>
            </header>

            {/* Grid Canvas */}
            <main className="flex-1 overflow-y-auto p-6 bg-muted/10">
                <DashboardFilterBar
                    filters={filters || []}
                    filterValues={filterValues}
                    isEditing={isEditing}
                    onAddFilter={addFilter}
                    onRemoveFilter={removeFilter}
                    onFilterChange={setFilterValue}
                />

                <DashboardGrid
                    cards={dashboard.cards}
                    isEditing={isEditing}
                    onLayoutChange={updateLayout}
                    onRemoveCard={removeCard}
                    queriesData={queriesData}
                    onChartClick={handleChartClick}
                />
            </main>

            {/* Add Card Dialog */}
            <AddCardDialog
                open={isAddCardOpen}
                onOpenChange={setIsAddCardOpen}
                onAddQuery={(queryId, name) => {
                    // Find query config to populate default card config
                    const query = queries.find(q => q.id === queryId);
                    addCard({
                        type: 'visualization',
                        title: name,
                        queryId: queryId,
                        visualizationConfig: query?.visualizationConfig,
                    });
                }}
                onAddText={(title, content) => {
                    addCard({
                        type: 'text',
                        title: title,
                        textContent: content
                    });
                }}
            />

            <ShareDialog
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
                dashboardId={dashboardId}
                isPublic={dashboard.isPublic}
                onUpdateVisibility={togglePublic}
            />
        </div>
    );
}
