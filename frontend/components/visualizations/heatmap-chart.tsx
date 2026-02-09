'use client'

// Heatmap Chart Component - TASK-042
// Matrix visualization dengan color-encoded values

import React, { useMemo } from 'react'
import { EChartsWrapper } from './echarts-wrapper'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EChartsOption } from 'echarts'
import type { HeatmapChartProps } from './advanced-chart-types'
import {
    validateHeatmapData,
    extractHeatmapAxes,
    calculateHeatmapRange,
    formatLargeNumber
} from './advanced-chart-utils'

/**
 * Heatmap Chart Component
 * 
 * Features:
 * - Matrix visualization
 * - Color scale by value
 * - X/Y category mapping
 * - Value display in cells
 * - Interactive tooltips
 * - Customizable color range
 * 
 * Use cases:
 * - Correlation matrices
 * - Time-based patterns
 * - Geographic data
 * - Performance metrics
 */
export function HeatmapChart({
    data,
    title,
    height = 500,
    width = '100%',
    className = '',
    xAxisLabel,
    yAxisLabel,
    colorRange = ['#f0f9ff', '#0369a1'],
    showValues = true,
    onCellClick
}: HeatmapChartProps) {
    // Validate data
    const validation = useMemo(() => validateHeatmapData(data), [data])

    // Extract axes and value range
    const { xAxis, yAxis } = useMemo(() => {
        if (!validation.isValid) return { xAxis: [], yAxis: [] }
        return extractHeatmapAxes(data)
    }, [data, validation.isValid])

    const valueRange = useMemo(() => {
        if (!validation.isValid || data.length === 0) {
            return { min: 0, max: 100 }
        }
        return calculateHeatmapRange(data)
    }, [data, validation.isValid])

    // Transform data to ECharts format
    const heatmapData = useMemo(() => {
        if (!validation.isValid) return []

        return data.map(point => {
            const xIndex = xAxis.indexOf(String(point.x))
            const yIndex = yAxis.indexOf(String(point.y))
            return [xIndex, yIndex, point.value]
        })
    }, [data, xAxis, yAxis, validation.isValid])

    // Build ECharts options
    const chartOptions = useMemo((): EChartsOption => {
        if (!validation.isValid) return {}

        return {
            title: title ? {
                text: title,
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 600
                }
            } : undefined,
            tooltip: {
                position: 'top',
                formatter: function (params: any) {
                    const [xIndex, yIndex, value] = params.value
                    const point = data.find(d =>
                        xAxis.indexOf(String(d.x)) === xIndex &&
                        yAxis.indexOf(String(d.y)) === yIndex
                    )

                    return `${xAxis[xIndex]} × ${yAxis[yIndex]}<br/>Value: ${formatLargeNumber(value)}${point?.label ? `<br/>${point.label}` : ''}`
                }
            },
            grid: {
                top: title ? 100 : 60,
                bottom: 80,
                left: 100,
                right: 40
            },
            xAxis: {
                type: 'category',
                data: xAxis,
                name: xAxisLabel,
                nameLocation: 'middle',
                nameGap: 50,
                splitArea: {
                    show: true
                },
                axisLabel: {
                    interval: 0,
                    rotate: xAxis.length > 12 ? 45 : 0,
                    fontSize: 11
                }
            },
            yAxis: {
                type: 'category',
                data: yAxis,
                name: yAxisLabel,
                nameLocation: 'middle',
                nameGap: 70,
                splitArea: {
                    show: true
                },
                axisLabel: {
                    fontSize: 11
                }
            },
            visualMap: {
                min: valueRange.min,
                max: valueRange.max,
                calculable: true,
                orient: 'vertical',
                right: 20,
                top: 'center',
                inRange: {
                    color: colorRange
                },
                text: ['High', 'Low'],
                textStyle: {
                    fontSize: 12
                }
            },
            series: [
                {
                    name: 'Heatmap',
                    type: 'heatmap',
                    data: heatmapData,
                    label: {
                        show: showValues,
                        fontSize: 10,
                        formatter: function (params: any) {
                            return formatLargeNumber(params.value[2])
                        }
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ],
            animation: true,
            animationDuration: 800
        }
    }, [data, title, xAxis, yAxis, xAxisLabel, yAxisLabel, colorRange, valueRange, heatmapData, showValues, validation.isValid])

    // Event handlers
    const handleEvents = useMemo(() => ({
        click: (params: any) => {
            if (onCellClick && params.value) {
                const [xIndex, yIndex] = params.value
                const point = data.find(d =>
                    xAxis.indexOf(String(d.x)) === xIndex &&
                    yAxis.indexOf(String(d.y)) === yIndex
                )
                if (point) onCellClick(point)
            }
        }
    }), [data, xAxis, yAxis, onCellClick])

    // Error state
    if (!validation.isValid) {
        return (
            <div className={className} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        <div className="font-semibold mb-2">Invalid Heatmap Data:</div>
                        <ul className="list-disc list-inside space-y-1">
                            {validation.errors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // Empty state
    if (data.length === 0) {
        return (
            <div className={className} style={{ height, width }}>
                <div className="flex items-center justify-center h-full border border-dashed rounded-lg">
                    <p className="text-muted-foreground">No data to display</p>
                </div>
            </div>
        )
    }

    return (
        <div className={className} style={{ height, width }}>
            <EChartsWrapper
                options={chartOptions}
                onEvents={handleEvents}
                className="h-full w-full"
            />
        </div>
    )
}

export default HeatmapChart
