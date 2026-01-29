'use client';

import { CanvasWidget } from '../canvas-board';
import { BarChart3 } from 'lucide-react';

interface WidgetProps {
    widget: CanvasWidget;
    readOnly?: boolean;
}

export function ChartWidget({ widget, readOnly }: WidgetProps) {
    const chartId = widget.config.chartId;

    if (!chartId) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-4 border-2 border-dashed border-muted">
                <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs text-center">Select a chart to display</span>
            </div>
        );
    }

    // In a real implementation, this would fetch the Visualization configuration using the chartId
    // and render the Recharts component. For now, we'll placeholder it.
    return (
        <div className="w-full h-full flex items-center justify-center bg-card">
            <div className="text-center">
                <p className="font-semibold text-sm">Chart Rendering Placeholder</p>
                <p className="text-xs text-muted-foreground">ID: {chartId}</p>
                <div className="mt-4 flex gap-2 items-end justify-center h-24">
                    <div className="w-4 bg-primary/20 h-10 rounded-t"></div>
                    <div className="w-4 bg-primary/40 h-16 rounded-t"></div>
                    <div className="w-4 bg-primary/60 h-20 rounded-t"></div>
                    <div className="w-4 bg-primary/80 h-14 rounded-t"></div>
                </div>
            </div>
        </div>
    );
}
