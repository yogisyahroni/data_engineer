// Advanced Chart Type Definitions
// TASK-040 to TASK-045: Sankey, Gantt, Heatmap, Treemap, Waterfall, Funnel

/**
 * Sankey Diagram Types (TASK-040)
 */
export interface SankeyNode {
    name: string
    value?: number
    itemStyle?: {
        color?: string
        borderColor?: string
    }
    label?: {
        color?: string
        fontSize?: number
    }
}

export interface SankeyLink {
    source: string | number
    target: string | number
    value: number
    lineStyle?: {
        color?: string
        opacity?: number
    }
}

export interface SankeyData {
    nodes: SankeyNode[]
    links: SankeyLink[]
}

export interface SankeyChartProps {
    data: SankeyData
    title?: string
    height?: number | string
    width?: number | string
    className?: string
    nodeWidth?: number
    nodeGap?: number
    layoutIterations?: number
    orient?: 'horizontal' | 'vertical'
    onNodeClick?: (node: SankeyNode) => void
    onLinkClick?: (link: SankeyLink) => void
}

/**
 * Gantt Chart Types (TASK-041)
 */
export interface GanttTask {
    id: string | number
    name: string
    start: Date | string
    end: Date | string
    progress?: number // 0-100
    dependencies?: Array<string | number>
    milestone?: boolean
    category?: string
    color?: string
    description?: string
}

export interface GanttChartProps {
    data: GanttTask[]
    title?: string
    height?: number | string
    width?: number | string
    className?: string
    showProgress?: boolean
    showDependencies?: boolean
    showMilestones?: boolean
    dateFormat?: string
    onTaskClick?: (task: GanttTask) => void
}

/**
 * Heatmap Chart Types (TASK-042)
 */
export interface HeatmapDataPoint {
    x: string | number
    y: string | number
    value: number
    label?: string
}

export interface HeatmapChartProps {
    data: HeatmapDataPoint[]
    title?: string
    height?: number | string
    width?: number | string
    className?: string
    xAxisLabel?: string
    yAxisLabel?: string
    colorRange?: [string, string] // [min color, max color]
    showValues?: boolean
    onCellClick?: (point: HeatmapDataPoint) => void
}

/**
 * Treemap Chart Types (TASK-043)
 */
export interface TreemapNode {
    name: string
    value: number
    children?: TreemapNode[]
    itemStyle?: {
        color?: string
        borderColor?: string
    }
    label?: {
        formatter?: string
        fontSize?: number
    }
}

export interface TreemapChartProps {
    data: TreemapNode[]
    title?: string
    height?: number | string
    width?: number | string
    className?: string
    colorSaturation?: [number, number]
    levels?: number
    breadcrumb?: boolean
    onNodeClick?: (node: TreemapNode) => void
}

/**
 * Waterfall Chart Types (TASK-044)
 */
export interface WaterfallDataPoint {
    name: string
    value: number
    isTotal?: boolean
    isSubtotal?: boolean
    color?: string
}

export interface WaterfallChartProps {
    data: WaterfallDataPoint[]
    title?: string
    height?: number | string
    width?: number | string
    className?: string
    showConnectors?: boolean
    positiveColor?: string
    negativeColor?: string
    totalColor?: string
    onBarClick?: (point: WaterfallDataPoint) => void
}

/**
 * Funnel Chart Types (TASK-045)
 */
export interface FunnelDataPoint {
    name: string
    value: number
    color?: string
    label?: string
}

export interface FunnelChartProps {
    data: FunnelDataPoint[]
    title?: string
    height?: number | string
    width?: number | string
    className?: string
    sort?: 'ascending' | 'descending' | 'none'
    gap?: number
    funnelAlign?: 'left' | 'center' | 'right'
    showConversionRate?: boolean
    onStageClick?: (point: FunnelDataPoint, index: number) => void
}

/**
 * Common Chart Configuration
 */
export interface CommonChartConfig {
    title?: string
    subtitle?: string
    legend?: boolean
    tooltip?: boolean
    grid?: {
        top?: number | string
        right?: number | string
        bottom?: number | string
        left?: number | string
    }
    animation?: boolean
    animationDuration?: number
}

/**
 * Chart Color Palettes
 */
export const CHART_COLOR_PALETTES = {
    default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    business: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22'],
    pastel: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'],
    vibrant: ['#e60049', '#0bb4ff', '#50e991', '#e6d800', '#9b19f5', '#ffa300', '#dc0ab4', '#b3d4ff', '#00bfa0'],
    earth: ['#5d4e37', '#8b7355', '#a0826d', '#c9b1a2', '#e6d5c3', '#f5e6d3', '#d2b48c', '#8b4513', '#a0522d']
} as const

/**
 * Data validation helpers type
 */
export type ChartDataValidator<T> = (data: T) => {
    isValid: boolean
    errors: string[]
}
