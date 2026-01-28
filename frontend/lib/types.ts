// User & Authentication
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Collections (like Metabase)
export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  userId: string;
  parentId?: string;
  isPublic: boolean;
  queries?: SavedQuery[];
  dashboards?: Dashboard[];
  children?: Collection[];
  createdAt: Date;
  updatedAt: Date;
}

// Database Connections
export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgres' | 'mysql' | 'sqlite' | 'snowflake' | 'bigquery';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  isActive: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Tables & Schema
export interface TableSchema {
  id: string;
  name: string;
  connectionId: string;
  columns: ColumnSchema[];
  rowCount?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  description?: string;
}

// Saved Query / Question (like Metabase)
export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  sql: string;
  aiPrompt?: string;
  connectionId: string;
  collectionId: string;
  userId: string;
  visualizationConfig?: VisualizationConfig;
  tags?: string[];
  views: number;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
}

// Story & Pages (Power BI/Tableau style)
export interface Story {
  id: string;
  name: string;
  description?: string;
  userId: string;
  collectionId: string;
  pages: StoryPage[];
  filters: StoryFilter[];
  defaultFilters?: Record<string, any>;
  theme?: StoryTheme;
  isPublished: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryPage {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  narrative?: string;
  order: number;
  layout: 'single' | 'double' | 'triple' | 'custom';
  cards: StoryCard[];
  filters?: StoryFilter[];
}

export interface StoryCard {
  id: string;
  title: string;
  description?: string;
  type: 'visualization' | 'metric' | 'text' | 'image';
  queryId?: string;
  visualizationConfig?: VisualizationConfig;
  position?: { x: number; y: number; w: number; h: number };
  drilldownTargetPage?: string;
}

export interface StoryFilter {
  id: string;
  name: string;
  column: string;
  type: 'select' | 'multi-select' | 'range' | 'date-range' | 'search';
  values: any[];
  selectedValue?: any;
  defaultValue?: any;
}

export interface StoryTheme {
  primaryColor?: string;
  backgroundColor?: string;
  font?: string;
  accentColor?: string;
}

// Analytics & Enhancements
export type VisualizationType =
  | 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'combo'
  | 'funnel' | 'metric' | 'progress' | 'gauge' | 'table'
  | 'treemap' | 'sunburst' | 'sankey' | 'heatmap' | 'radar' | 'waterfall' | 'small-multiples';

export interface Annotation {
  id: string;
  label: string;
  description?: string;
  xValue: string | number;
  yValue: number;
  color?: string;
}

export interface ReferenceLine {
  id: string;
  label?: string;
  type: 'constant' | 'average' | 'median' | 'max' | 'min';
  value?: number; // Used if type is 'constant'
  axis: 'x' | 'y';
  color?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface ConditionalFormattingRule {
  id: string;
  column: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | 'between';
  value: number;
  value2?: number; // For 'between'
  color: string;
}

// Visualization Configuration
export interface VisualizationConfig {
  type: VisualizationType;
  xAxis: string;
  yAxis: string[];
  title?: string;
  colors?: string[];
  yAxisFormat?: 'number' | 'currency' | 'percent';
  yAxisLabel?: string;
  seriesBreakout?: string;
  targetValue?: number;
  showTrend?: boolean; // Legacy simple trend
  customOptions?: Record<string, any>;

  // New Analytics Features
  referenceLines?: ReferenceLine[];
  conditionalFormatting?: ConditionalFormattingRule[];
  trendLine?: {
    enabled: boolean;
    type: 'linear' | 'movingAverage';
    period?: number; // For moving average
    color?: string;
  };
  annotations?: Annotation[];
  forecast?: {
    enabled: boolean;
    periods: number;
    model: 'linear' | 'exponential_smoothing' | 'decomposition';
    confidenceLevel?: number;
  };
  anomaly?: {
    enabled: boolean;
    method: 'z-score' | 'iqr';
    sensitivity: number;
  };
  clustering?: {
    enabled: boolean;
    k: number;
    features: string[];
  };

  // Type-specific configs
  treeLayout?: 'squarified' | 'slice' | 'dice';
  mapRegion?: 'world' | 'usa' | 'europe';
  sankeyOrient?: 'horizontal' | 'vertical';
}

// Query Execution Result
export interface QueryResult {
  id: string;
  queryId: string;
  status: 'pending' | 'success' | 'error';
  data?: Record<string, any>[];
  columns?: string[];
  rowCount: number;
  executionTime: number;
  error?: string;
  aiInsights?: string;
  createdAt: Date;
}

// Dashboard Filter
export interface DashboardFilter {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  key: string; // The {{variable}} name to replace in SQL
  defaultValue?: any;
  options?: string[]; // For select type
}

// Dashboard
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  collectionId: string;
  userId: string;
  cards: DashboardCard[];
  filters?: DashboardFilter[];
  isPublic: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AggregationConfig {
  connectionId: string;
  table: string;
  dimensions: (string | { column: string; timeBucket?: 'day' | 'week' | 'month' | 'year' })[];
  metrics: { column: string; type: 'count' | 'sum' | 'avg' | 'min' | 'max'; label?: string }[];
  filters?: { column: string; operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains'; value: any }[];
  limit?: number;
}

export interface DashboardCard {
  id: string;
  dashboardId: string;
  queryId?: string; // Optional: If linked to a query
  query?: SavedQuery; // Included by Prisma relation
  type: 'visualization' | 'text' | 'ai-text';
  title: string;
  description?: string;
  textContent?: string; // For text cards
  aggregationConfig?: AggregationConfig;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  visualizationConfig?: VisualizationConfig;
}

// Query History
export interface QueryHistory {
  id: string;
  userId: string;
  connectionId: string;
  sql: string;
  aiPrompt?: string;
  status: 'success' | 'error';
  error?: string;
  executionTime: number;
  rowsReturned: number;
  createdAt: Date;
}

// Share & Permissions
export interface SharedQuery {
  id: string;
  queryId: string;
  sharedBy: string;
  sharedWith: string;
  permission: 'view' | 'edit' | 'admin';
  createdAt: Date;
  expiresAt?: Date;
}

export interface SharedDashboard {
  id: string;
  dashboardId: string;
  sharedBy: string;
  sharedWith: string;
  permission: 'view' | 'edit' | 'admin';
  createdAt: Date;
  expiresAt?: Date;
}

// Alert & Notification
export interface Alert {
  id: string;
  queryId: string;
  userId: string;
  condition: string;
  threshold: number;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}
