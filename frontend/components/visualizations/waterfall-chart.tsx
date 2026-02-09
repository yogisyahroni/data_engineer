'use client'

// Waterfall Chart Component - TASK-044
// Step visualization untuk cumulative changes

import React, { useMemo } from 'react'
import { EChartsWrapper } from './echarts-wrapper'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EChartsOption } from 'echarts'
import type { WaterfallChartProps } from './advanced-chart-types'
import { validateWaterfallData, calculateWaterfallCumulative, formatLargeNumber } from './advanced-chart-utils'

/**
 * Waterfall Chart Component
 * 
 * Features:
 * - Step-by-step visualization
 * - Positive/negative changes
 * - Cumulative totals
 * - Connecting lines
 * - Color-coded bars
 * - Subtotal support
 * 
 * Use cases:
 * - Financial analysis
 * - Profit/loss breakdown
 * - Inventory changes
 * - Budget variance
 */
export function WaterfallChart({
    data,
    title,
    height = 500,
    width = '100%',
    className = '',
    showConnectors = true,
    positiveColor = '#10b981',
    negativeColor = '#ef4444',
    totalColor = '#3b82f6',
    onBarClick
}: WaterfallChartProps) {
    // Validate data
    const validation = useMemo(() => validateWaterfallData(data), [data])

    // Calculate cumulative values
    const cumulativeData = useMemo(() => {
        if (!validation.isValid) return []
        return calculateWaterfallCumulative(data)
    }, [data, validation.isValid])

    // Prepare chart series data
    const chartData = useMemo(() => {
        if (!validation.isValid) return { assistData: [], positiveData: [], negativeData: [], totalData: [] }

        const assistData: any[] = []
        const positiveData: any[] = []
        const negativeData: any[] = []
        const totalData: any[] = []

        data.forEach((point, index) => {
            const cumulative = cumulativeData[index]

            if (point.isTotal || point.isSubtotal) {
                // Total/subtotal bars
                assistData.push('-')
                positiveData.push('-')
                negativeData.push('-')
                totalData.push(cumulative.end)
            } else if (point.value >= 0) {
                // Positive change
                assistData.push(cumulative.start)
                positiveData.push(point.value)
                negativeData.push('-')
                totalData.push('-')
            } else {
                // Negative change
                assistData.push(cumulative.end)
                positiveData.push('-')
                negativeData.push(Math.abs(point.value))
                totalData.push('-')
            }
        })

        return { assistData, positiveData, negativeData, totalData }
    }, [data, cumulativeData, validation.isValid])

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
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: function (params: any) {
                    const dataIndex = params[0].dataIndex
                    const point = data[dataIndex]
                    const cumulative = cumulativeData[dataIndex]

                    let tooltip = `<strong>${point.name}</strong><br/>`

                    if (point.isTotal || point.isSubtotal) {
                        tooltip += `Total: ${formatLargeNumber(cumulative.end)}`
                    } else {
                        const sign = point.value >= 0 ? '+' : ''
                        tooltip += `Change: ${sign}${formatLargeNumber(point.value)}<br/>`
                        tooltip += `Cumulative: ${formatLargeNumber(cumulative.end)}`
                    }

                    return tooltip
                }
            },
            legend: {
                top: title ? 40 : 20,
                data: ['Increase', 'Decrease', 'Total']
            },
            grid: {
                top: title ? 100 : 80,
                bottom: 80,
                left: 80,
                right: 40
            },
            xAxis: {
                type: 'category',
                data: data.map(d => d.name),
                axisLabel: {
                    interval: 0,
                    rotate: data.length > 8 ? 45 : 0,
                    fontSize: 11
                }
            },
            yAxis: {
                type: 'value',
                name: 'Value',
                axisLabel: {
                    formatter: (value: number) => formatLargeNumber(value)
                }
            },
            series: [
                {
                    name: 'Assist',
                    type: 'bar',
                    stack: 'Total',
                    itemStyle: {
                        borderColor: 'transparent',
                        color: 'transparent'
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: 'transparent',
                            color: 'transparent'
                        }
                    },
                    data: chartData.assistData
                },
                {
                    name: 'Increase',
                    type: 'bar',
                    stack: 'Total',
                    label: {
                        show: true,
                        position: 'top',
                        formatter: (params: any) => {
                            const value = params.value
                            if (value === '-') return ''
                            return `+${formatLargeNumber(value)}`
                        },
                        fontSize: 11
                    },
                    itemStyle: {
                        color: positiveColor
                    },
                    data: chartData.positiveData
                },
                {
                    name: 'Decrease',
                    type: 'bar',
                    stack: 'Total',
                    label: {
                        show: true,
                        position: 'bottom',
                        formatter: (params: any) => {
                            const value = params.value
                            if (value === '-') return ''
                            return `-${formatLargeNumber(value)}`
                        },
                        fontSize: 11
                    },
                    itemStyle: {
                        color: negativeColor
                    },
                    data: chartData.negativeData
                },
                {
                    name: 'Total',
                    type: 'bar',
                    stack: 'Total',
                    label: {
                        show: true,
                        position: 'top',
                        formatter: (params: any) => {
                            const value = params.value
                            if (value === '-') return ''
                            return formatLargeNumber(value)
                        },
                        fontSize: 11,
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        color: totalColor
                    },
                    data: chartData.totalData
                }
            ],
            animation: true,
            animationDuration: 800
        }
    }, [data, title, cumulativeData, chartData, positiveColor, negativeColor, totalColor, validation.isValid])

    // Event handlers
    const handleEvents = useMemo(() => ({
        click: (params: any) => {
            if (onBarClick && params.dataIndex !== undefined) {
                const point = data[params.dataIndex]
                if (point) onBarClick(point)
            }
        }
    }), [data, onBarClick])

    // Error state
    if (!validation.isValid) {
        return (
            <div className={className} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        <div className="font-semibold mb-2">Invalid Waterfall Data:</div>
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

export default WaterfallChart
