'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanvasWidget } from '../canvas-board';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PropertyProps {
    widget: CanvasWidget;
    onUpdate: (updates: Partial<CanvasWidget>) => void;
}

interface SavedQuery {
    id: string;
    name: string;
    visualizationConfig?: any;
}

export function ChartProperty({ widget, onUpdate }: PropertyProps) {
    const chartId = widget.config.chartId || '';
    const [queries, setQueries] = useState<SavedQuery[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQueries();
    }, []);

    const fetchQueries = async () => {
        try {
            const res = await fetch('/api/queries/saved');
            const json = await res.json();

            if (json.success) {
                setQueries(json.data);
            } else {
                console.error('Failed to load queries:', json.error);
                toast.error('Could not load visualizations');
            }
        } catch (error) {
            console.error('Error fetching queries:', error);
            toast.error('Failed to load visualizations');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (val: string) => {
        onUpdate({ config: { ...widget.config, chartId: val } });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Select Visualization</Label>
                <div className="relative">
                    <Select value={chartId} onValueChange={handleChange} disabled={loading}>
                        <SelectTrigger>
                            <SelectValue placeholder={loading ? "Loading..." : "Select chart..."} />
                        </SelectTrigger>
                        <SelectContent>
                            {queries.map(q => (
                                <SelectItem key={q.id} value={q.id}>
                                    {q.name}
                                </SelectItem>
                            ))}
                            {!loading && queries.length === 0 && (
                                <div className="p-2 text-xs text-muted-foreground text-center">
                                    No saved visualizations found.
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                    {loading && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    Link this widget to an existing visualization from your library.
                </p>
            </div>
        </div>
    );
}
