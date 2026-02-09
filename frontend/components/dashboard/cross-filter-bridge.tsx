'use client';

import React, { useCallback, useMemo } from 'react';
import { FilterCriteria, FilterOperator, useCrossFilter } from '@/lib/cross-filter-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Chart data point structure for event handling
 */
export interface ChartDataPoint {
    /** The field name that was clicked */
    fieldName: string;
    /** The value that was clicked */
    value: any;
    /** Optional display label */
    label?: string;
    /** Additional data from the point */
    data?: Record<string, any>;
}

/**
 * Props for CrossFilterBridge component
 */
export interface CrossFilterBridgeProps {
    /** Unique ID for this chart */
    chartId: string;

    /** The chart component to wrap */
    children: React.ReactNode;

    /** Enable cross-filtering for this chart */
    enabled?: boolean;

    /** Default filter operator to use */
    defaultOperator?: FilterOperator;

    /** Callback when chart element is clicked */
    onDataPointClick?: (dataPoint: ChartDataPoint) => void;

    /** Custom filter extraction logic */
    extractFilter?: (dataPoint: ChartDataPoint) => Omit<FilterCriteria, 'id' | 'timestamp' | 'sourceChartId'> | null;

    /** Show visual indicator when chart is source of filter */
    showFilterIndicator?: boolean;

    /** Allow multiple filters from same chart */
    allowMultipleFilters?: boolean;

    /** CSS class for container */
    className?: string;
}

/**
 * CrossFilterBridge Component
 * 
 * Wraps chart components to enable cross-filtering functionality.
 * Handles click events, creates filters, and shows visual feedback.
 */
export function CrossFilterBridge({
    chartId,
    children,
    enabled = true,
    defaultOperator = 'equals',
    onDataPointClick,
    extractFilter,
    showFilterIndicator = true,
    allowMultipleFilters = false,
    className,
}: CrossFilterBridgeProps) {
    const {
        addFilter,
        removeChartFilters,
        isChartFiltered,
        getActiveFilters,
    } = useCrossFilter();

    const isFiltered = isChartFiltered(chartId);

    /**
     * Get filters created by this chart
     */
    const chartFilters = useMemo(() => {
        return getActiveFilters().filter(f => f.sourceChartId === chartId);
    }, [getActiveFilters, chartId]);

    /**
     * Handle chart data point click
     */
    const handleDataPointClick = useCallback((dataPoint: ChartDataPoint) => {
        if (!enabled) return;

        // Call custom callback if provided
        if (onDataPointClick) {
            onDataPointClick(dataPoint);
        }

        // Extract filter from data point
        let filterData: Omit<FilterCriteria, 'id' | 'timestamp' | 'sourceChartId'> | null = null;

        if (extractFilter) {
            // Use custom extraction logic
            filterData = extractFilter(dataPoint);
        } else {
            // Default extraction logic
            filterData = {
                fieldName: dataPoint.fieldName,
                operator: defaultOperator,
                value: dataPoint.value,
                label: dataPoint.label || `${dataPoint.fieldName}: ${dataPoint.value}`,
                type: 'chart',
            };
        }

        if (!filterData) return;

        // Remove existing filters from this chart if not allowing multiple
        if (!allowMultipleFilters && isFiltered) {
            removeChartFilters(chartId);
        }

        // Add the new filter
        addFilter({
            ...filterData,
            sourceChartId: chartId,
        });
    }, [
        enabled,
        onDataPointClick,
        extractFilter,
        defaultOperator,
        allowMultipleFilters,
        isFiltered,
        removeChartFilters,
        chartId,
        addFilter,
    ]);

    /**
     * Clear all filters from this chart
     */
    const handleClearFilters = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        removeChartFilters(chartId);
    }, [removeChartFilters, chartId]);

    /**
     * Clone children and inject click handler
     */
    const childrenWithProps = useMemo(() => {
        if (!enabled) return children;

        return React.Children.map(children, child => {
            if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                    // Inject click handler
                    onDataPointClick: handleDataPointClick,
                    // Mark as cross-filter enabled
                    crossFilterEnabled: true,
                } as any);
            }
            return child;
        });
    }, [children, enabled, handleDataPointClick]);

    return (
        <div className={cn('relative', className)}>
            {/* Filter Indicator Badge */}
            {showFilterIndicator && isFiltered && (
                <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                    {chartFilters.map((filter) => (
                        <Badge
                            key={filter.id}
                            variant="secondary"
                            className="flex items-center gap-1 shadow-md border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                            <Filter className="w-3 h-3" />
                            <span className="text-xs font-medium">
                                {filter.label || `${filter.fieldName}: ${filter.value}`}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-primary/30 ml-1"
                                onClick={handleClearFilters}
                                aria-label="Remove filter"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Border highlight when filtered */}
            <div
                className={cn(
                    'transition-all duration-200',
                    isFiltered && 'ring-2 ring-primary/50 rounded-lg shadow-lg'
                )}
            >
                {childrenWithProps}
            </div>
        </div>
    );
}

/**
 * Helper function to create chart event handler
 * Use this in your chart components to enable cross-filtering
 */
export function createChartClickHandler(
    fieldName: string,
    onDataPointClick?: (dataPoint: ChartDataPoint) => void
) {
    return (params: any) => {
        if (!onDataPointClick) return;

        // Extract data from ECharts event params
        const dataPoint: ChartDataPoint = {
            fieldName,
            value: params.name || params.value,
            label: params.name,
            data: params.data,
        };

        onDataPointClick(dataPoint);
    };
}

/**
 * Higher-order component to wrap charts with cross-filtering
 */
export function withCrossFilter<P extends object>(
    Component: React.ComponentType<P>,
    options: Omit<CrossFilterBridgeProps, 'children' | 'chartId'> & {
        getChartId: (props: P) => string;
    }
) {
    return function CrossFilterWrappedComponent(props: P) {
        const chartId = options.getChartId(props);

        return (
            <CrossFilterBridge
                chartId={chartId}
                {...options}
            >
                <Component {...props} />
            </CrossFilterBridge>
        );
    };
}

/**
 * Helper to apply filters to ECharts option
 * Highlights selected data points
 */
export function applyFilterHighlight(
    option: any,
    filters: FilterCriteria[],
    dataFieldName: string
): any {
    if (!filters || filters.length === 0) return option;

    const filterValues = new Set(
        filters
            .filter(f => f.fieldName === dataFieldName && f.operator === 'equals')
            .map(f => f.value)
    );

    if (filterValues.size === 0) return option;

    // Apply emphasis style to matching items
    const itemStyle = {
        emphasis: {
            borderColor: '#3b82f6',
            borderWidth: 3,
            shadowBlur: 10,
            shadowColor: 'rgba(59, 130, 246, 0.5)',
        },
    };

    return {
        ...option,
        ...itemStyle,
    };
}

/**
 * Utility to check if data point matches filter
 */
export function matchesFilter(
    value: any,
    filter: FilterCriteria
): boolean {
    if (value === undefined || value === null) return false;

    switch (filter.operator) {
        case 'equals':
            return value === filter.value;

        case 'not_equals':
            return value !== filter.value;

        case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);

        case 'not_in':
            return Array.isArray(filter.value) && !filter.value.includes(value);

        case 'between':
            if (!Array.isArray(filter.value) || filter.value.length !== 2) return false;
            return value >= filter.value[0] && value <= filter.value[1];

        case 'greater_than':
            return value > filter.value;

        case 'less_than':
            return value < filter.value;

        case 'contains':
            return String(value).toLowerCase().includes(String(filter.value).toLowerCase());

        case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());

        case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());

        default:
            return false;
    }
}
