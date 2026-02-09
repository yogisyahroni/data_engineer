'use client'

// Funnel Chart Component - TASK-045
// Conversion funnel visualization

import React, { useMemo } from 'react'
import { EChartsWrapper } from './echarts-wrapper'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EChartsOption } from 'echarts'
import type { FunnelChartProps } from './advanced-chart-types'
import {
    validateFunnelData,
    calculateFunnelConversion,
    calculateFunnelDropoff,
    formatPercentage,
    formatLargeNumber
} from './advanced-chart-utils'

/**
 * Funnel Chart Component
 * 
 * Features:
 * - Stage-by-stage visualization
 * - Conversion rate calculation
 * - Drop-off analysis
 * - Sort options
 * - Alignment options
 * - Interactive tooltips
 * 
 * Use cases:
 * - Sales funnels
 * - User onboarding
 * - Checkout process
 * - Marketing campaigns
 */
export function FunnelChart({
    data,
    title,
    height = 500,
    width = '100%',
    className = '',
    sort = 'descending',
    gap = 0,
    funnelAlign = 'center',
    showConversionRate = true,
    onStageClick
}: FunnelChartProps) {
    // Validate data
    const validation = useMemo(() => validateFunnelData(data), [data])

    // Calculate conversion rates
    const conversionRates = useMemo(() => {
        if (!validation.isValid) return []
        return calculateFunnelConversion(data)
    }, [data, validation.isValid])

    // Calculate drop-off rates
    const dropoffRates = useMemo(() => {
        if (!validation.isValid) return []
        return calculateFunnelDropoff(data)
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
                trigger: 'item',
                formatter: function (params: any) {
                    const index = params.dataIndex
                    const stage = data[index]
                    const conversion = conversionRates[index]

                    let tooltip = `<strong>${stage.name}</strong><br/>`
                    tooltip += `Count: ${formatLargeNumber(stage.value)}<br/>`

                    if (showConversionRate && conversion) {
                        tooltip += `Conversion: ${formatPercentage(conversion.rate)}<br/>`
                    }

                    // Show drop-off to next stage
                    if (index < dropoffRates.length) {
                        const dropoff = dropoffRates[index]
                        tooltip += `Drop-off to ${dropoff.to}: ${formatPercentage(dropoff.rate)}`
                    }

                    if (stage.label) {
                        tooltip += `<br/><br/>${stage.label}`
                    }

                    return tooltip
                }
            },
            legend: {
                show: false
            },
            series: [
                {
                    name: 'Funnel',
                    type: 'funnel',
                    left: '10%',
                    right: '10%',
                    top: title ? 80 : 60,
                    bottom: 60,
                    gap: gap,
                    funnelAlign: funnelAlign,
                    sort: sort,
                    label: {
                        show: true,
                        position: 'inside',
                        formatter: function (params: any) {
                            const stage = data[params.dataIndex]
                            const conversion = conversionRates[params.dataIndex]

                            let label = `${stage.name}\n${formatLargeNumber(stage.value)}`

                            if (showConversionRate && conversion) {
                                label += `\n${formatPercentage(conversion.rate)}`
                            }

                            return label
                        },
                        fontSize: 13,
                        fontWeight: 'normal',
                        color: '#fff',
                        overflow: 'truncate'
                    },
                    labelLine: {
                        show: false
                    },
                    itemStyle: {
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    emphasis: {
                        label: {
                            fontSize: 15,
                            fontWeight: 'bold'
                        }
                    },
                    data: data.map((point, index) => ({
                        name: point.name,
                        value: point.value,
                        itemStyle: point.color ? {
                            color: point.color
                        } : undefined
                    }))
                }
            ],
            animation: true,
            animationDuration: 1000,
            animationEasing: 'cubicOut'
        }
    }, [data, title, sort, gap, funnelAlign, showConversionRate, conversionRates, dropoffRates, validation.isValid])

    // Event handlers
    const handleEvents = useMemo(() => ({
        click: (params: any) => {
            if (onStageClick && params.dataIndex !== undefined) {
                const stage = data[params.dataIndex]
                if (stage) onStageClick(stage, params.dataIndex)
            }
        }
    }), [data, onStageClick])

    // Error state
    if (!validation.isValid) {
        return (
            <div className={className} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        <div className="font-semibold mb-2">Invalid Funnel Data:</div>
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
                    <p className="text-muted-foreground">No stages to display</p>
                </div>
            </div>
        )
    }

    // Stats panel (optional)
    const statsPanel = showConversionRate && conversionRates.length > 0 && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">Conversion Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <div className="text-muted-foreground">Total Entries</div>
                    <div className="font-semibold text-lg">
                        {formatLargeNumber(data[0]?.value || 0)}
                    </div>
                </div>
                <div>
                    <div className="text-muted-foreground">Final Conversions</div>
                    <div className="font-semibold text-lg">
                        {formatLargeNumber(data[data.length - 1]?.value || 0)}
                    </div>
                </div>
                <div>
                    <div className="text-muted-foreground">Overall Rate</div>
                    <div className="font-semibold text-lg">
                        {formatPercentage(conversionRates[conversionRates.length - 1]?.rate || 0)}
                    </div>
                </div>
                <div>
                    <div className="text-muted-foreground">Avg Drop-off</div>
                    <div className="font-semibold text-lg">
                        {formatPercentage(
                            dropoffRates.length > 0
                                ? dropoffRates.reduce((sum, d) => sum + d.rate, 0) / dropoffRates.length
                                : 0
                        )}
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className={className} style={{ width }}>
            <div style={{ height }}>
                <EChartsWrapper
                    options={chartOptions}
                    onEvents={handleEvents}
                    className="h-full w-full"
                />
            </div>
            {statsPanel}
        </div>
    )
}

export default FunnelChart
