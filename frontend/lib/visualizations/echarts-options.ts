
import type { EChartsOption } from 'echarts';
import { VisualizationConfig } from '@/lib/types';

// Default semantic colors (Insight Engine Palette)
const DEFAULT_COLORS = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
];

export function buildEChartsOptions(
    data: Record<string, any>[],
    config: VisualizationConfig,
    theme: string = 'light'
): EChartsOption {
    const { type, xAxis, yAxis, title } = config;

    if (type === 'table') return {};

    // Base configuration
    const options: EChartsOption = {
        title: {
            text: title,
            left: 'center',
            textStyle: {
                color: theme === 'dark' ? '#fff' : '#333'
            }
        },
        tooltip: {
            trigger: (type === 'pie' || type === 'funnel') ? 'item' : 'axis',
            axisPointer: {
                type: 'cross'
            },
            valueFormatter: (value: any) => {
                const numVal = Number(value);
                if (isNaN(numVal)) return value as string;
                if (config.yAxisFormat === 'currency') {
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numVal);
                }
                if (config.yAxisFormat === 'percent') {
                    return `${numVal}%`;
                }
                return new Intl.NumberFormat('en-US').format(numVal);
            }
        },
        toolbox: {
            feature: {
                dataZoom: {
                    yAxisIndex: 'none'
                },
                restore: {},
                saveAsImage: {}
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        color: config.colors || DEFAULT_COLORS,
    };

    // 1. Pie & Funnel Charts (Single Series, Non-Cartesian)
    if (type === 'pie' || type === 'funnel') {
        const seriesData = data.map(item => ({
            name: item[xAxis],
            value: item[yAxis[0]]
        }));

        options.series = [{
            name: title || 'Data',
            type: type as 'pie' | 'funnel',
            radius: type === 'pie' ? '50%' : undefined,
            width: type === 'funnel' ? '60%' : undefined,
            left: type === 'funnel' ? 'center' : undefined,
            data: seriesData,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }];

        // For funnel, we might want to sort
        if (type === 'funnel') {
            (options.series[0] as any).sort = 'descending';
        }

        return options;
    }

    // 2. Cartesian Charts (Bar, Line, Scatter, Area, Combo)

    let echartsType: 'bar' | 'line' | 'scatter' = 'bar';
    let areaStyle: any = undefined;

    if (type === 'line' || type === 'area') {
        echartsType = 'line';
        if (type === 'area') {
            areaStyle = { opacity: 0.5 };
        }
    } else if (type === 'scatter') {
        echartsType = 'scatter';
    } else if (type === 'bar') {
        echartsType = 'bar';
    }

    // X-Axis Config
    options.xAxis = {
        type: 'category',
        boundaryGap: type === 'bar' || type === 'combo',
        data: data.map(item => item[xAxis]),
        axisLabel: {
            color: theme === 'dark' ? '#ccc' : '#666',
            rotate: data.length > 20 ? 45 : 0
        }
    };

    // Y-Axis Config
    if (type === 'combo') {
        // Dual Axis for Combo
        options.yAxis = [
            {
                type: 'value',
                name: yAxis[0],
                position: 'left',
                axisLabel: { color: theme === 'dark' ? '#ccc' : '#666' }
            },
            {
                type: 'value',
                name: yAxis[1] || '',
                position: 'right',
                axisLabel: { color: theme === 'dark' ? '#ccc' : '#666' }
            }
        ];
    } else {
        // Single Y-Axis (can be multiple series on same axis)
        options.yAxis = yAxis.map(axisKey => ({
            type: 'value',
            name: config.yAxisLabel || axisKey,
            axisLabel: {
                color: theme === 'dark' ? '#ccc' : '#666',
                formatter: (value: number) => {
                    if (config.yAxisFormat === 'currency') {
                        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);
                    }
                    if (config.yAxisFormat === 'percent') {
                        return `${value}%`;
                    }
                    return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(value);
                }
            }
        }));
    }

    // Series Config
    if (type === 'combo' && yAxis.length >= 2) {
        options.series = [
            {
                name: yAxis[0],
                type: 'bar',
                yAxisIndex: 0,
                data: data.map(item => item[yAxis[0]])
            },
            {
                name: yAxis[1],
                type: 'line',
                yAxisIndex: 1,
                data: data.map(item => item[yAxis[1]]),
                smooth: true
            }
        ];
    } else {
        // Split data into Historical and Forecast
        const historicalData = data.filter(d => !d._isForecast);
        const forecastData = data.filter(d => d._isForecast);

        options.series = yAxis.map((axisKey, index) => {
            const series: any[] = [];

            // 1. Historical Data Series
            series.push({
                name: axisKey,
                type: echartsType,
                // For historical, map actual value or null if it's a forecast point (to break line if mixed? No, we filter)
                // Actually, if we use the full 'data' for X-axis, we need to align data points.
                // Best approach: Use full 'data' array, but set value to null for non-matching types if we want separate series.
                data: data.map(item => !item._isForecast ? item[axisKey] : null),
                smooth: true,
                symbolSize: echartsType === 'scatter' ? 10 : 4,
                areaStyle: areaStyle,
                // Ensure connections works if needed, usually null breaks line which is what we want if treating as separate
            });

            // 2. Forecast Data Series (Only for Line/Area/Bar, usually Line)
            if (forecastData.length > 0) {
                // To connect the lines, the forecast series should ideally start with the last historical point.
                // Or we rely on visual proximity. ECharts handles 'null' by breaking line.
                // We want the lines to connect.
                // Strategy: Forecast Series includes the LAST historical point.

                const lastHistorical = historicalData[historicalData.length - 1];
                const forecastCombined = lastHistorical ? [lastHistorical, ...forecastData] : forecastData;

                // We need to map this to the full dataset index to align with X-axis
                // Only if X-axis uses 'category'.
                // If we simply map data.map(...), we can check item._isForecast OR item === lastHistorical

                const forecastSeriesData = data.map(item => {
                    if (item._isForecast) return item[axisKey];
                    // Include the connection point
                    if (item === lastHistorical) return item[axisKey];
                    return null;
                });

                series.push({
                    name: `${axisKey} (Forecast)`,
                    type: 'line', // Forecast is always line usually
                    data: forecastSeriesData,
                    smooth: true,
                    lineStyle: { type: 'dashed' },
                    itemStyle: { opacity: 0.7 },
                    symbol: 'emptyCircle'
                });
            }

            return series;
        }).flat();
    }

    // DataZoom
    if (data.length > 50) {
        options.dataZoom = [
            {
                type: 'slider',
                show: true,
                xAxisIndex: [0],
                start: 0,
                end: Math.min(100, (50 / data.length) * 100)
            },
            {
                type: 'inside',
                xAxisIndex: [0],
                start: 0,
                end: 100
            }
        ];
    }

    return options;
}
