
'use client';

import { useMemo } from 'react';
import { EChartsWrapper } from '@/components/echarts-wrapper';
import { ForecastResult } from '@/lib/services/forecasting-service';
import { Card } from '@/components/ui/card';

interface ForecastChartProps {
    data: ForecastResult;
    title?: string;
    metricLabel?: string;
    className?: string;
}

export function ForecastChart({ data, title, metricLabel = 'Value', className }: ForecastChartProps) {

    const options = useMemo(() => {
        // 1. Combine History and Forecast for the X-Axis
        // History ends at Date X, Forecast starts at Date X+1
        const allDates = [
            ...data.history.map(d => new Date(d.date).toLocaleDateString()),
            ...data.forecast.map(d => new Date(d.date).toLocaleDateString())
        ];

        // 2. Prepare Series Data
        // History Series: [Values..., null, null...]
        const historySeries = data.history.map(d => d.value);

        // Forecast Series: [null..., LastHistoryValue, ForecastValues...] 
        // We connect them visually by repeating the last history point or just letting ECharts handle it?
        // Better: Forecast series starts where History ends.
        const lastHistory = data.history[data.history.length - 1];
        const forecastSeries = [
            ...new Array(data.history.length - 1).fill(null), // Pad with nulls
            lastHistory.value, // Connect lines
            ...data.forecast.map(d => d.value)
        ];

        // Confidence Interval (Area Band)
        // Upper: [null..., UpperValues...]
        // Lower: [null..., LowerValues...]
        // In ECharts, area bands are tricky. We use a 'custom' series or just two lines with areaStyle?
        // Simpler: Two stacked lines? No.
        // Solution: A series with stack and areaStyle transparent.
        // OR: Just show upper/lower as thin grey lines.
        // Let's try simple Upper/Lower lines first for MVP.
        const upperSeries = [
            ...new Array(data.history.length - 1).fill(null),
            lastHistory.value,
            ...data.upperBound.map(d => d.value)
        ];
        const lowerSeries = [
            ...new Array(data.history.length - 1).fill(null),
            lastHistory.value,
            ...data.lowerBound.map(d => d.value)
        ];

        return {
            title: {
                text: title || 'Forecast Analysis',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['History', 'Forecast', 'Confidence Upper', 'Confidence Lower'],
                bottom: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: allDates
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    name: 'History',
                    type: 'line',
                    data: historySeries,
                    itemStyle: { color: '#3b82f6' }, // Blue
                    lineStyle: { width: 3 }
                },
                {
                    name: 'Forecast',
                    type: 'line',
                    data: forecastSeries,
                    itemStyle: { color: '#22c55e' }, // Green
                    lineStyle: { type: 'dashed', width: 3 }
                },
                {
                    name: 'Confidence Upper',
                    type: 'line',
                    data: upperSeries,
                    lineStyle: { opacity: 0 }, // Invisible line
                    areaStyle: {
                        color: '#22c55e',
                        opacity: 0.1,
                        origin: 'start' // Tricky part: ECharts area is usually from 0.
                        // For a band, we need 'band' series or 'theme-river'.
                        // Let's stick to simple lines for MVP to match "Iron Hand" speed.
                    },
                    stack: 'confidence', // Attempting stack if we use difference? No.
                    // Fallback: Just display lines.
                    itemStyle: { opacity: 0 },
                },
                {
                    name: 'Confidence Lower',
                    type: 'line',
                    data: lowerSeries,
                    lineStyle: { opacity: 0 },
                    itemStyle: { opacity: 0 }
                }
            ]
        };
    }, [data, title]);

    return (
        <Card className={`p-4 ${className}`}>
            <div className="h-[400px] w-full">
                <EChartsWrapper option={options} />
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
                Model: Linear Regression (OLS) | R²: {data.rSquared.toFixed(3)}
            </div>
        </Card>
    );
}
