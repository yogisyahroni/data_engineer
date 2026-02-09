'use client'

// Treemap Chart Component - TASK-043
// Hierarchical visualization dengan nested rectangles

import React, { useMemo } from 'react'
import { EChartsWrapper } from './echarts-wrapper'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EChartsOption } from 'echarts'
import type { TreemapChartProps } from './advanced-chart-types'
import { validateTreemapData, calculateTreeTotal, formatLargeNumber } from './advanced-chart-utils'

/**
 * Treemap Chart Component
 * 
 * Features:
 * - Hierarchical rectangles
 * - Size encoding by value
 * - Color encoding
 * - Drill-down navigation
 * - Breadcrumb trail
 * - Interactive zooming
 * 
 * Use cases:
 * - Portfolio composition
 * - Disk space usage
 * - Market share
 * - Category hierarchy
 */
export function TreemapChart({
    data,
    title,
    height = 600,
    width = '100%',
    className = '',
    colorSaturation = [0.3, 0.7],
    levels = 3,
    breadcrumb = true,
    onNodeClick
}: TreemapChartProps) {
    // Validate data
    const validation = useMemo(() => validateTreemapData(data), [data])

    // Calculate total for percentage display
    const total = useMemo(() => {
        if (!validation.isValid) return 0
        return calculateTreeTotal(data)
    }, [data, validation.isValid])

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
                formatter: function (params: any) {
                    const value = params.value || 0
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : '0.00'

                    let tooltip = `<strong>${params.name}</strong><br/>`
                    tooltip += `Value: ${formatLargeNumber(value)}<br/>`
                    tooltip += `Percentage: ${percentage}%`

                    // Show path for nested items
                    if (params.treePathInfo && params.treePathInfo.length > 1) {
                        const path = params.treePathInfo
                            .slice(1) // Skip root
                            .map((item: any) => item.name)
                            .join(' › ')
                        tooltip += `<br/>Path: ${path}`
                    }

                    return tooltip
                }
            },
            series: [
                {
                    type: 'treemap',
                    data: data,
                    roam: false,
                    nodeClick: 'zoomToNode',
                    breadcrumb: breadcrumb ? {
                        show: true,
                        height: 30,
                        bottom: 0,
                        itemStyle: {
                            color: 'rgba(0,0,0,0.7)',
                            borderColor: 'rgba(255,255,255,0.4)',
                            borderWidth: 1,
                            shadowColor: 'rgba(150,150,150,0.3)',
                            shadowBlur: 3,
                            shadowOffsetX: 0,
                            shadowOffsetY: 0,
                            textStyle: {
                                color: '#fff'
                            }
                        },
                        emphasis: {
                            itemStyle: {
                                color: 'rgba(0,0,0,0.9)'
                            }
                        }
                    } : {
                        show: false
                    },
                    label: {
                        show: true,
                        formatter: function (params: any) {
                            const value = params.value || 0
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'

                            // Show name and percentage for larger blocks
                            if (params.data.itemStyle?.fontSize && params.data.itemStyle.fontSize < 12) {
                                return params.name
                            }

                            return `${params.name}\n${percentage}%`
                        },
                        fontSize: 12,
                        fontWeight: 'normal'
                    },
                    upperLabel: {
                        show: true,
                        height: 30,
                        textBorderColor: 'transparent',
                        fontSize: 14,
                        fontWeight: 'bold'
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 2,
                        gapWidth: 2
                    },
                    levels: [
                        {
                            itemStyle: {
                                borderWidth: 0,
                                gapWidth: 5
                            }
                        },
                        {
                            itemStyle: {
                                gapWidth: 3
                            },
                            colorSaturation: colorSaturation
                        },
                        {
                            itemStyle: {
                                gapWidth: 2
                            },
                            colorSaturation: colorSaturation
                        },
                        {
                            itemStyle: {
                                gapWidth: 1
                            },
                            colorSaturation: colorSaturation
                        }
                    ].slice(0, levels + 1)
                }
            ],
            animation: true,
            animationDuration: 1000,
            animationEasing: 'cubicOut'
        }
    }, [data, title, total, breadcrumb, colorSaturation, levels, validation.isValid])

    // Event handlers
    const handleEvents = useMemo(() => ({
        click: (params: any) => {
            if (onNodeClick && params.data) {
                onNodeClick(params.data)
            }
        }
    }), [onNodeClick])

    // Error state
    if (!validation.isValid) {
        return (
            <div className={className} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        <div className="font-semibold mb-2">Invalid Treemap Data:</div>
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

export default TreemapChart
