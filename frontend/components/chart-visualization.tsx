
'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { buildEChartsOptions } from '@/lib/visualizations/echarts-options';

const EChartsWrapper = dynamic(() => import('./visualizations/echarts-wrapper').then(mod => mod.EChartsWrapper), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-muted/20 animate-pulse rounded-lg"><span className="text-muted-foreground text-xs">Loading Chart Engine...</span></div>
});
import { useTheme } from 'next-themes';
import { AlertCircle } from 'lucide-react';
import { VisualizationConfig } from '@/lib/types';
import { useWorkspaceTheme } from '@/components/theme/theme-provider';

// Import specialized components
import { MetricCard } from './metric-card';
import { ProgressBar } from './progress-bar';
import { GaugeChart } from './gauge-chart';
import { SmallMultiples } from './visualizations/small-multiples';

interface ChartVisualizationProps {
  data: Record<string, any>[];
  config: Partial<VisualizationConfig>;
  isLoading?: boolean;
  onDataClick?: (params: any) => void;
}

export function ChartVisualization({ data, config, isLoading, onDataClick }: ChartVisualizationProps) {
  const { theme } = useTheme();
  const { theme: workspaceTheme } = useWorkspaceTheme();

  // Strict Config with defaults
  const strictConfig = useMemo(() => {
    return {
      type: 'bar',
      xAxis: '',
      yAxis: [],
      colors: config.colors && config.colors.length > 0 ? config.colors : (workspaceTheme?.chartPalette || []),
      ...config,
    } as VisualizationConfig;
  }, [config, workspaceTheme]);

  // Validate Config
  const isValid = useMemo(() => {
    // Metric only needs yAxis (value)
    if (strictConfig.type === 'metric') {
      return strictConfig.yAxis && strictConfig.yAxis.length > 0;
    }
    // Gauge/Progress need yAxis (value)
    if (['gauge', 'progress'].includes(strictConfig.type)) {
      return strictConfig.yAxis && strictConfig.yAxis.length > 0;
    }

    // Charts need X and Y
    if (!strictConfig.xAxis || !strictConfig.yAxis || strictConfig.yAxis.length === 0) return false;

    // Data check
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      if (strictConfig.xAxis && !keys.includes(strictConfig.xAxis)) return false;
    }
    return true;
  }, [strictConfig, data]);


  // ---- Render Logic based on Type ----

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20 animate-pulse rounded-lg">
        <span className="text-muted-foreground text-sm">Loading visualization...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg p-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-muted-foreground font-medium">No data available to visualize</span>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-destructive/30 bg-destructive/5 rounded-lg p-4">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <span className="text-destructive font-medium">Invalid Configuration</span>
        <p className="text-xs text-muted-foreground mt-1 max-w-[250px] text-center">
          Please select valid axes from the configuration panel on the right.
        </p>
      </div>
    );
  }

  // 1. Metric Card Render
  if (strictConfig.type === 'metric') {
    const valueCol = strictConfig.yAxis[0];
    const value = data[0]?.[valueCol]; // Take first row
    const previousValue = data.length > 1 ? data[1]?.[valueCol] : undefined;

    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-full max-w-sm">
          <MetricCard
            title={strictConfig.title || valueCol}
            value={typeof value === 'number' ? value : String(value)}
            previousValue={strictConfig.showTrend && typeof previousValue === 'number' ? previousValue : undefined}
            trendLabel={strictConfig.showTrend ? 'vs previous' : undefined}
            size="lg"
          />
        </div>
      </div>
    );
  }

  // 2. Gauge Chart Render
  if (strictConfig.type === 'gauge') {
    const valueCol = strictConfig.yAxis[0];
    const value = Number(data[0]?.[valueCol] || 0);

    return (
      <div className="flex items-center justify-center h-full p-8">
        <GaugeChart
          value={value}
          min={0}
          max={strictConfig.targetValue || 100}
          label={strictConfig.title || valueCol}
          size="lg"
        />
      </div>
    );
  }

  // 3. Progress Bar Render
  if (strictConfig.type === 'progress') {
    const valueCol = strictConfig.yAxis[0];
    const value = Number(data[0]?.[valueCol] || 0);

    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-full max-w-md">
          <ProgressBar
            value={value}
            max={strictConfig.targetValue || 100}
            label={strictConfig.title || valueCol}
            size="lg"
            showPercentage
          />
        </div>
      </div>
    );
  }

  // 4. Default: ECharts (Bar, Line, Pie, Funnel, Combo, Scatter)
  const options = buildEChartsOptions(data, strictConfig, theme);

  return (
    <div className="h-full w-full min-h-[400px] border border-border rounded-lg bg-card p-4 shadow-sm overflow-hidden relative">
      <EChartsWrapper
        options={options}
        isLoading={isLoading}
        className="h-full w-full"
        onEvents={{
          click: (params: any) => onDataClick && onDataClick(params)
        }}
      />
    </div>
  );
}
