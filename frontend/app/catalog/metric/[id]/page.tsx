'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useSidebar } from '@/contexts/sidebar-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/catalog/status-badge';
import { ArrowLeft, Calculator, GitBranch, ShieldCheck } from 'lucide-react';
import { BusinessMetric } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function MetricDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { toggle: toggleSidebar } = useSidebar();

    const [metric, setMetric] = useState<BusinessMetric | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchMetric() {
            try {
                // We might need a specific GET /api/metrics/[id] endpoint
                // For now, let's filter from the list or assume we create the endpoint
                // Let's create the specific endpoint for cleaner code
                const res = await fetch(`/api/metrics/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setMetric(data.data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchMetric();
    }, [id]);

    if (isLoading) {
        return (
            <SidebarLayout>
                <div className="p-6">
                    <Skeleton className="h-12 w-64 mb-4" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </SidebarLayout>
        );
    }

    if (!metric) {
        return (
            <SidebarLayout>
                <div className="p-6 flex flex-col items-center justify-center h-full">
                    <h2 className="text-xl font-semibold">Metric not found</h2>
                    <Button variant="link" onClick={() => router.push('/catalog')}>Back to Catalog</Button>
                </div>
            </SidebarLayout>
        );
    }

    return (
        <SidebarLayout>
            <div className="flex flex-col h-full bg-background overflow-y-auto">
                <header className="border-b px-6 py-4 bg-card sticky top-0 z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/catalog')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-primary" />
                            <h1 className="text-xl font-bold">{metric.name}</h1>
                        </div>
                        <StatusBadge status={metric.status} className="ml-auto" />
                    </div>
                </header>

                <main className="p-6 max-w-4xl mx-auto w-full space-y-6">
                    {/* Context Card */}
                    <Card>
                        <CardHeader className="text-lg font-semibold border-b bg-muted/20 py-3">
                            Business Definition
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                                <p className="text-base">{metric.description}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">Formula Logic</h3>
                                <code className="bg-muted px-2 py-1 rounded text-sm font-mono block w-full whitespace-pre-wrap">
                                    {metric.formula}
                                </code>
                            </div>
                            <div className="flex gap-2 mt-4">
                                {metric.tags.map(tag => (
                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lineage / Related Queries */}
                    <Card>
                        <CardHeader className="text-lg font-semibold border-b bg-muted/20 py-3 flex flex-row items-center gap-2">
                            <GitBranch className="w-4 h-4" />
                            Implemented By
                        </CardHeader>
                        <CardContent className="p-6">
                            <p className="text-sm text-muted-foreground mb-4">
                                This metric is calculated in the following saved queries:
                            </p>
                            {/* We need to fetch related queries. 
                         The GET /api/metrics/[id] should return them via relation. 
                     */}
                            <div className="grid gap-2">
                                {/* Placeholder for list */}
                                <div className="p-3 border rounded hover:bg-muted/50 cursor-pointer flex justify-between items-center">
                                    <span className="font-medium">Monthly Churn Analysis</span>
                                    <Badge variant="secondary">SQL</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions for Steward */}
                    <div className="flex justify-end gap-3 pb-12">
                        <Button variant="outline">Edit Definition</Button>
                        {metric.status !== 'verified' && (
                            <Button className="gap-2 bg-green-600 hover:bg-green-700">
                                <ShieldCheck className="w-4 h-4" />
                                Certify Metric
                            </Button>
                        )}
                    </div>
                </main>
            </div>
        </SidebarLayout>
    );
}
