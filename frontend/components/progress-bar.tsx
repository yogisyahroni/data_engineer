'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    max?: number;
    label?: string;
    showValue?: boolean;
    showPercentage?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'danger';
    animated?: boolean;
}

export function ProgressBar({
    value,
    max = 100,
    label,
    showValue = true,
    showPercentage = true,
    size = 'md',
    variant = 'default',
    animated = false,
}: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
        sm: 'h-2',
        md: 'h-4',
        lg: 'h-6',
    };

    const variantClasses = {
        default: 'bg-primary',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
    };

    // Auto-select variant based on percentage if using default
    const autoVariant = variant === 'default'
        ? percentage >= 80
            ? 'success'
            : percentage >= 50
                ? 'warning'
                : 'danger'
        : variant;

    return (
        <Card className="p-4 bg-card border-border">
            {label && (
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {showPercentage && (
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(0)}%</span>
                    )}
                </div>
            )}

            <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-500 ease-out',
                        variantClasses[variant === 'default' ? autoVariant : variant],
                        animated && 'animate-pulse'
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {showValue && !label && (
                <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">
                        {value.toLocaleString()} / {max.toLocaleString()}
                    </span>
                </div>
            )}
        </Card>
    );
}

// Multi-segment progress bar for displaying multiple values
interface MultiProgressBarProps {
    segments: Array<{
        value: number;
        label: string;
        color: string;
    }>;
    max?: number;
    showLegend?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function MultiProgressBar({
    segments,
    max,
    showLegend = true,
    size = 'md',
}: MultiProgressBarProps) {
    const total = max || segments.reduce((sum, s) => sum + s.value, 0);

    const sizeClasses = {
        sm: 'h-2',
        md: 'h-4',
        lg: 'h-6',
    };

    return (
        <Card className="p-4 bg-card border-border">
            <div className={cn('w-full bg-muted rounded-full overflow-hidden flex', sizeClasses[size])}>
                {segments.map((segment, index) => {
                    const percentage = (segment.value / total) * 100;
                    return (
                        <div
                            key={index}
                            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: segment.color,
                            }}
                            title={`${segment.label}: ${segment.value.toLocaleString()}`}
                        />
                    );
                })}
            </div>

            {showLegend && (
                <div className="flex flex-wrap gap-4 mt-3">
                    {segments.map((segment, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: segment.color }}
                            />
                            <span className="text-xs text-muted-foreground">
                                {segment.label}: <span className="font-medium text-foreground">{segment.value.toLocaleString()}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
