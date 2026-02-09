'use client'

// Sankey Diagram Component - TASK-040
// Flow visualization untuk source-target relationships

import React, { useMemo } from 'react'
import { EChartsWrapper } from './echarts-wrapper'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { EChartsOption } from 'echarts'
import type { SankeyChartProps } from './advanced-chart-types'
import { validateSankeyData } from './advanced-chart-utils'

/**
 * Sankey Diagram Component
 * 
 * Features:
 * - Flow visualization between nodes
 * - Source-target mapping
 * - Value-based link thickness
 * - Interactive tooltips
 * - Customizable node colors
 * - Drag-and-drop nodes
 * 
 * Use cases:
 * - Process flows
 * - User journey mapping
 * - Budget allocation
 * - Energy/resource flows
 */
export function SankeyChart({
    data,
    title,
    height = 600,
    width = '100%',
    className = '',
    nodeWidth = 20,
    nodeGap = 8,
    layoutIterations = 32,
    orient = 'horizontal',
    onNodeClick,
    onLinkClick
}: SankeyChartProps) {
    // Validate data
    const validation = useMemo(() => validateSankeyData(data), [data])

    // Build ECharts options
    const chartOptions = useMemo((): EChartsOption => {
        if (!validation.isValid) {
            return {}
        }

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
                triggerOn: 'mousemove',
                formatter: function (params: any) {
                    if (params.dataType === 'node') {
                        return `${params.name}<br/>Value: ${params.value || 'N/A'}`
                    } else if (params.dataType === 'edge') {
                        return `${params.data.source} → ${params.data.target}<br/>Flow: ${params.value}`
                    }
                    return ''
                }
            },
            series: [
                {
                    type: 'sankey',
                    layout: 'none',
                    layoutIterations: layoutIterations,
                    orient: orient,
                    emphasis: {
                        focus: 'adjacency'
                    },
                    nodeWidth: nodeWidth,
                    nodeGap: nodeGap,
                    data: data.nodes.map(node => ({
                        name: node.name,
                        value: node.value,
                        itemStyle: node.itemStyle,
                        label: node.label
                    })),
                    links: data.links.map(link => ({
                        source: link.source,
                        target: link.target,
                        value: link.value,
                        lineStyle: link.lineStyle
                    })),
                    lineStyle: {
                        color: 'gradient',
                        curveness: 0.5
                    },
                    label: {
                        fontSize: 12,
                        fontWeight: 'normal'
                    }
                }
            ],
            animation: true,
            animationDuration: 1000,
            animationEasing: 'cubicOut'
        }
    }, [data, title, nodeWidth, nodeGap, layoutIterations, orient, validation.isValid])

    // Event handlers
    const handleEvents = useMemo(() => ({
        click: (params: any) => {
            if (params.dataType === 'node' && onNodeClick) {
                const node = data.nodes.find(n => n.name === params.name)
                if (node) onNodeClick(node)
            } else if (params.dataType === 'edge' && onLinkClick) {
                const link = data.links.find(l =>
                    l.source === params.data.source && l.target === params.data.target
                )
                if (link) onLinkClick(link)
            }
        }
    }), [data, onNodeClick, onLinkClick])

    // Error state
    if (!validation.isValid) {
        return (
            <div className={className} style={{ height, width }}>
                <Alert variant="destructive">
                    <AlertDescription>
                        <div className="font-semibold mb-2">Invalid Sankey Data:</div>
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
    if (data.nodes.length === 0 || data.links.length === 0) {
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

export default SankeyChart
