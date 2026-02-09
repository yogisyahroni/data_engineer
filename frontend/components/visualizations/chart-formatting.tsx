'use client'

// Chart Formatting Component - TASK-046
// Advanced formatting options untuk all charts

import React, { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
    ALL_PALETTES,
    getPaletteById,
    getPalettesByType,
    type ColorPalette,
    type ColorScaleType
} from '@/lib/chart-palettes'
import {
    ALL_CHART_TEMPLATES,
    getTemplatesByCategory,
    getTemplateById,
    type ChartTemplate,
    type ChartTemplateCategory
} from '@/lib/chart-templates'
import type { EChartsOption } from 'echarts'

/**
 * Number Format Type
 */
export type NumberFormatType =
    | 'number'
    | 'currency'
    | 'percentage'
    | 'scientific'
    | 'compact'
    | 'custom'

/**
 * Chart Formatting Options
 */
export interface ChartFormattingOptions {
    // Title
    title?: string
    subtitle?: string
    titleAlign?: 'left' | 'center' | 'right'

    // Colors
    colorPaletteId?: string
    customColors?: string[]

    // Legend
    showLegend?: boolean
    legendPosition?: 'top' | 'bottom' | 'left' | 'right'
    legendAlign?: 'start' | 'center' | 'end'

    // Tooltip
    showTooltip?: boolean
    tooltipTrigger?: 'item' | 'axis' | 'none'

    // Axis
    showXAxis?: boolean
    showYAxis?: boolean
    xAxisName?: string
    yAxisName?: string
    rotateXLabels?: number

    // Grid
    gridTop?: number
    gridBottom?: number
    gridLeft?: number
    gridRight?: number

    // Data Labels
    showDataLabels?: boolean
    dataLabelPosition?: 'top' | 'bottom' | 'inside' | 'outside'
    dataLabelFormat?: NumberFormatType

    // Number Format
    numberFormat?: NumberFormatType
    decimalPlaces?: number
    currencySymbol?: string
    customFormat?: string

    // Animation
    enableAnimation?: boolean
    animationDuration?: number

    // Theme
    backgroundColor?: string
    fontSize?: number
    fontFamily?: string

    // Template
    templateId?: string
}

/**
 * Chart Formatting Props
 */
export interface ChartFormattingProps {
    options: ChartFormattingOptions
    onChange: (options: ChartFormattingOptions) => void
    chartType?: string
    onApplyTemplate?: (template: ChartTemplate) => void
}

/**
 * Chart Formatting Component
 */
export function ChartFormatting({
    options,
    onChange,
    chartType,
    onApplyTemplate
}: ChartFormattingProps) {
    const [activeTab, setActiveTab] = useState('general')

    const updateOptions = (updates: Partial<ChartFormattingOptions>) => {
        onChange({ ...options, ...updates })
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="colors">Colors</TabsTrigger>
                <TabsTrigger value="formatting">Formatting</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Title & Subtitle</CardTitle>
                        <CardDescription>Configure chart title and subtitle</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="Chart Title"
                                value={options.title || ''}
                                onChange={(e) => updateOptions({ title: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subtitle">Subtitle</Label>
                            <Input
                                id="subtitle"
                                placeholder="Chart Subtitle"
                                value={options.subtitle || ''}
                                onChange={(e) => updateOptions({ subtitle: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Title Alignment</Label>
                            <Select
                                value={options.titleAlign || 'center'}
                                onValueChange={(value: any) => updateOptions({ titleAlign: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Legend</CardTitle>
                        <CardDescription>Configure chart legend</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-legend">Show Legend</Label>
                            <Switch
                                id="show-legend"
                                checked={options.showLegend !== false}
                                onCheckedChange={(checked) => updateOptions({ showLegend: checked })}
                            />
                        </div>

                        {options.showLegend !== false && (
                            <>
                                <div className="space-y-2">
                                    <Label>Position</Label>
                                    <Select
                                        value={options.legendPosition || 'bottom'}
                                        onValueChange={(value: any) => updateOptions({ legendPosition: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="top">Top</SelectItem>
                                            <SelectItem value="bottom">Bottom</SelectItem>
                                            <SelectItem value="left">Left</SelectItem>
                                            <SelectItem value="right">Right</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Alignment</Label>
                                    <Select
                                        value={options.legendAlign || 'center'}
                                        onValueChange={(value: any) => updateOptions({ legendAlign: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="start">Start</SelectItem>
                                            <SelectItem value="center">Center</SelectItem>
                                            <SelectItem value="end">End</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Axis</CardTitle>
                        <CardDescription>Configure chart axes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-xaxis">Show X Axis</Label>
                            <Switch
                                id="show-xaxis"
                                checked={options.showXAxis !== false}
                                onCheckedChange={(checked) => updateOptions({ showXAxis: checked })}
                            />
                        </div>

                        {options.showXAxis !== false && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="xaxis-name">X Axis Name</Label>
                                    <Input
                                        id="xaxis-name"
                                        placeholder="X Axis Label"
                                        value={options.xAxisName || ''}
                                        onChange={(e) => updateOptions({ xAxisName: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Rotate X Labels: {options.rotateXLabels || 0}°</Label>
                                    <Slider
                                        value={[options.rotateXLabels || 0]}
                                        onValueChange={([value]) => updateOptions({ rotateXLabels: value })}
                                        min={0}
                                        max={90}
                                        step={15}
                                    />
                                </div>
                            </>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-yaxis">Show Y Axis</Label>
                            <Switch
                                id="show-yaxis"
                                checked={options.showYAxis !== false}
                                onCheckedChange={(checked) => updateOptions({ showYAxis: checked })}
                            />
                        </div>

                        {options.showYAxis !== false && (
                            <div className="space-y-2">
                                <Label htmlFor="yaxis-name">Y Axis Name</Label>
                                <Input
                                    id="yaxis-name"
                                    placeholder="Y Axis Label"
                                    value={options.yAxisName || ''}
                                    onChange={(e) => updateOptions({ yAxisName: e.target.value })}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Color Palette</CardTitle>
                        <CardDescription>Choose a color palette for your chart</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Palette Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['sequential', 'diverging', 'categorical', 'gradient'] as ColorScaleType[]).map((type) => {
                                    const palettes = getPalettesByType(type)
                                    return (
                                        <div key={type} className="space-y-2">
                                            <div className="text-sm font-medium capitalize">{type}</div>
                                            <Select
                                                value={options.colorPaletteId}
                                                onValueChange={(value) => updateOptions({ colorPaletteId: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={`Select ${type}`} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {palettes.map((palette) => (
                                                        <SelectItem key={palette.id} value={palette.id}>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex gap-0.5">
                                                                    {palette.colors.slice(0, 5).map((color, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="w-3 h-3 rounded-sm"
                                                                            style={{ backgroundColor: color }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span>{palette.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {options.colorPaletteId && (
                            <div className="p-4 bg-muted rounded-lg">
                                <div className="text-sm font-medium mb-2">Selected Palette</div>
                                <div className="flex gap-1">
                                    {getPaletteById(options.colorPaletteId)?.colors.map((color, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 h-8 rounded"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    {getPaletteById(options.colorPaletteId)?.description}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Formatting Tab */}
            <TabsContent value="formatting" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Number Formatting</CardTitle>
                        <CardDescription>Configure how numbers are displayed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Format Type</Label>
                            <Select
                                value={options.numberFormat || 'number'}
                                onValueChange={(value: any) => updateOptions({ numberFormat: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="currency">Currency</SelectItem>
                                    <SelectItem value="percentage">Percentage</SelectItem>
                                    <SelectItem value="scientific">Scientific</SelectItem>
                                    <SelectItem value="compact">Compact (K/M/B)</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Decimal Places: {options.decimalPlaces || 0}</Label>
                            <Slider
                                value={[options.decimalPlaces || 0]}
                                onValueChange={([value]) => updateOptions({ decimalPlaces: value })}
                                min={0}
                                max={4}
                                step={1}
                            />
                        </div>

                        {options.numberFormat === 'currency' && (
                            <div className="space-y-2">
                                <Label htmlFor="currency-symbol">Currency Symbol</Label>
                                <Input
                                    id="currency-symbol"
                                    placeholder="$"
                                    value={options.currencySymbol || '$'}
                                    onChange={(e) => updateOptions({ currencySymbol: e.target.value })}
                                    maxLength={3}
                                />
                            </div>
                        )}

                        {options.numberFormat === 'custom' && (
                            <div className="space-y-2">
                                <Label htmlFor="custom-format">Custom Format</Label>
                                <Input
                                    id="custom-format"
                                    placeholder="e.g. #,##0.00"
                                    value={options.customFormat || ''}
                                    onChange={(e) => updateOptions({ customFormat: e.target.value })}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Data Labels</CardTitle>
                        <CardDescription>Configure data label display</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-data-labels">Show Data Labels</Label>
                            <Switch
                                id="show-data-labels"
                                checked={options.showDataLabels || false}
                                onCheckedChange={(checked) => updateOptions({ showDataLabels: checked })}
                            />
                        </div>

                        {options.showDataLabels && (
                            <div className="space-y-2">
                                <Label>Label Position</Label>
                                <Select
                                    value={options.dataLabelPosition || 'top'}
                                    onValueChange={(value: any) => updateOptions({ dataLabelPosition: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="top">Top</SelectItem>
                                        <SelectItem value="bottom">Bottom</SelectItem>
                                        <SelectItem value="inside">Inside</SelectItem>
                                        <SelectItem value="outside">Outside</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Animation</CardTitle>
                        <CardDescription>Configure chart animations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="enable-animation">Enable Animation</Label>
                            <Switch
                                id="enable-animation"
                                checked={options.enableAnimation !== false}
                                onCheckedChange={(checked) => updateOptions({ enableAnimation: checked })}
                            />
                        </div>

                        {options.enableAnimation !== false && (
                            <div className="space-y-2">
                                <Label>Duration: {options.animationDuration || 800}ms</Label>
                                <Slider
                                    value={[options.animationDuration || 800]}
                                    onValueChange={([value]) => updateOptions({ animationDuration: value })}
                                    min={200}
                                    max={3000}
                                    step={100}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Chart Templates</CardTitle>
                        <CardDescription>Apply pre-configured templates</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(['business', 'financial', 'analytics', 'marketing', 'operations'] as ChartTemplateCategory[]).map((category) => {
                            const templates = getTemplatesByCategory(category)
                            if (templates.length === 0) return null

                            return (
                                <div key={category} className="space-y-2">
                                    <div className="text-sm font-medium capitalize">{category} Templates</div>
                                    <div className="grid gap-2">
                                        {templates.map((template) => (
                                            <Button
                                                key={template.id}
                                                variant="outline"
                                                className="w-full justify-start h-auto py-3 px-4"
                                                onClick={() => {
                                                    updateOptions({ templateId: template.id })
                                                    onApplyTemplate?.(template)
                                                }}
                                            >
                                                <div className="text-left">
                                                    <div className="font-medium">{template.name}</div>
                                                    <div className="text-xs text-muted-foreground">{template.description}</div>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}

/**
 * Apply formatting options to ECharts config
 */
export function applyFormattingToChart(
    baseConfig: Partial<EChartsOption>,
    options: ChartFormattingOptions
): Partial<EChartsOption> {
    const config = { ...baseConfig }

    // Title
    if (options.title) {
        config.title = {
            ...config.title,
            text: options.title,
            subtext: options.subtitle,
            left: options.titleAlign || 'center'
        }
    }

    // Legend
    if (options.showLegend !== undefined) {
        // Map align values to ECharts valid values
        let alignValue: 'left' | 'right' | 'auto' = 'auto'
        if (options.legendAlign === 'start') alignValue = 'left'
        else if (options.legendAlign === 'end') alignValue = 'right'
        else if (options.legendAlign === 'center') alignValue = 'auto'

        config.legend = options.showLegend ? {
            ...config.legend,
            [options.legendPosition || 'bottom']: '5%',
            orient: (options.legendPosition === 'left' || options.legendPosition === 'right') ? 'vertical' : 'horizontal',
            align: alignValue
        } : { show: false }
    }

    // Colors
    if (options.colorPaletteId) {
        const palette = getPaletteById(options.colorPaletteId)
        if (palette) {
            config.color = palette.colors
        }
    }

    // Animation
    if (options.enableAnimation !== undefined) {
        config.animation = options.enableAnimation
        if (options.animationDuration) {
            config.animationDuration = options.animationDuration
        }
    }

    return config
}

export default ChartFormatting
