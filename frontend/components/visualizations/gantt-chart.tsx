'use client'

// Gantt Chart Component - TASK-041
// Timeline visualization untuk project management

import React, { useMemo } from 'react'
import { EChartsWrapper } from './echarts-wrapper'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EChartsOption } from 'echarts'
import type { GanttChartProps } from './advanced-chart-types'
import { validateGanttData, calculateGanttTimeRange, formatGanttDate } from './advanced-chart-utils'

/**
 * Gantt Chart Component
 * 
 * Features:
 * - Timeline bars for tasks
 * - Task dependencies
 * - Progress tracking
 * - Milestones
 * - Category grouping
 * - Interactive tooltips
 * 
 * Use cases:
 * - Project management
 * - Resource scheduling
 * - Timeline planning
 * - Sprint tracking
 */
export function GanttChart({
    data,
    title,
    height = 600,
    width = '100%',
    className = '',
    showProgress = true,
    showDependencies = false,
    showMilestones = true,
    dateFormat = 'yyyy-MM-dd',
    onTaskClick
}: GanttChartProps) {
    // Validate data
    const validation = useMemo(() => validateGanttData(data), [data])

    // Calculate time range
    const timeRange = useMemo(() => {
        if (!validation.isValid || data.length === 0) {
            return { min: new Date(), max: new Date() }
        }
        return calculateGanttTimeRange(data)
    }, [data, validation.isValid])

    // Prepare chart data
    const chartData = useMemo(() => {
        if (!validation.isValid) return { categories: [], series: [] }

        const categories = data.map(task => task.name)

        // Main task bars
        const taskSeries = data.map((task, index) => {
            const start = new Date(task.start).getTime()
            const end = new Date(task.end).getTime()
            const duration = end - start

            return {
                name: task.name,
                value: [
                    index,
                    start,
                    end,
                    duration
                ],
                itemStyle: {
                    color: task.color || (task.milestone ? '#fbbf24' : '#3b82f6'),
                    borderRadius: task.milestone ? 0 : 4
                }
            }
        })

        // Progress overlay bars
        const progressSeries = showProgress ? data.map((task, index) => {
            const start = new Date(task.start).getTime()
            const end = new Date(task.end).getTime()
            const duration = end - start
            const progress = (task.progress || 0) / 100
            const progressEnd = start + (duration * progress)

            return {
                name: `${task.name} Progress`,
                value: [
                    index,
                    start,
                    progressEnd,
                    progressEnd - start
                ],
                itemStyle: {
                    color: '#10b981',
                    opacity: 0.7,
                    borderRadius: 4
                }
            }
        }).filter(item => item.value[3] > 0) : []

        return { categories, taskSeries, progressSeries }
    }, [data, validation.isValid, showProgress])

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
                trigger: 'item',
                formatter: function (params: any) {
                    const taskIndex = params.value[0]
                    const task = data[taskIndex]
                    if (!task) return ''

                    const start = formatGanttDate(new Date(params.value[1]), dateFormat)
                    const end = formatGanttDate(new Date(params.value[2]), dateFormat)
                    const days = Math.ceil(params.value[3] / (1000 * 60 * 60 * 24))

                    let tooltip = `<strong>${task.name}</strong><br/>`
                    tooltip += `Start: ${start}<br/>`
                    tooltip += `End: ${end}<br/>`
                    tooltip += `Duration: ${days} day${days !== 1 ? 's' : ''}<br/>`

                    if (task.progress !== undefined) {
                        tooltip += `Progress: ${task.progress}%<br/>`
                    }

                    if (task.category) {
                        tooltip += `Category: ${task.category}<br/>`
                    }

                    if (task.description) {
                        tooltip += `<br/>${task.description}`
                    }

                    return tooltip
                }
            },
            grid: {
                top: title ? 80 : 40,
                bottom: 60,
                left: 150,
                right: 40
            },
            xAxis: {
                type: 'time',
                min: timeRange.min.getTime(),
                max: timeRange.max.getTime(),
                axisLabel: {
                    formatter: (value: number) => {
                        return formatGanttDate(new Date(value), 'MM/dd')
                    }
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        type: 'dashed',
                        opacity: 0.3
                    }
                }
            },
            yAxis: {
                type: 'category',
                data: chartData.categories,
                inverse: true,
                axisLabel: {
                    fontSize: 12
                },
                splitLine: {
                    show: false
                }
            },
            series: [
                {
                    name: 'Tasks',
                    type: 'custom' as const,
                    renderItem: (params: any, api: any) => {
                        const categoryIndex = api.value(0)
                        const start = api.coord([api.value(1), categoryIndex])
                        const end = api.coord([api.value(2), categoryIndex])
                        const height = api.size([0, 1])[1] * 0.6

                        const rectShape = {
                            x: start[0],
                            y: start[1] - height / 2,
                            width: end[0] - start[0],
                            height: height
                        }

                        return {
                            type: 'rect',
                            shape: rectShape,
                            style: api.style()
                        }
                    },
                    encode: {
                        x: [1, 2],
                        y: 0
                    },
                    data: chartData.taskSeries
                } as any, // Type assertion untuk custom series
                ...(showProgress ? [{
                    name: 'Progress',
                    type: 'custom' as const,
                    renderItem: (params: any, api: any) => {
                        const categoryIndex = api.value(0)
                        const start = api.coord([api.value(1), categoryIndex])
                        const end = api.coord([api.value(2), categoryIndex])
                        const height = api.size([0, 1])[1] * 0.4

                        const rectShape = {
                            x: start[0],
                            y: start[1] - height / 2,
                            width: end[0] - start[0],
                            height: height
                        }

                        return {
                            type: 'rect',
                            shape: rectShape,
                            style: api.style()
                        }
                    },
                    encode: {
                        x: [1, 2],
                        y: 0
                    },
                    data: chartData.progressSeries
                } as any] : []) // Type assertion untuk custom series
            ],
            animation: true,
            animationDuration: 800
        }
    }, [data, title, dateFormat, timeRange, chartData, validation.isValid, showProgress])

    // Event handlers
    const handleEvents = useMemo(() => ({
        click: (params: any) => {
            if (onTaskClick && params.value) {
                const taskIndex = params.value[0]
                const task = data[taskIndex]
                if (task) onTaskClick(task)
            }
        }
    }), [data, onTaskClick])

    // Error state
    if (!validation.isValid) {
        return (
            <div className={className} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        <div className="font-semibold mb-2">Invalid Gantt Data:</div>
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
                    <p className="text-muted-foreground">No tasks to display</p>
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

export default GanttChart
