'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';

interface FunnelChartProps {
    data: Array<{
        name: string;
        value: number;
        color?: string;
    }>;
    showValues?: boolean;
    showPercentages?: boolean;
    title?: string;
}

const DEFAULT_COLORS = [
    '#60a5fa', // Blue
    '#34d399', // Emerald
    '#fbbf24', // Amber
    '#f87171', // Red
    '#c084fc', // Purple
];

export function FunnelChart({
    data,
    showValues = true,
    showPercentages = true,
    title,
}: FunnelChartProps) {
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const maxValue = Math.max(...data.map((d) => d.value));

        return data.map((item, index) => ({
            ...item,
            width: (item.value / maxValue) * 100,
            color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
            percentage: index === 0 ? 100 : (item.value / data[0].value) * 100,
            conversionRate: index === 0 ? null : (item.value / data[index - 1].value) * 100,
        }));
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <Card className="p-8 bg-card border-border flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No data available</p>
            </Card>
        );
    }

    return (
        <Card className="p-6 bg-card border-border">
            {title && (
                <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
            )}

            <div className="space-y-2">
                {processedData.map((item, index) => (
                    <div key={index} className="relative">
                        {/* Funnel bar */}
                        <div
                            className="flex items-center justify-center py-3 px-4 rounded transition-all duration-300 hover:opacity-90"
                            style={{
                                width: `${item.width}%`,
                                backgroundColor: item.color,
                                marginLeft: `${(100 - item.width) / 2}%`,
                            }}
                        >
                            <span className="text-sm font-medium text-white truncate">
                                {item.name}
                            </span>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center justify-between mt-1 px-2">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {showValues && (
                                    <span className="font-medium text-foreground">
                                        {item.value.toLocaleString()}
                                    </span>
                                )}
                                {showPercentages && (
                                    <span>
                                        {item.percentage.toFixed(1)}% of total
                                    </span>
                                )}
                            </div>

                            {item.conversionRate !== null && (
                                <span className="text-xs text-muted-foreground">
                                    ↓ {item.conversionRate.toFixed(1)}% conversion
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Conversion</span>
                    <span className="font-semibold text-foreground">
                        {((data[data.length - 1].value / data[0].value) * 100).toFixed(1)}%
                    </span>
                </div>
            </div>
        </Card>
    );
}
