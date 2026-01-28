'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MetricCardProps {
    title: string;
    value: number | string;
    previousValue?: number;
    format?: 'number' | 'currency' | 'percent';
    prefix?: string;
    suffix?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendLabel?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function MetricCard({
    title,
    value,
    previousValue,
    format = 'number',
    prefix = '',
    suffix = '',
    trend,
    trendLabel,
    description,
    size = 'md',
}: MetricCardProps) {
    // Format value based on type
    const formatValue = (val: number | string): string => {
        if (typeof val === 'string') return val;

        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(val);
            case 'percent':
                return `${val.toFixed(1)}%`;
            case 'number':
            default:
                if (val >= 1000000) {
                    return `${(val / 1000000).toFixed(1)}M`;
                }
                if (val >= 1000) {
                    return `${(val / 1000).toFixed(1)}K`;
                }
                return val.toLocaleString();
        }
    };

    // Calculate trend if previous value provided
    const calculatedTrend = trend || (() => {
        if (previousValue === undefined || typeof value !== 'number') return undefined;
        if (value > previousValue) return 'up';
        if (value < previousValue) return 'down';
        return 'neutral';
    })();

    // Calculate percentage change
    const percentChange = (() => {
        if (previousValue === undefined || typeof value !== 'number' || previousValue === 0) {
            return null;
        }
        return ((value - previousValue) / previousValue) * 100;
    })();

    // Size classes
    const sizeClasses = {
        sm: { container: 'p-4', value: 'text-2xl', title: 'text-xs' },
        md: { container: 'p-6', value: 'text-4xl', title: 'text-sm' },
        lg: { container: 'p-8', value: 'text-5xl', title: 'text-base' },
    };

    const classes = sizeClasses[size];

    // Trend colors
    const trendColors = {
        up: 'text-emerald-500',
        down: 'text-red-500',
        neutral: 'text-muted-foreground',
    };

    const TrendIcon = calculatedTrend === 'up' ? ArrowUp : calculatedTrend === 'down' ? ArrowDown : Minus;

    return (
        <Card className={`${classes.container} bg-card border-border`}>
            <div className="space-y-2">
                <p className={`${classes.title} font-medium text-muted-foreground uppercase tracking-wide`}>
                    {title}
                </p>

                <div className={`${classes.value} font-bold text-foreground tracking-tight`}>
                    {prefix}{formatValue(value)}{suffix}
                </div>

                {(calculatedTrend || trendLabel || description) && (
                    <div className="flex items-center gap-2">
                        {calculatedTrend && (
                            <div className={`flex items-center gap-1 ${trendColors[calculatedTrend]}`}>
                                <TrendIcon className="w-4 h-4" />
                                {percentChange !== null && (
                                    <span className="text-sm font-medium">
                                        {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        )}
                        {(trendLabel || description) && (
                            <span className="text-xs text-muted-foreground">
                                {trendLabel || description}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}
