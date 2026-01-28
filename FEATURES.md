# InsightEngine AI - Complete Feature Overview

## 🎯 Core Features

### 1. Dual-Engine Workspace (`/`)
The main query editor with seamless switching between AI and SQL modes.

**Features:**
- **AI Prompt Mode**: Write natural language queries
  - Example: "Show top 5 customers by sales in Q4"
  - AI automatically generates optimized SQL
  - Supports context-aware queries using Kamus Data
  
- **SQL Editor Mode**: Write SQL manually
  - Syntax highlighting and auto-completion
  - Real-time schema reference
  - Query validation and safety checks

**Components:**
- `DualEngineEditor` - Main input interface
- `ResultsPanel` - Display query results in table format
- `ChartVisualization` - Interactive charts (Bar, Line, Pie, Scatter)
- `VisualizationSidebar` - Configure chart axes and style

### 2. Smart Visualizations
Automatically suggest and configure the best chart type for your data.

**Chart Types:**
- **Bar Chart**: Compare values across categories
- **Line Chart**: Show trends over time
- **Pie Chart**: Display proportions and percentages
- **Scatter Plot**: Identify correlations

**AI Features:**
- Automatic chart type suggestion based on data types
- Intelligent axis mapping recommendations
- Series breakout for multi-dimensional analysis
- Real-time preview as you adjust settings

### 3. Kamus Data - Metadata Management (`/metadata`)
Configure business meanings and descriptions for database columns.

**Features:**
- **Auto-Guessing**: AI generates initial metadata from sample data
- **Table Aliases**: Friendly names for technical table names
- **Column Descriptions**: Business-friendly explanations
- **Contextual Tagging**:
  - `PK` - Primary Key
  - `FK` - Foreign Key
  - `PII` - Personally Identifiable Information
  - `Currency` - Monetary values
  - `Temporal` - Date/time fields

**Benefits:**
- Improves AI prompt understanding
- Prevents hallucinations in SQL generation
- Helps team members understand data structure
- Enables business glossary maintenance

### 4. Query History & Management
Track, reuse, and manage previously executed queries.

**Features:**
- **Query History Panel**: Recent queries with results count
- **Quick Rerun**: One-click to re-execute queries
- **Copy Query**: Copy SQL to clipboard
- **Type Indicators**: AI vs. SQL query labels
- **Performance Metrics**: Execution time and row count

### 5. AI Reasoning Transparency
Understand how AI generates SQL through step-by-step breakdown.

**Reasoning Steps:**
1. **Context Retrieval**: Identifies relevant tables from Kamus Data
2. **Semantic Mapping**: Maps natural language terms to SQL columns
3. **SQL Generation**: Generates the actual SQL query
4. **Validation**: Checks syntax, tables, columns, and safety

**Validation Checks:**
- ✅ SQL syntax validity
- ✅ Referenced tables/columns exist
- ✅ No dangerous operations (DROP, DELETE)
- ✅ Performance considerations (LIMIT clause)

**User Feedback:**
- 👍 Correct - Helps train AI
- 👎 Incorrect - Provides negative feedback
- Edit - Manually adjust generated SQL

### 6. Schema Browser (`/` sidebar)
Real-time database schema explorer integrated into the editor.

**Features:**
- **Table Overview**: Quick view of all tables
- **Column Details**: Type, description, and tags
- **Expandable Sections**: Click to expand/collapse table details
- **Tag Color Coding**: Visual indicators for column types
- **Quick Reference**: Help text for column selection

### 7. Database Configuration (`/settings`)
Connect and configure database sources.

**Supported Databases:**
- PostgreSQL ✓ (Recommended)
- MySQL / MariaDB ✓
- BigQuery ✓
- Snowflake ✓
- Redshift ✓
- DuckDB ✓

**Configuration Options:**
- Connection string management
- Connection testing
- Auto schema discovery
- Scheduled schema sync

### 8. AI Provider Management (`/settings`)
Configure and manage AI providers for SQL generation.

**Supported Providers:**
- **OpenAI** (GPT-4, GPT-4 Turbo)
- **Google Gemini**
- **Anthropic Claude**
- **OpenRouter** (Access 100+ models)
- **Groq** (Fast inference)

**Features:**
- **Multi-Provider Support**: Use different models for different tasks
- **API Key Management**: Securely store credentials
- **Connection Testing**: Verify provider connectivity
- **Model Selection**: Choose specific model versions
- **Fallback Logic**: Automatic fallback if provider fails

### 9. Query Templates (`/templates`)
Pre-built SQL query templates for common analytics tasks.

**Built-in Templates:**
- Top Customers by Revenue
- Monthly Sales Trend
- Product Performance Analysis
- Customer Churn Analysis
- Geographic Revenue Breakdown

**Features:**
- **Search & Filter**: Find templates by name or category
- **Category Grouping**: Organized by use case
- **Usage Tracking**: See how many times each template is used
- **Favorite Templates**: Star templates for quick access
- **Community Templates**: Share templates with team members
- **One-Click Usage**: Load templates directly into editor

### 10. Saved Queries (`/saved-queries`)
Save, organize, and manage your analysis queries.

**Features:**
- **Save Queries**: Store analysis with description
- **Search & Filter**: Find queries by name, tag, or owner
- **Sorting Options**: By recency, popularity, or name
- **Sharing**: Share queries with team members
- **View Count**: Track query popularity
- **Scheduled Runs**: Schedule queries to run automatically
- **Audit Trail**: See who created/modified queries

### 11. Dashboard (`/dashboard`)
Overview and quick navigation to all features.

**Dashboard Sections:**
- **Stats Cards**:
  - Total queries executed
  - Connected tables
  - Team members
  - Average query time

- **Recent Queries**: Last 3 executed queries
- **Feature Cards**: Quick links to all main sections
- **Quick Actions**: Common workflows

### 12. Setup Wizard (`/onboarding`)
3-step guided setup for new users.

**Steps:**
1. **Database Connection**
   - Select database type
   - Enter connection credentials
   - Test connection
   - Auto-discover schema

2. **AI Provider Configuration**
   - Choose preferred AI provider
   - Enter API key
   - Test provider connectivity
   - Select model version

3. **Metadata Auto-Guessing**
   - AI analyzes sample data
   - Generates table/column descriptions
   - Preview auto-generated metadata
   - Apply or manually edit

## 🔒 Security Features

### Authentication & Authorization
- User account management
- Role-based access control
- Team/organization isolation

### Data Protection
- **Encryption**: AES-256 for stored credentials
- **Read-Only Access**: Database service account has read-only permissions
- **Query Validation**: Prevents DROP, DELETE, TRUNCATE operations
- **SSL/TLS**: Secure database connections

### Row-Level Security (RLS)
- Automatic filtering by organization_id
- Prevents cross-organization data leakage
- Configurable RLS policies

### Audit & Compliance
- **Query Logging**: Every query execution is logged
- **User Actions**: Track who did what and when
- **Compliance Reports**: Generate audit reports

## 🛠️ Developer Features

### Query API Integration
- RESTful API for programmatic query execution
- Results available in JSON format
- Webhook support for async results

### Export Options
- CSV format
- JSON format
- Excel spreadsheet
- PDF reports (coming soon)

### Scheduled Queries
- Run queries on schedule (hourly, daily, weekly)
- Send results to email or Slack
- Automatic chart generation

### Custom Dashboards
- Save chart configurations
- Combine multiple queries
- Real-time auto-refresh

## 📊 Advanced Analytics

### Query Optimization
- Automatic EXPLAIN PLAN analysis
- Performance suggestions
- Index recommendations

### Data Profiling
- Column statistics
- Data distribution analysis
- Outlier detection

### Trend Analysis
- Year-over-year comparisons
- Seasonal patterns
- Moving averages

## 🎨 Customization

### Theme Support
- Light mode
- Dark mode
- Auto (system preference)

### Custom Branding
- Logo/wordmark customization
- Color scheme configuration
- Custom domain support (Enterprise)

## 📈 Limitations & Quotas

### Free Tier
- Up to 100 queries/month
- Single database connection
- 1 team member
- Basic AI (limited calls)

### Pro Tier
- Unlimited queries
- Up to 5 database connections
- Up to 5 team members
- Priority AI processing

### Enterprise
- Everything in Pro
- Custom integrations
- Dedicated support
- SLA guarantee

## 🔮 Upcoming Features

### In Development
- Natural language export (generate reports in English)
- ML-powered anomaly detection
- Advanced forecasting
- Collaborative editing
- Version history

### Planned
- Mobile native app
- Real-time data streaming
- Custom visualizations (Chart.js)
- Slack integration
- GitHub action support

---

## Quick Navigation Guide

| Page | URL | Purpose |
|------|-----|---------|
| Query Editor | `/` | Main workspace for writing/executing queries |
| Dashboard | `/dashboard` | Overview and quick navigation |
| Metadata Editor | `/metadata` | Configure Kamus Data |
| Settings | `/settings` | Database and AI provider config |
| Query Templates | `/templates` | Pre-built analysis templates |
| Saved Queries | `/saved-queries` | Manage your saved analysis |
| Onboarding | `/onboarding` | Setup wizard for new users |

## 🆘 Help & Support

- **Documentation**: Full docs and tutorials
- **Community**: Discussion forum
- **Support**: support@insightengine.ai
- **Status**: status.insightengine.ai
