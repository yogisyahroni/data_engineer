'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartVisualization } from './chart-visualization';
import { X, Settings, BarChart3, Maximize2, MoreVertical, Play, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { VisualizationConfig, AggregationConfig } from '@/lib/types';
import { useCrossFilter } from '@/hooks/use-cross-filter';
import { useAggregation } from '@/hooks/use-aggregation';

interface DashboardCardProps {
  id: string;
  title: string;
  queryId: string;
  data?: Record<string, any>[];
  columns?: string[];
  visualizationConfig?: VisualizationConfig;
  aggregationConfig?: AggregationConfig;
  isEditMode?: boolean;
  onRemove?: (id: string) => void;
  onEdit?: (id: string) => void;
  onExecute?: (id: string) => void;
}

export function DashboardCard({
  id,
  title,
  queryId,
  data,
  columns,
  visualizationConfig,
  aggregationConfig,
  isEditMode,
  onRemove,
  onEdit,
  onExecute
}: DashboardCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Aggregation Hook
  const { data: aggregationData, isLoading: isAggLoading } = useAggregation({
    data: data || [],
    config: aggregationConfig
  });

  // Determine effective data
  const chartData = useMemo(() => {
    // 1. Aggregation data takes precedence if config exists
    if (aggregationConfig && aggregationData) return aggregationData;

    // 2. Props data (if no aggregation)
    if (data && data.length > 0) return data;

    // 3. Fallback - empty
    return [];
  }, [data, aggregationData, aggregationConfig]);

  const isLoading = isAggLoading;

  // Normalize config for ECharts (handle legacy Recharts config)
  const normalizedConfig = useMemo<Partial<VisualizationConfig>>(() => {
    const raw = visualizationConfig as any;
    // ensure yAxis is array
    const yAxisArray = Array.isArray(raw?.yAxis)
      ? raw.yAxis
      : (raw?.yAxis ? [raw.yAxis] : ['value']);

    return {
      ...visualizationConfig,
      xAxis: raw?.xAxis || 'name',
      type: raw?.chartType || raw?.type || 'bar',
      yAxis: yAxisArray
    };
  }, [visualizationConfig]);

  return (
    <Card
      className={`overflow-hidden transition-all duration-200 ${isHovered ? 'shadow-lg ring-2 ring-primary/20' : 'shadow-sm'
        } ${isExpanded ? 'fixed inset-4 z-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header */}
      <div className="border-b border-border px-4 py-3 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditMode && (
            <div className="drag-handle cursor-move p-1 -ml-1 hover:bg-muted rounded">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="font-medium text-foreground text-sm truncate">{title}</h3>
        </div>

        <div className={`flex items-center gap-1 transition-opacity ${isHovered || isEditMode ? 'opacity-100' : 'opacity-0'
          }`}>
          {isEditMode ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7"
                onClick={() => onEdit?.(id)}
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-destructive hover:text-destructive"
                onClick={() => onRemove?.(id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExecute?.(id)}>
                  <Play className="w-4 h-4 mr-2" />
                  Refresh Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                  <Maximize2 className="w-4 h-4 mr-2" />
                  {isExpanded ? 'Exit Fullscreen' : 'Fullscreen'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(id)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Card Content - Chart */}
      <div className={`p-4 ${isExpanded ? 'flex-1' : 'h-64'}`}>
        <ChartVisualization
          config={normalizedConfig}
          data={chartData}
          onDataClick={(params: any) => {
            // Drill-down / Cross-filter support
            if (params.name && normalizedConfig.xAxis) {
              useCrossFilter.getState().setFilter(normalizedConfig.xAxis!, params.name);
            }
          }}
        />
      </div>

      {/* Expanded overlay backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </Card>
  );
}
