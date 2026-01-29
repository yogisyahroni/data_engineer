
'use client';

import { useDashboard } from '@/hooks/use-dashboard';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import { DashboardFilterBar } from '@/components/dashboard/dashboard-filter-bar';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AppDashboardViewProps {
    dashboardId: string;
}

export function AppDashboardView({ dashboardId }: AppDashboardViewProps) {
    const {
        dashboard,
        filters,
        filterValues,
        isLoading,
        addFilter,
        removeFilter,
        setFilterValue,
    } = useDashboard(dashboardId);

    // Fetch data for cards with filters
    const { results: queriesData } = useDashboardData(dashboard, { globalFilters: filterValues });

    const handleChartClick = (params: any, cardId: string) => {
        if (!dashboard) return;

        const card = dashboard.cards.find((c: any) => c.id === cardId);
        if (!card) return;

        const config = card.visualizationConfig || card.query?.visualizationConfig;
        const xAxisField = config?.xAxis;

        if (xAxisField && params.name) {
            setFilterValue(xAxisField, params.name);
            toast.success(`Filtered by ${xAxisField}: ${params.name}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <p className="text-muted-foreground">Dashboard not found or access denied.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            {/* Read-Only Header */}
            <div className="px-6 py-4 flex justify-between items-center bg-background border-b sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">{dashboard.name}</h2>
                    {dashboard.description && <p className="text-sm text-muted-foreground">{dashboard.description}</p>}
                </div>
                <div className="text-xs text-muted-foreground">
                    Last updated {new Date(dashboard.updatedAt).toLocaleDateString()}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <DashboardFilterBar
                    filters={filters || []}
                    filterValues={filterValues}
                    isEditing={false} // Disable adding new filters in runtime
                    onAddFilter={addFilter}
                    onRemoveFilter={removeFilter} // Maybe disable removal too? Or allow temporary removal?
                    onFilterChange={setFilterValue}
                />

                <div className="mt-6">
                    <DashboardGrid
                        cards={dashboard.cards}
                        isEditing={false}
                        onLayoutChange={() => { }}
                        onRemoveCard={() => { }}
                        queriesData={queriesData}
                        onChartClick={handleChartClick}
                    />
                </div>
            </div>
        </div>
    );
}
