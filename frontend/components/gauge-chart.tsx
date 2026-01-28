'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';

interface GaugeChartProps {
    value: number;
    min?: number;
    max?: number;
    label?: string;
    unit?: string;
    showValue?: boolean;
    size?: 'sm' | 'md' | 'lg';
    thresholds?: {
        danger?: number;
        warning?: number;
        success?: number;
    };
}

export function GaugeChart({
    value,
    min = 0,
    max = 100,
    label,
    unit = '',
    showValue = true,
    size = 'md',
    thresholds = { danger: 33, warning: 66, success: 100 },
}: GaugeChartProps) {
    const percentage = useMemo(() => {
        return Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
    }, [value, min, max]);

    const sizes = {
        sm: { width: 120, height: 80, strokeWidth: 8, fontSize: 16 },
        md: { width: 180, height: 110, strokeWidth: 12, fontSize: 24 },
        lg: { width: 240, height: 140, strokeWidth: 16, fontSize: 32 },
    };

    const { width, height, strokeWidth, fontSize } = sizes[size];
    const radius = (width - strokeWidth) / 2;
    const circumference = Math.PI * radius;

    // Calculate color based on thresholds
    const getColor = () => {
        const normalizedValue = percentage;
        if (normalizedValue <= (thresholds.danger || 33)) return '#ef4444'; // red
        if (normalizedValue <= (thresholds.warning || 66)) return '#f59e0b'; // amber
        return '#10b981'; // emerald
    };

    const color = getColor();
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <Card className="p-4 bg-card border-border flex flex-col items-center justify-center">
            {label && (
                <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
            )}

            <div className="relative" style={{ width, height }}>
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    className="transform -rotate-180"
                >
                    {/* Background arc */}
                    <path
                        d={`M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-muted"
                        strokeLinecap="round"
                    />

                    {/* Value arc */}
                    <path
                        d={`M ${strokeWidth / 2} ${height} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-500 ease-out"
                    />
                </svg>

                {/* Value display */}
                {showValue && (
                    <div
                        className="absolute inset-0 flex items-end justify-center pb-2"
                    >
                        <span
                            className="font-bold text-foreground"
                            style={{ fontSize }}
                        >
                            {value.toLocaleString()}{unit}
                        </span>
                    </div>
                )}
            </div>

            {/* Min/Max labels */}
            <div className="flex justify-between w-full mt-1">
                <span className="text-xs text-muted-foreground">{min}</span>
                <span className="text-xs text-muted-foreground">{max}</span>
            </div>
        </Card>
    );
}
