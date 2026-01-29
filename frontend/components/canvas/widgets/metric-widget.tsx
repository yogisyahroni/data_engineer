'use client';

import { CanvasWidget } from '../canvas-board';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WidgetProps {
    widget: CanvasWidget;
    readOnly?: boolean;
}

export function MetricWidget({ widget, readOnly }: WidgetProps) {
    const { label, value, trend, trendValue } = widget.config;

    if (!label && !value) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-4">
                <span className="font-bold text-lg">123.4k</span>
                <span className="text-xs">Single Metric</span>
            </div>
        );
    }

    const isPositive = trend === 'up';
    const isNegative = trend === 'down';
    const isNeutral = !trend || trend === 'neutral';

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-card text-card-foreground">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">{label || 'Metric Label'}</h4>
            <div className="text-3xl font-bold tracking-tight">{value || '0'}</div>
            {(trendValue) && (
                <div className={`text-xs flex items-center mt-2 font-medium ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                    {isPositive && <TrendingUp className="w-3 h-3 mr-1" />}
                    {isNegative && <TrendingDown className="w-3 h-3 mr-1" />}
                    {isNeutral && <Minus className="w-3 h-3 mr-1" />}
                    {trendValue}
                </div>
            )}
        </div>
    );
}
