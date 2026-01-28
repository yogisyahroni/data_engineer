'use client';

import React, { useMemo } from 'react';
import { EChartsWrapper } from './echarts-wrapper';
import { buildEChartsOptions } from '@/lib/visualizations/echarts-options';
import { VisualizationConfig } from '@/lib/types';
import { Card } from '@/components/ui/card';

interface SmallMultiplesProps {
    data: Record<string, any>[];
    config: VisualizationConfig;
    isLoading?: boolean;
}

export function SmallMultiples({ data, config, isLoading }: SmallMultiplesProps) {
    const { seriesBreakout, xAxis, yAxis } = config;

    // Group data by breakout column
    const groupedData = useMemo(() => {
        if (!seriesBreakout || !data.length) return {};

        return data.reduce((acc, row) => {
            const key = String(row[seriesBreakout]);
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {} as Record<string, any[]>);
    }, [data, seriesBreakout]);

    const groups = Object.keys(groupedData);

    if (!seriesBreakout) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Please select a "Series Breakout" column to generate small multiples.
            </div>
        );
    }

    // Determine grid columns
    const gridCols = groups.length <= 4 ? 2 : 3;

    return (
        <div className="h-full w-full overflow-y-auto p-4">
            <div className={`grid grid-cols-1 md:grid-cols-${gridCols} gap-4`}>
                {groups.map((group) => {
                    const groupData = groupedData[group];
                    // Create a mini-config for this individual chart
                    const miniConfig: VisualizationConfig = {
                        ...config,
                        type: 'bar', // Default to bar, or inherit?
                        // Force title to group name
                        title: group,
                        seriesBreakout: undefined, // Don't break out again inside
                        showLegend: false,
                        showGrid: false,
                    };

                    // If the user selected a type for the small multiples (e.g. they want a grid of line charts),
                    // we should probably support that. For now hardcode or infer? 
                    // Let's assume the user wants the same type as the base config, but "small-multiples" IS the type.
                    // valid sub-types: bar, line, area, pie.
                    // For now, default to 'bar' or 'line' based on X-axis?
                    // Let's default to 'bar' but allow overriding if we add a 'subType' to config later.
                    // Logic: use 'bar' for now.

                    // Actually, let's look at config. If we can store "subType", great. 
                    // If not, default to 'bar'.
                    const subType = 'bar';

                    const options = buildEChartsOptions(groupData, { ...miniConfig, type: subType });

                    return (
                        <Card key={group} className="h-[250px] p-2 flex flex-col">
                            <div className="text-xs font-semibold text-center mb-2 truncate">{group}</div>
                            <div className="flex-1 min-h-0">
                                <EChartsWrapper options={options} isLoading={isLoading} />
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
