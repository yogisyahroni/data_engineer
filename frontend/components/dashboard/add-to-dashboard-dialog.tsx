
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDashboards } from '@/hooks/use-dashboards';
import { useSavedQueries } from '@/hooks/use-saved-queries';
import { LayoutGrid, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { VisualizationConfig } from '@/lib/types';

interface AddToDashboardDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    sql: string;
    aiPrompt?: string;
    connectionId: string;
    visualizationConfig?: Partial<VisualizationConfig>;
}

export function AddToDashboardDialog({
    isOpen,
    onOpenChange,
    sql,
    aiPrompt,
    connectionId,
    visualizationConfig,
}: AddToDashboardDialogProps) {
    const { dashboards, updateDashboard, isLoading: isDashboardsLoading } = useDashboards({ autoFetch: true });
    const { saveQuery } = useSavedQueries();

    const [selectedDashboardId, setSelectedDashboardId] = useState<string>('');
    const [queryName, setQueryName] = useState('');
    const [type, setType] = useState<VisualizationConfig['type']>(
        (visualizationConfig?.type as any) || 'table'
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePin = async () => {
        if (!selectedDashboardId || !queryName.trim()) {
            toast.error('Please select a dashboard and provide a name');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Save the query first
            const saveResult = await saveQuery({
                name: queryName,
                sql,
                aiPrompt,
                connectionId,
                collectionId: 'default', // Default collection for new items
                userId: 'user_123', // TODO: Get relative to session/auth
                visualizationConfig: {
                    ...visualizationConfig,
                    type,
                    xAxis: visualizationConfig?.xAxis || '',
                    yAxis: visualizationConfig?.yAxis || [],
                },
            });

            if (!saveResult.success || !saveResult.data) {
                throw new Error(saveResult.error || 'Failed to save query');
            }

            const savedQuery = saveResult.data;

            // 2. Add as card to dashboard
            const dashboard = dashboards.find((d) => d.id === selectedDashboardId);
            if (!dashboard) throw new Error('Dashboard not found');

            const updatedCards = [
                ...dashboard.cards,
                {
                    id: `card_${Date.now()}`,
                    dashboardId: dashboard.id,
                    queryId: savedQuery.id,
                    position: { x: 0, y: 0, w: 6, h: 4 }, // Default size
                    visualizationConfig: {
                        ...visualizationConfig,
                        type,
                        xAxis: visualizationConfig?.xAxis || '',
                        yAxis: visualizationConfig?.yAxis || [],
                    },
                },
            ];

            const updateResult = await updateDashboard(dashboard.id, {
                cards: updatedCards,
            });

            if (updateResult.success) {
                toast.success('Successfully pinned to dashboard!');
                onOpenChange(false);
            } else {
                throw new Error(updateResult.error || 'Failed to update dashboard');
            }
        } catch (error) {
            console.error('Pinning error:', error);
            toast.error(error instanceof Error ? error.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-primary" />
                        Pin to Dashboard
                    </DialogTitle>
                    <DialogDescription>
                        Turn this analysis into a permanent dashboard widget.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="query-name">Widget Title</Label>
                        <Input
                            id="query-name"
                            placeholder="e.g., Monthly Sales Growth"
                            value={queryName}
                            onChange={(e) => setQueryName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Select Dashboard</Label>
                        <Select value={selectedDashboardId} onValueChange={setSelectedDashboardId}>
                            <SelectTrigger>
                                <SelectValue placeholder="choose target dashboard..." />
                            </SelectTrigger>
                            <SelectContent>
                                {dashboards.map((dash) => (
                                    <SelectItem key={dash.id} value={dash.id}>
                                        {dash.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Visualization Type</Label>
                        <Select value={type} onValueChange={(val: any) => setType(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="table">Table</SelectItem>
                                <SelectItem value="bar">Bar Chart</SelectItem>
                                <SelectItem value="line">Line Chart</SelectItem>
                                <SelectItem value="pie">Pie Chart</SelectItem>
                                <SelectItem value="area">Area Chart</SelectItem>
                                <SelectItem value="scatter">Scatter Chart</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handlePin} disabled={isSubmitting || !selectedDashboardId || !queryName.trim()}>
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4 mr-2" />
                        )}
                        Add to Dashboard
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
