'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  LineChart,
  PieChart,
  ScatterChart,
  Sparkles,
  Hash,
  TrendingUp,
  AreaChart,
  Layers,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MessageSquare,
  AlertTriangle,
  Boxes,
} from 'lucide-react';
import { VisualizationConfig } from '@/lib/types';

interface VisualizationSidebarProps {
  config: Partial<VisualizationConfig>;
  onConfigChange: (config: Partial<VisualizationConfig>) => void;
  results?: Record<string, any>[] | null;
  columns?: string[] | null;
}

const CHART_TYPES = [
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'line', label: 'Line', icon: LineChart },
  { id: 'area', label: 'Area', icon: AreaChart },
  { id: 'pie', label: 'Pie', icon: PieChart },
  { id: 'scatter', label: 'Scatter', icon: ScatterChart },
  { id: 'combo', label: 'Combo', icon: Layers },
  { id: 'funnel', label: 'Funnel', icon: TrendingUp },
  { id: 'metric', label: 'Metric', icon: Hash },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'gauge', label: 'Gauge', icon: TrendingUp },
  { id: 'treemap', label: 'Treemap', icon: Palette },
  { id: 'sunburst', label: 'Sunburst', icon: PieChart },
  { id: 'sankey', label: 'Sankey', icon: TrendingUp },
  { id: 'heatmap', label: 'Heatmap', icon: Palette },
  { id: 'radar', label: 'Radar', icon: Sparkles },
  { id: 'waterfall', label: 'Waterfall', icon: BarChart3 },
  { id: 'small-multiples', label: 'Small Multiples', icon: Layers },
];

const COLOR_SCHEMES = [
  { id: 'default', label: 'Default', colors: ['#60a5fa', '#34d399', '#fbbf24'] },
  { id: 'ocean', label: 'Ocean', colors: ['#0ea5e9', '#06b6d4', '#14b8a6'] },
  { id: 'sunset', label: 'Sunset', colors: ['#f97316', '#ef4444', '#ec4899'] },
  { id: 'forest', label: 'Forest', colors: ['#22c55e', '#84cc16', '#16a34a'] },
  { id: 'purple', label: 'Purple', colors: ['#a855f7', '#8b5cf6', '#6366f1'] },
];

export function VisualizationSidebar({
  config,
  onConfigChange,
  results,
  columns,
}: VisualizationSidebarProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeSection, setActiveSection] = useState<'data' | 'display' | 'analytics'>('data');

  // ... (existing code) ...


  // Derive available columns from results or use provided columns
  const availableColumns = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns.map((col) => ({
        value: col,
        label: col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      }));
    }
    if (results && results.length > 0) {
      return Object.keys(results[0]).map((col) => ({
        value: col,
        label: col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      }));
    }
    return [];
  }, [columns, results]);

  // Detect numeric columns for Y-axis suggestions
  const numericColumns = useMemo(() => {
    if (!results || results.length === 0) return [];
    return availableColumns.filter((col) => {
      const firstValue = results[0][col.value];
      return typeof firstValue === 'number';
    });
  }, [results, availableColumns]);

  // Detect categorical columns for X-axis suggestions
  const categoricalColumns = useMemo(() => {
    if (!results || results.length === 0) return availableColumns;
    return availableColumns.filter((col) => {
      const firstValue = results[0][col.value];
      return typeof firstValue !== 'number';
    });
  }, [results, availableColumns]);

  // Generate AI suggestion based on data
  const aiSuggestion = useMemo(() => {
    if (!results || results.length === 0 || availableColumns.length < 2) {
      return null;
    }

    const xCol = categoricalColumns[0] || availableColumns[0];
    const yCol = numericColumns[0] || availableColumns[1];

    // Determine best chart type
    let type: VisualizationConfig['type'] = 'bar';
    let description = 'Based on your data';

    if (results.length > 10 && yCol && xCol) {
      const isTimeSeries = ['date', 'month', 'year', 'time', 'day'].some((t) =>
        xCol.value.toLowerCase().includes(t)
      );
      if (isTimeSeries) {
        type = 'line';
        description = 'Time-series data detected - line chart recommended';
      }
    }

    if (results.length <= 6 && numericColumns.length === 1) {
      type = 'pie';
      description = 'Small dataset with single metric - pie chart works well';
    }

    // Suggest metric card for single row single value
    if (results.length === 1 && numericColumns.length >= 1) {
      type = 'metric';
      description = 'Single value detected - Metric Card recommended';
    }

    return {
      type,
      xAxis: xCol?.value || '',
      yAxis: yCol?.value ? [yCol.value] : [],
      description,
    };
  }, [results, availableColumns, categoricalColumns, numericColumns]);

  const hasData = results && results.length > 0 && availableColumns.length > 0;

  // Update config helper
  const updateConfig = (updates: Partial<VisualizationConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  // Helper to handle color scheme selection
  const handleColorSchemeChange = (schemeId: string) => {
    const scheme = COLOR_SCHEMES.find(s => s.id === schemeId);
    if (scheme) {
      updateConfig({ colors: scheme.colors });
    }
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Section Tabs */}
      <div className="px-4 pt-4">
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as 'data' | 'display')}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
            <TabsTrigger value="display" className="text-xs">Display</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Analytics Section */}
        {hasData && activeSection === 'analytics' && (
          <div className="space-y-6">
            {/* Trendline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold">Trendline</Label>
                </div>
                <Switch
                  checked={config.trendLine?.enabled || false}
                  onCheckedChange={(checked) => updateConfig({ trendLine: { ...config.trendLine, enabled: checked, type: 'linear' } })}
                  className="scale-75"
                />
              </div>
              {config.trendLine?.enabled && (
                <div className="pl-6 space-y-2">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={config.trendLine.type}
                    onValueChange={(val: any) => updateConfig({ trendLine: { ...config.trendLine!, type: val } })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear Regression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Reference Lines */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center space-x-2 mb-2">
                <AlignLeft className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Reference Lines</Label>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    const current = config.referenceLines || [];
                    updateConfig({
                      referenceLines: [...current, { id: Date.now().toString(), type: 'average', axis: 'y' }]
                    });
                  }}
                >
                  + Add Line
                </Button>

                {config.referenceLines?.map((line, idx) => (
                  <div key={line.id} className="p-2 border rounded-md space-y-2 bg-muted/40">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold">Line {idx + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={() => {
                          const next = [...(config.referenceLines || [])];
                          next.splice(idx, 1);
                          updateConfig({ referenceLines: next });
                        }}
                      >
                        <span className="text-xs">×</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={line.type}
                        onValueChange={(val: any) => {
                          const next = [...(config.referenceLines || [])];
                          next[idx] = { ...line, type: val };
                          updateConfig({ referenceLines: next });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="max">Max</SelectItem>
                          <SelectItem value="min">Min</SelectItem>
                          <SelectItem value="constant">Constant Value</SelectItem>
                        </SelectContent>
                      </Select>

                      {line.type === 'constant' && (
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          placeholder="Value"
                          value={line.value || ''}
                          onChange={(e) => {
                            const next = [...(config.referenceLines || [])];
                            next[idx] = { ...line, value: Number(e.target.value) };
                            updateConfig({ referenceLines: next });
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conditional Formatting */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center space-x-2 mb-2">
                <Palette className="w-4 h-4 text-primary" />
                <Label className="text-sm font-semibold">Conditional Formatting</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  const current = config.conditionalFormatting || [];
                  // Default rule
                  updateConfig({
                    conditionalFormatting: [...current, {
                      id: Date.now().toString(),
                      column: '',
                      operator: '>',
                      value: 0,
                      color: '#ef4444'
                    }]
                  });
                }}
              >
                + Add Rule
              </Button>
              {config.conditionalFormatting?.map((rule, idx) => (
                <div key={rule.id} className="p-2 border rounded-md space-y-2 bg-muted/40">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold">Rule {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => {
                        const next = [...(config.conditionalFormatting || [])];
                        next.splice(idx, 1);
                        updateConfig({ conditionalFormatting: next });
                      }}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Select
                      value={rule.operator}
                      onValueChange={(val: any) => {
                        const next = [...(config.conditionalFormatting || [])];
                        next[idx] = { ...rule, operator: val };
                        updateConfig({ conditionalFormatting: next });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">Greater Than</SelectItem>
                        <SelectItem value="<">Less Than</SelectItem>
                        <SelectItem value="==">Equal To</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        className="h-7 text-xs flex-1"
                        placeholder="Value"
                        value={rule.value}
                        onChange={(e) => {
                          const next = [...(config.conditionalFormatting || [])];
                          next[idx] = { ...rule, value: Number(e.target.value) };
                          updateConfig({ conditionalFormatting: next });
                        }}
                      />
                      <input
                        type="color"
                        className="h-7 w-8"
                        value={rule.color}
                        onChange={(e) => {
                          const next = [...(config.conditionalFormatting || [])];
                          next[idx] = { ...rule, color: e.target.value };
                          updateConfig({ conditionalFormatting: next });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {/* Closing of Conditional Formatting Section */}
            </div>

            {/* Annotations */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold">Annotations</Label>
                </div>
                <Switch
                  checked={config.customOptions?.annotationMode || false}
                  onCheckedChange={(checked) => updateConfig({ customOptions: { ...config.customOptions, annotationMode: checked } })}
                  className="scale-75"
                />
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {config.customOptions?.annotationMode ? 'Click on chart points to add notes' : 'Enable to add notes'}
              </div>

              <div className="space-y-2">
                {config.annotations?.map((ann, idx) => (
                  <div key={ann.id} className="p-2 border rounded-md bg-muted/40 flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium">{ann.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ann.xValue}: {ann.yValue}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 flex-shrink-0"
                      onClick={() => {
                        const next = [...(config.annotations || [])];
                        next.splice(idx, 1);
                        updateConfig({ annotations: next });
                      }}
                    >
                      <span className="text-xs">×</span>
                    </Button>
                  </div>
                ))}
                {!config.annotations?.length && config.customOptions?.annotationMode && (
                  <div className="p-3 border border-dashed rounded text-center text-xs text-muted-foreground">
                    Click chart data points to annotate
                  </div>
                )}
              </div>
            </div>
            {/* End of Annotations List */}

            {/* Forecasting */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold">Forecasting</Label>
                </div>
                <Switch
                  checked={config.forecast?.enabled || false}
                  onCheckedChange={(checked) => updateConfig({
                    forecast: {
                      enabled: checked,
                      periods: config.forecast?.periods || 30,
                      model: config.forecast?.model || 'linear'
                    }
                  })}
                  className="scale-75"
                />
              </div>

              {config.forecast?.enabled && (
                <div className="pl-6 space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Model</Label>
                    <Select
                      value={config.forecast.model}
                      onValueChange={(val: any) => updateConfig({
                        forecast: { ...config.forecast!, model: val }
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">Linear Regression</SelectItem>
                        <SelectItem value="exponential_smoothing">Holt-Winters (Seasonal)</SelectItem>
                        <SelectItem value="decomposition">Decomposition (Trend+Season)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs">Horizon (Periods)</Label>
                      <span className="text-xs text-muted-foreground">{config.forecast.periods}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                      value={config.forecast.periods}
                      onChange={(e) => updateConfig({
                        forecast: { ...config.forecast!, periods: Number(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Anomaly Detection */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold">Anomaly Detection</Label>
                </div>
                <Switch
                  checked={config.anomaly?.enabled || false}
                  onCheckedChange={(checked) => updateConfig({ anomaly: { enabled: checked, method: 'iqr', sensitivity: 1.5 } })}
                  className="scale-75"
                />
              </div>
              {config.anomaly?.enabled && (
                <div className="pl-6 space-y-2">
                  <Select
                    value={config.anomaly.method}
                    onValueChange={(val: any) => updateConfig({ anomaly: { ...config.anomaly!, method: val } })}
                  >
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iqr">IQR (Robust)</SelectItem>
                      <SelectItem value="z-score">Z-Score (Normal Dist)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Clustering */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Boxes className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold">Clustering</Label>
                </div>
                <Switch
                  checked={config.clustering?.enabled || false}
                  onCheckedChange={(checked) => updateConfig({ clustering: { enabled: checked, k: 3, features: config.yAxis || [] } })}
                  className="scale-75"
                />
              </div>
              {config.clustering?.enabled && (
                <div className="pl-6 space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs">Clusters (K)</Label>
                    <span className="text-xs text-muted-foreground">{config.clustering.k}</span>
                  </div>
                  <input type="range" min="2" max="10" step="1"
                    className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    value={config.clustering.k}
                    onChange={(e) => updateConfig({ clustering: { ...config.clustering!, k: Number(e.target.value) } })}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        {!hasData && (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <BarChart3 className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No Data</p>
              <p className="text-xs text-muted-foreground">
                Execute a query to configure visualizations
              </p>
            </div>
          </div>
        )}

        {hasData && activeSection === 'data' && (
          <>
            {/* AI Suggestions */}
            {showSuggestions && aiSuggestion && (
              <Card className="p-3 border-primary/30 bg-primary/5">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-foreground">AI Suggestion</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{aiSuggestion.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs bg-transparent h-7"
                  onClick={() => {
                    updateConfig({
                      type: aiSuggestion.type,
                      xAxis: aiSuggestion.xAxis,
                      yAxis: aiSuggestion.yAxis,
                    });
                    setShowSuggestions(false);
                  }}
                >
                  Apply Suggestion
                </Button>
              </Card>
            )}

            {/* Chart Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Chart Type</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {CHART_TYPES.map((chart) => {
                  const IconComponent = chart.icon;
                  return (
                    <Button
                      key={chart.id}
                      variant={config.type === chart.id ? 'default' : 'outline'}
                      size="sm"
                      className="gap-1.5 h-auto py-2 px-2"
                      onClick={() => updateConfig({ type: chart.id as any })}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span className="text-xs">{chart.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Config inputs based on type */}
            <div className="space-y-4">
              {/* Common X-Axis (except for Metric/Gauge/Progress sometimes) */}
              {!['metric'].includes(config.type!) && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    {config.type === 'pie' ? 'Label Column' : 'X-Axis'}
                  </Label>
                  <Select
                    value={config.xAxis}
                    onValueChange={(value) => updateConfig({ xAxis: value })}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col.value} value={col.value}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Y-Axis / Value Column */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  {['pie', 'funnel', 'metric', 'gauge', 'progress'].includes(config.type!)
                    ? 'Value Column'
                    : 'Y-Axis'}
                </Label>
                <Select
                  value={config.yAxis?.[0] || ''}
                  onValueChange={(value) => updateConfig({ yAxis: [value] })}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map((col) => (
                      <SelectItem key={col.value} value={col.value}>
                        <span className="flex items-center gap-2">
                          {numericColumns.some((nc) => nc.value === col.value) && (
                            <Hash className="w-3 h-3 text-muted-foreground" />
                          )}
                          {col.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Special Configs for Sankey */}
                {config.type === 'sankey' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-border">
                    <Label className="text-xs font-semibold text-foreground">Target Column</Label>
                    <Select
                      value={config.seriesBreakout || ''}
                      onValueChange={(val) => updateConfig({ seriesBreakout: val })}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select target column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Auto-detect</SelectItem>
                        {categoricalColumns.map((col) => (
                          <SelectItem key={col.value} value={col.value}>
                            {col.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Special Configs for Heatmap */}
                {config.type === 'heatmap' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-border">
                    <Label className="text-xs font-semibold text-foreground">Y-Axis Dimension</Label>
                    <Select
                      value={config.seriesBreakout || ''}
                      onValueChange={(val) => updateConfig({ seriesBreakout: val })}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select Y dimension..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categoricalColumns.map((col) => (
                          <SelectItem key={col.value} value={col.value}>
                            {col.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Secondary Y-Axis for Combo */}
              {config.type === 'combo' && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Secondary Y-Axis (Line)</Label>
                  <Select
                    value={config.yAxis?.[1] || ''}
                    onValueChange={(value) => {
                      const currentY = config.yAxis || [];
                      updateConfig({ yAxis: [currentY[0], value] });
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select second column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((col) => (
                        <SelectItem key={col.value} value={col.value}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Target Value for Progress/Gauge */}
              {['progress', 'gauge'].includes(config.type!) && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Target / Max Value</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="100"
                      className="h-8 text-xs"
                      value={config.targetValue || ''}
                      onChange={(e) => updateConfig({ targetValue: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              {/* Toggle Trend for Metric */}
              {config.type === 'metric' && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Show Trend</Label>
                  <Switch
                    checked={config.showTrend}
                    onCheckedChange={(checked) => updateConfig({ showTrend: checked })}
                    className="scale-75 origin-right"
                  />
                </div>
              )}
            </div>

            {/* Axis Formatting */}
            <div className="space-y-4 pt-3 border-t border-border">
              <Label className="text-xs font-semibold text-foreground">Axis Formatting</Label>

              <div className="space-y-2">
                <Label className="text-xs font-normal text-muted-foreground">Y-Axis Format</Label>
                <Select
                  value={config.yAxisFormat || 'number'}
                  onValueChange={(value: any) => updateConfig({ yAxisFormat: value })}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select format..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number (1.2k)</SelectItem>
                    <SelectItem value="currency">Currency ($1.2k)</SelectItem>
                    <SelectItem value="percent">Percentage (50%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-normal text-muted-foreground">Y-Axis Label Override</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="e.g. Total Revenue"
                  value={config.yAxisLabel || ''}
                  onChange={(e) => updateConfig({ yAxisLabel: e.target.value })}
                />
              </div>
            </div>

            {/* Data Summary */}
            <div className="space-y-2 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-foreground">Data Summary</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Rows</span>
                  <span className="text-foreground font-medium">{results.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Columns</span>
                  <span className="text-foreground font-medium">{availableColumns.length}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {hasData && activeSection === 'display' && (
          <>
            {/* Color Scheme */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Palette className="w-3.5 h-3.5" />
                Color Scheme
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                {COLOR_SCHEMES.map((scheme) => (
                  <Button
                    key={scheme.id}
                    variant={'outline'}
                    size="sm"
                    className="h-8 gap-2 justify-start"
                    onClick={() => handleColorSchemeChange(scheme.id)}
                  >
                    <div className="flex gap-0.5">
                      {scheme.colors.map((color, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs">{scheme.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Legend Options could go here */}
          </>
        )}
      </div>
    </div >
  );
}
