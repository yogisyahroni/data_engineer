'use client';

import { useMemo } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';

interface ComboChartProps {
    data: Record<string, any>[];
    xAxis: string;
    barDataKey: string;
    lineDataKey: string;
    barLabel?: string;
    lineLabel?: string;
    barColor?: string;
    lineColor?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    title?: string;
}

export function ComboChart({
    data,
    xAxis,
    barDataKey,
    lineDataKey,
    barLabel,
    lineLabel,
    barColor = '#60a5fa',
    lineColor = '#f59e0b',
    showGrid = true,
    showLegend = true,
    title,
}: ComboChartProps) {
    // Format value for tooltip
    const formatValue = (value: any, key: string): string => {
        if (typeof value !== 'number') return String(value);

        const currencyKeys = ['amount', 'total', 'price', 'sales', 'revenue', 'cost', 'value'];
        const isCurrency = currencyKeys.some((c) => key.toLowerCase().includes(c));

        if (isCurrency) {
            return `$${value.toLocaleString()}`;
        }
        return value.toLocaleString();
    };

    const tooltipStyle = {
        contentStyle: {
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px 12px',
        },
        labelStyle: { color: 'var(--foreground)', fontWeight: 600 },
        itemStyle: { color: 'var(--muted-foreground)', fontSize: 12 },
    };

    if (!data || data.length === 0) {
        return (
            <Card className="p-8 bg-card border-border flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No data available</p>
            </Card>
        );
    }

    return (
        <Card className="p-4 bg-card border-border h-full flex flex-col">
            {title && (
                <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
            )}

            <div className="flex-1 min-h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                        <defs>
                            <linearGradient id="barGradientCombo" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={barColor} stopOpacity={1} />
                                <stop offset="100%" stopColor={barColor} stopOpacity={0.7} />
                            </linearGradient>
                        </defs>

                        {showGrid && (
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                        )}

                        <XAxis
                            dataKey={xAxis}
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickLine={{ stroke: 'var(--border)' }}
                            axisLine={{ stroke: 'var(--border)' }}
                        />

                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickLine={{ stroke: 'var(--border)' }}
                            axisLine={{ stroke: 'var(--border)' }}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                            tickLine={{ stroke: 'var(--border)' }}
                            axisLine={{ stroke: 'var(--border)' }}
                        />

                        <Tooltip
                            formatter={(value: any, name: string) => [formatValue(value, name), name]}
                            {...tooltipStyle}
                        />

                        {showLegend && <Legend />}

                        <Bar
                            yAxisId="left"
                            dataKey={barDataKey}
                            name={barLabel || barDataKey}
                            fill="url(#barGradientCombo)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                        />

                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey={lineDataKey}
                            name={lineLabel || lineDataKey}
                            stroke={lineColor}
                            strokeWidth={2}
                            dot={{ fill: lineColor, r: 4, strokeWidth: 2, stroke: 'var(--background)' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
