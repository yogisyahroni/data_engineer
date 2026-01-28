InsightEngine Enterprise Roadmap
Goal: Achieve 10/10 parity with best-in-class BI tools.

Phase 1: Foundation (Weeks 1-4)
1.1 Data Connectors (100+ Sources)
[NEW] Connector Framework (Adapter Pattern)
[NEW] Cloud DBs: Snowflake, BigQuery, Redshift, Databricks
[NEW] Files: CSV, Excel, JSON, Parquet
[NEW] APIs: REST, GraphQL, Salesforce, HubSpot
[NEW] Connection Pool Manager
1.2 Semantic Layer UI
[NEW] ModelEditor component (Power BI-style)
[NEW] Virtual Relationship CRUD UI
[NEW] Calculated Columns/Measures (DAX-like)
[NEW] Column Aliasing & Hiding
[MODIFY]
SemanticLayerService
 → Prisma-backed
1.3 RBAC & Auth
[NEW] Workspaces (tenant isolation)
[NEW] Roles: Viewer, Editor, Admin, Owner
[NEW] Permission middleware
[MODIFY] Auth → Clerk/Supabase Auth
Phase 2: Query & Visualization (Weeks 5-8)
2.1 No-Code Query Builder
[NEW] QueryBuilderPanel (Metabase-style)
[NEW] Table/Column Picker UI
[NEW] Aggregation Selector (Count, Sum, Avg...)
[NEW] Filter Builder (AND/OR logic)
[NEW] Sort/Limit Controls
2.2 Chart Types (40+)
[NEW] Geo Maps (Mapbox/Leaflet)
[NEW] Treemap, Sunburst, Sankey
[NEW] Heatmap, Radar, Waterfall
[NEW] Small Multiples (Tableau-style)
[MODIFY] ECharts → extend with custom types
2.3 Advanced Chart Features
[NEW] Trendlines, Reference Lines
[NEW] Conditional Formatting
[NEW] Annotations
[NEW] Dual Axis Support
Phase 3: Analytics & Intelligence (Weeks 9-12)
3.1 Forecasting/Predictive (Full)
[MODIFY] Extend
ForecastingService
[NEW] ARIMA, Exponential Smoothing
[NEW] Prophet Integration (via API)
[NEW] Anomaly Detection
[NEW] Clustering (K-Means)
3.2 Global Filters (Full Cross-Filtering)
[MODIFY]
use-cross-filter.ts
 → bidirectional
[NEW] Filter Context Propagation
[NEW] Slicer Sync (Power BI-style)
[NEW] Filter Hierarchy (drill-down paths)
3.3 RLS (Row-Level Security)
[NEW] RLS Policy Editor UI
[NEW] User→Segment Mapping
[NEW] Query Injection Middleware
[NEW] Audit Trail for RLS
Phase 4: Enterprise Features (Weeks 13-20)
4.1 Alerts & Subscriptions
[MODIFY]
AlertService
 → Real Email (Resend/SendGrid)
[NEW] Alert Rule Builder UI
[NEW] Subscription Scheduler (Cron)
[NEW] Delivery Channels: Email, Slack, Webhook
4.2 Scheduling / ETL
[NEW] Dataflow Editor (Visual ETL)
[NEW] Transformations: Filter, Join, Aggregate
[NEW] Scheduled Refresh
[NEW] Incremental Load
4.3 Public Sharing & Embedding
[NEW] Public Dashboard Links (UUID tokens)
[NEW] iFrame Embed Code Generator
[NEW] Embedding SDK (React/JS)
[NEW] Embed Auth (Token-based)
4.4 Collaboration
[NEW] Comments on Cards/Dashboards
[NEW] @Mentions & Notifications
[NEW] Activity Feed
4.5 Version Control
[NEW] Query Revision History
[NEW] Dashboard Snapshots
[NEW] Diff Viewer
4.6 API for Automation
[NEW] REST API Docs (Swagger/OpenAPI)
[NEW] API Keys Management
[NEW] Batch Query Execution
[NEW] Webhook Triggers
Scoring Projection
Feature Current After Phase 1 After Phase 4
Data Sources 3 50+ 100+
Query Builder 0 7 10
Chart Types 10 25 40+
Semantic Layer 2 8 10
Forecasting 3 6 10
Filters 5 8 10
RLS 1 5 10
Alerts 2 7 10
Sharing/Embed 1 5 10
Collaboration 0 3 10
Version Control 0 2 10
RBAC 2 7 10
Overall 2.5/10 6/10 10/10
Priority Ranking (Impact vs Effort)
Query Builder (No-Code) — Unlocks non-dev users
Semantic Layer UI — Core of any BI tool
RBAC — Required for enterprise sales
Alerts (Real Email) — Quick win, high value
More Data Sources — Market expansion
Chart Types — Visual appeal
ETL/Scheduling — Data freshness
Embedding SDK — B2B SaaS revenue
Collaboration — Stickiness/retention
Version Control — Governance/compliance
