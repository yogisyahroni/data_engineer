// Advanced Chart Utilities
// Helper functions untuk data transformation dan validation

import type {
    SankeyData,
    GanttTask,
    HeatmapDataPoint,
    TreemapNode,
    WaterfallDataPoint,
    FunnelDataPoint
} from './advanced-chart-types'

/**
 * Validate Sankey data structure
 */
export function validateSankeyData(data: SankeyData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.nodes || data.nodes.length === 0) {
        errors.push('Sankey diagram requires at least one node')
    }

    if (!data.links || data.links.length === 0) {
        errors.push('Sankey diagram requires at least one link')
    }

    // Validate links reference valid nodes
    if (data.nodes && data.links) {
        const nodeNames = new Set(data.nodes.map(n => n.name))
        data.links.forEach((link, index) => {
            if (!nodeNames.has(String(link.source))) {
                errors.push(`Link ${index}: source "${link.source}" not found in nodes`)
            }
            if (!nodeNames.has(String(link.target))) {
                errors.push(`Link ${index}: target "${link.target}" not found in nodes`)
            }
            if (link.value <= 0) {
                errors.push(`Link ${index}: value must be positive`)
            }
        })
    }

    return { isValid: errors.length === 0, errors }
}

/**
 * Validate Gantt data
 */
export function validateGanttData(data: GanttTask[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data || data.length === 0) {
        errors.push('Gantt chart requires at least one task')
    }

    data.forEach((task, index) => {
        if (!task.name) {
            errors.push(`Task ${index}: name is required`)
        }
        if (!task.start) {
            errors.push(`Task ${index}: start date is required`)
        }
        if (!task.end) {
            errors.push(`Task ${index}: end date is required`)
        }

        const start = new Date(task.start)
        const end = new Date(task.end)
        if (start > end) {
            errors.push(`Task ${index} (${task.name}): start date must be before end date`)
        }
    })

    return { isValid: errors.length === 0, errors }
}

/**
 * Format date forGantt chart
 */
export function formatGanttDate(date: Date | string, format: string = 'yyyy-MM-dd'): string {
    const d = typeof date === 'string' ? new Date(date) : date

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')

    return format
        .replace('yyyy', String(year))
        .replace('MM', month)
        .replace('dd', day)
}

/**
 * Calculate Gantt time range
 */
export function calculateGanttTimeRange(tasks: GanttTask[]): { min: Date; max: Date } {
    const dates = tasks.flatMap(task => [new Date(task.start), new Date(task.end)])
    return {
        min: new Date(Math.min(...dates.map(d => d.getTime()))),
        max: new Date(Math.max(...dates.map(d => d.getTime())))
    }
}

/**
 * Validate Heatmap data
 */
export function validateHeatmapData(data: HeatmapDataPoint[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data || data.length === 0) {
        errors.push('Heatmap requires at least one data point')
    }

    data.forEach((point, index) => {
        if (point.x === undefined || point.x === null) {
            errors.push(`Point ${index}: x coordinate is required`)
        }
        if (point.y === undefined || point.y === null) {
            errors.push(`Point ${index}: y coordinate is required`)
        }
        if (typeof point.value !== 'number') {
            errors.push(`Point ${index}: value must be a number`)
        }
    })

    return { isValid: errors.length === 0, errors }
}

/**
 * Extract unique X and Y axes from heatmap data
 */
export function extractHeatmapAxes(data: HeatmapDataPoint[]): { xAxis: string[]; yAxis: string[] } {
    const xSet = new Set<string>()
    const ySet = new Set<string>()

    data.forEach(point => {
        xSet.add(String(point.x))
        ySet.add(String(point.y))
    })

    return {
        xAxis: Array.from(xSet).sort(),
        yAxis: Array.from(ySet).sort()
    }
}

/**
 * Calculate heatmap value range
 */
export function calculateHeatmapRange(data: HeatmapDataPoint[]): { min: number; max: number } {
    const values = data.map(p => p.value)
    return {
        min: Math.min(...values),
        max: Math.max(...values)
    }
}

/**
 * Validate Treemap data
 */
export function validateTreemapData(data: TreemapNode[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data || data.length === 0) {
        errors.push('Treemap requires at least one node')
    }

    function validateNode(node: TreemapNode, path: string) {
        if (!node.name) {
            errors.push(`${path}: name is required`)
        }
        if (node.children) {
            if (node.children.length > 0) {
                node.children.forEach((child, index) => {
                    validateNode(child, `${path}.children[${index}]`)
                })
            }
        } else {
            if (typeof node.value !== 'number' || node.value <= 0) {
                errors.push(`${path}: leaf node must have positive value`)
            }
        }
    }

    data.forEach((node, index) => validateNode(node, `node[${index}]`))

    return { isValid: errors.length === 0, errors }
}

/**
 * Calculate total tree value
 */
export function calculateTreeTotal(nodes: TreemapNode[]): number {
    function sumNode(node: TreemapNode): number {
        if (node.children && node.children.length > 0) {
            return node.children.reduce((sum, child) => sum + sumNode(child), 0)
        }
        return node.value || 0
    }

    return nodes.reduce((total, node) => total + sumNode(node), 0)
}

/**
 * Validate Waterfall data
 */
export function validateWaterfallData(data: WaterfallDataPoint[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data || data.length === 0) {
        errors.push('Waterfall chart requires at least one data point')
    }

    data.forEach((point, index) => {
        if (!point.name) {
            errors.push(`Point ${index}: name is required`)
        }
        if (typeof point.value !== 'number') {
            errors.push(`Point ${index}: value must be a number`)
        }
    })

    return { isValid: errors.length === 0, errors }
}

/**
 * Calculate cumulative values for waterfall
 */
export function calculateWaterfallCumulative(data: WaterfallDataPoint[]): Array<{ start: number; end: number; value: number }> {
    const result: Array<{ start: number; end: number; value: number }> = []
    let cumulative = 0

    data.forEach(point => {
        if (point.isTotal) {
            // Total point - calculate from all previous
            const total = cumulative
            result.push({ start: 0, end: total, value: total })
            cumulative = total
        } else {
            const start = cumulative
            const end = cumulative + point.value
            result.push({ start, end, value: point.value })
            cumulative = end
        }
    })

    return result
}

/**
 * Validate Funnel data
 */
export function validateFunnelData(data: FunnelDataPoint[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data || data.length === 0) {
        errors.push('Funnel chart requires at least one stage')
    }

    data.forEach((point, index) => {
        if (!point.name) {
            errors.push(`Stage ${index}: name is required`)
        }
        if (typeof point.value !== 'number' || point.value < 0) {
            errors.push(`Stage ${index}: value must be a non-negative number`)
        }
    })

    return { isValid: errors.length === 0, errors }
}

/**
 * Calculate funnel conversion rates
 */
export function calculateFunnelConversion(data: FunnelDataPoint[]): Array<{ name: string; rate: number }> {
    if (data.length === 0) return []

    const firstValue = data[0].value
    return data.map(point => ({
        name: point.name,
        rate: firstValue > 0 ? (point.value / firstValue) * 100 : 0
    }))
}

/**
 * Calculate drop-off rates between stages
 */
export function calculateFunnelDropoff(data: FunnelDataPoint[]): Array<{ from: string; to: string; rate: number }> {
    const result: Array<{ from: string; to: string; rate: number }> = []

    for (let i = 0; i < data.length - 1; i++) {
        const current = data[i]
        const next = data[i + 1]
        const dropoff = current.value > 0 ? ((current.value - next.value) / current.value) * 100 : 0

        result.push({
            from: current.name,
            to: next.name,
            rate: dropoff
        })
    }

    return result
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`
}

/**
 * Format large numbers with suffixes
 */
export function formatLargeNumber(value: number): string {
    if (Math.abs(value) >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)}B`
    }
    if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
    }
    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
    }
    return value.toFixed(0)
}
