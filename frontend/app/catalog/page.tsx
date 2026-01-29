'use client';

import { useState } from 'react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useSidebar } from '@/contexts/sidebar-context';
import { useSavedQueries } from '@/hooks/use-saved-queries';
import { useBusinessMetrics } from '@/hooks/use-business-metrics';
import { CatalogItemCard } from '@/components/catalog/catalog-item-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Filter } from 'lucide-react';
import { SavedQuery, BusinessMetric } from '@/lib/types';

export default function DataCatalogPage() {
    const { toggle: toggleSidebar } = useSidebar(); // Assuming context provides toggle
    const { queries, isLoading: queriesLoading } = useSavedQueries({ autoFetch: true });
    const { metrics, isLoading: metricsLoading } = useBusinessMetrics({ autoFetch: true });

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, verified, queries, metrics

    const isLoading = queriesLoading || metricsLoading;

    // Combine and Filter Items
    const allItems = [
        ...queries.map(q => ({ ...q, type: 'query' as const })),
        ...metrics.map(m => ({ ...m, type: 'metric' as const }))
    ];

    const filteredItems = allItems.filter(item => {
        // 1. Search Filter
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            item.name.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            item.tags?.some(tag => tag.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;

        // 2. Tab Filter
        if (activeTab === 'verified') {
            if (item.type === 'query') {
                return (item as SavedQuery).certificationStatus === 'verified';
            } else {
                return (item as BusinessMetric).status === 'verified';
            }
        }
        if (activeTab === 'queries') return item.type === 'query';
        if (activeTab === 'metrics') return item.type === 'metric';

        return true; // 'all'
    });

    // Sort by updated (most recent first)
    const sortedItems = filteredItems.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return (
        <SidebarLayout>
            <div className="h-full flex flex-col bg-background">
                {/* Header */}
                <header className="border-b px-6 py-4 flex items-center justify-between bg-card">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Data Catalog</h1>
                        <p className="text-sm text-muted-foreground">
                            Discover certified metrics and trusted datasets.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Actions like "New Metric" could go here */}
                    </div>
                </header>

                {/* Toolbar */}
                <div className="px-6 py-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/50">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search metrics, queries, tags..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                        <TabsList>
                            <TabsTrigger value="all">All Assets</TabsTrigger>
                            <TabsTrigger value="verified" className="gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Verified
                            </TabsTrigger>
                            <TabsTrigger value="metrics">Metrics</TabsTrigger>
                            <TabsTrigger value="queries">Queries</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : sortedItems.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                            <Filter className="h-12 w-12 mb-4 opacity-20" />
                            <p>No items found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sortedItems.map((item) => (
                                <CatalogItemCard
                                    key={`${item.type}-${item.id}`}
                                    item={item}
                                    type={item.type}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </SidebarLayout>
    );
}
