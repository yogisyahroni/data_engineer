# InsightEngine AI - Production Architecture & Implementation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Backend Architecture](#backend-architecture)
5. [API Endpoints](#api-endpoints)
6. [Data Flow & Workflow](#data-flow--workflow)
7. [Authentication & Authorization](#authentication--authorization)
8. [AI Integration (Query Builder Only)](#ai-integration-query-builder-only)
9. [Deployment & Scaling](#deployment--scaling)
10. [Development Roadmap](#development-roadmap)

---

## System Overview

InsightEngine AI is a **Story-based Analytics Platform** (like Power BI + Tableau) with AI-powered natural language query generation. Key differentiators:

- **Multi-Database Support**: Connect multiple data sources (PostgreSQL, MySQL, MongoDB, Snowflake, BigQuery)
- **Story-Based Reporting**: Multi-page reports with narratives, filters, and drill-down capabilities
- **AI Query Builder**: Convert natural language prompts to SQL queries (Query Editor only)
- **Manual Visualizations**: Users manually create and configure charts (NOT AI-generated)
- **Team Collaboration**: Share stories, collections, and queries with permission-based access
- **Real-time Caching**: Query results caching with TTL for performance

### User Journey
```
1. User connects database (Settings)
2. User writes natural language query OR SQL in Query Editor
3. AI converts natural language → SQL (optional)
4. Query executes against selected database
5. Results displayed in table/chart format
6. User saves as "Story Card" 
7. User creates "Story Page" with multiple cards
8. User publishes "Story" with narrative + filters
9. Team members access published stories
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Framework**: React 19 with shadcn/ui
- **Styling**: Tailwind CSS v4
- **State Management**: React Context + Custom Hooks
- **Data Fetching**: SWR for client-side caching
- **Visualization**: Recharts for charts
- **Type Safety**: TypeScript

### Backend
- **Runtime**: Node.js (Express or FastAPI recommended)
- **Language Options**: 
  - TypeScript/Node.js (for consistency with frontend)
  - Python FastAPI (for AI/ML features)
  - Go (for high-performance services)
- **ORM**: Prisma or SQLAlchemy
- **Database**: PostgreSQL (primary), support for multi-database connections
- **Queue**: Redis for background jobs
- **Cache**: Redis for query result caching
- **AI/LLM**: OpenAI API (or other LLM provider)

### Infrastructure
- **Hosting**: Vercel (frontend), AWS/GCP/DigitalOcean (backend)
- **Database**: Managed PostgreSQL (RDS, CloudSQL, or self-hosted)
- **Storage**: S3 for exported data
- **Monitoring**: Sentry for error tracking, DataDog/New Relic for APM
- **Logging**: CloudWatch/ELK Stack

---

## Database Schema

### Core Tables

#### 1. users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  role ENUM('admin', 'analyst', 'viewer') DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  plan ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role ENUM('owner', 'admin', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);
```

#### 3. databases
```sql
CREATE TABLE databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type ENUM('postgresql', 'mysql', 'mongodb', 'snowflake', 'bigquery') NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  database_name VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  password_encrypted VARCHAR(500), -- Use encryption at rest
  ssl_enabled BOOLEAN DEFAULT false,
  status ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
  last_tested_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_databases_org_id ON databases(org_id);
```

#### 4. collections
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_collections_org_id ON collections(org_id);
CREATE INDEX idx_collections_parent_id ON collections(parent_id);
```

#### 5. saved_queries
```sql
CREATE TABLE saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  database_id UUID NOT NULL REFERENCES databases(id),
  collection_id UUID REFERENCES collections(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sql_query TEXT NOT NULL,
  ai_prompt TEXT, -- Natural language that was converted
  query_type ENUM('sql', 'ai_generated') DEFAULT 'sql',
  estimated_rows INTEGER,
  execution_time_ms INTEGER,
  created_by UUID REFERENCES users(id),
  last_executed_at TIMESTAMP,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_saved_queries_org_id ON saved_queries(org_id);
CREATE INDEX idx_saved_queries_collection_id ON saved_queries(collection_id);
CREATE INDEX idx_saved_queries_database_id ON saved_queries(database_id);
```

#### 6. query_results (Cached Results)
```sql
CREATE TABLE query_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_query_id UUID REFERENCES saved_queries(id) ON DELETE CASCADE,
  result_data JSONB NOT NULL, -- Store actual data
  column_metadata JSONB NOT NULL, -- Column types, names
  row_count INTEGER NOT NULL,
  total_bytes INTEGER,
  filters_applied JSONB, -- Store filter values used
  ttl_seconds INTEGER DEFAULT 300, -- 5 minutes default
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_query_results_saved_query_id ON query_results(saved_query_id);
CREATE INDEX idx_query_results_expires_at ON query_results(expires_at);
```

#### 7. stories
```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  narrative TEXT, -- Overall story description
  created_by UUID REFERENCES users(id),
  status ENUM('draft', 'published') DEFAULT 'draft',
  is_public BOOLEAN DEFAULT false,
  theme JSONB DEFAULT '{}', -- {primaryColor, backgroundColor, font}
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stories_org_id ON stories(org_id);
CREATE INDEX idx_stories_collection_id ON stories(collection_id);
CREATE INDEX idx_stories_created_by ON stories(created_by);
```

#### 8. story_pages
```sql
CREATE TABLE story_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  narrative TEXT, -- Context/explanation for this page
  page_order INTEGER NOT NULL,
  layout ENUM('single', 'double', 'triple', 'custom') DEFAULT 'double',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(story_id, page_order)
);

CREATE INDEX idx_story_pages_story_id ON story_pages(story_id);
```

#### 9. story_cards
```sql
CREATE TABLE story_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES story_pages(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  card_type ENUM('visualization', 'metric', 'text', 'image') DEFAULT 'visualization',
  saved_query_id UUID REFERENCES saved_queries(id), -- Links to query
  visualization_config JSONB, -- {chartType, xAxis, yAxis, colors}
  position JSONB DEFAULT '{}', -- {x, y, w, h}
  drill_target_page_id UUID REFERENCES story_pages(id), -- For drill-down
  card_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_story_cards_page_id ON story_cards(page_id);
CREATE INDEX idx_story_cards_saved_query_id ON story_cards(saved_query_id);
```

#### 10. story_filters
```sql
CREATE TABLE story_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  filter_name VARCHAR(255) NOT NULL,
  column_name VARCHAR(255) NOT NULL,
  filter_type ENUM('select', 'multi_select', 'range', 'date_range', 'search') NOT NULL,
  available_values JSONB, -- Pre-calculated distinct values
  default_value JSONB,
  applied_value JSONB, -- Current user selection
  applies_to_pages JSONB DEFAULT '[]', -- Which pages this filter affects
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_story_filters_story_id ON story_filters(story_id);
```

#### 11. sharing & permissions
```sql
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type ENUM('story', 'collection', 'query') NOT NULL,
  resource_id UUID NOT NULL,
  shared_by_id UUID REFERENCES users(id),
  shared_with_id UUID REFERENCES users(id),
  permission ENUM('view', 'edit', 'admin') DEFAULT 'view',
  shared_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_shares_resource ON shares(resource_type, resource_id);
CREATE INDEX idx_shares_shared_with_id ON shares(shared_with_id);
```

#### 12. audit_log
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'create_query', 'execute_query', 'publish_story'
  resource_type VARCHAR(50), -- 'story', 'query', 'database'
  resource_id UUID,
  changes JSONB, -- What changed
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

---

## Backend Architecture

### Microservices Structure (Recommended)

```
backend/
├── auth-service/          # Authentication & JWT
├── query-service/         # Query execution & caching
├── ai-service/            # AI query generation (Python/LLM)
├── database-service/      # Multi-database connections
├── story-service/         # Story CRUD operations
├── export-service/        # Data export (CSV, Excel, PDF)
├── notification-service/  # Email, webhooks
└── shared/
    ├── middleware/        # Auth, logging, error handling
    ├── database/          # Connection pooling, migrations
    ├── cache/             # Redis operations
    └── utils/             # Common utilities
```

### Authentication Flow

```
1. User POST /auth/register
   ├─ Hash password with bcrypt
   ├─ Create user record
   └─ Return JWT token

2. User POST /auth/login
   ├─ Verify credentials
   ├─ Generate JWT (exp: 24h)
   ├─ Generate Refresh token (exp: 30d) - stored in DB
   └─ Return both tokens

3. All API requests include JWT in Authorization header
   ├─ Verify JWT signature
   ├─ Check expiration
   ├─ Middleware extracts user context
   └─ Attach to request object

4. Token refresh
   ├─ POST /auth/refresh with refresh_token
   ├─ Validate refresh token exists in DB
   ├─ Generate new JWT
   └─ Return new JWT
```

---

## API Endpoints

### Authentication Endpoints

```
POST /api/auth/register
  Body: { email, username, password, fullName }
  Returns: { userId, token, refreshToken }

POST /api/auth/login
  Body: { email, password }
  Returns: { userId, token, refreshToken, organization }

POST /api/auth/refresh
  Body: { refreshToken }
  Returns: { token }

POST /api/auth/logout
  Authorization: Bearer JWT
  Returns: { success: true }

GET /api/auth/me
  Authorization: Bearer JWT
  Returns: { user object with profile }
```

### Database Connection Endpoints

```
GET /api/databases
  Authorization: Bearer JWT
  Query: { orgId }
  Returns: [{ id, name, type, status, lastTestedAt }]

POST /api/databases
  Authorization: Bearer JWT
  Body: { name, type, host, port, database, username, password }
  Returns: { id, status: 'testing' }

POST /api/databases/:id/test
  Authorization: Bearer JWT
  Returns: { status: 'connected' | 'disconnected', error }

DELETE /api/databases/:id
  Authorization: Bearer JWT
  Returns: { success: true }

GET /api/databases/:id/schema
  Authorization: Bearer JWT
  Returns: { tables: [{ name, columns: [{name, type}] }] }
```

### Query Execution Endpoints

```
POST /api/queries/execute
  Authorization: Bearer JWT
  Body: { 
    databaseId, 
    sql, 
    aiPrompt?, // If user provided natural language
    filters?: {column: value}
  }
  Returns: { 
    queryId, 
    data: [], 
    columns: [{name, type}],
    rowCount, 
    executionTimeMs, 
    fromCache: boolean 
  }

GET /api/queries/:id/results
  Authorization: Bearer JWT
  Query: { offset, limit }
  Returns: Paginated results

POST /api/queries/save
  Authorization: Bearer JWT
  Body: { 
    name, 
    description,
    sql,
    databaseId,
    collectionId?,
    aiPrompt?
  }
  Returns: { queryId }

GET /api/queries
  Authorization: Bearer JWT
  Query: { collectionId?, search?, limit, offset }
  Returns: [{ id, name, description, createdAt, createdBy }]

DELETE /api/queries/:id
  Authorization: Bearer JWT
  Returns: { success: true }
```

### AI Query Builder Endpoint (Natural Language → SQL)

```
POST /api/ai/generate-query
  Authorization: Bearer JWT
  Body: { 
    databaseId,
    naturalLanguagePrompt, 
    context?: "What tables should I consider?"
  }
  Returns: { 
    generatedSql,
    explanation, 
    confidence: 0-100,
    suggestedVisualizations: []
  }

POST /api/ai/generate-query/verify
  Authorization: Bearer JWT
  Body: { 
    databaseId,
    sql, 
    generatedFromPrompt?
  }
  Returns: { 
    isValid: boolean,
    estimatedRows,
    warnings: []
  }
```

### Story Endpoints

```
POST /api/stories
  Authorization: Bearer JWT
  Body: { name, description, collectionId }
  Returns: { storyId }

GET /api/stories
  Authorization: Bearer JWT
  Query: { collectionId?, status?, limit, offset }
  Returns: [{ id, name, status, viewCount, createdBy, createdAt }]

GET /api/stories/:id
  Authorization: Bearer JWT (or public if published)
  Returns: { 
    id, name, description,
    pages: [{
      id, title, narrative,
      cards: [{ id, title, queryId, visualization }],
      filters: [{ id, name, values }]
    }]
  }

PUT /api/stories/:id
  Authorization: Bearer JWT
  Body: { name, description, narrative, theme }
  Returns: { success: true }

POST /api/stories/:id/publish
  Authorization: Bearer JWT
  Body: { isPublic: boolean }
  Returns: { publicUrl, shareToken }

DELETE /api/stories/:id
  Authorization: Bearer JWT
  Returns: { success: true }
```

### Story Page Endpoints

```
POST /api/stories/:storyId/pages
  Authorization: Bearer JWT
  Body: { title, subtitle, narrative, layout }
  Returns: { pageId }

PUT /api/stories/:storyId/pages/:pageId
  Authorization: Bearer JWT
  Body: { title, narrative, layout }
  Returns: { success: true }

DELETE /api/stories/:storyId/pages/:pageId
  Authorization: Bearer JWT
  Returns: { success: true }

POST /api/stories/:storyId/pages/:pageId/reorder
  Authorization: Bearer JWT
  Body: { newOrder: number }
  Returns: { success: true }
```

### Story Card Endpoints

```
POST /api/stories/:storyId/pages/:pageId/cards
  Authorization: Bearer JWT
  Body: { 
    title,
    cardType: 'visualization' | 'metric' | 'text',
    savedQueryId?, // For visualization
    visualizationConfig?, // {chartType, xAxis, yAxis}
    drillTargetPageId?
  }
  Returns: { cardId }

PUT /api/stories/:storyId/cards/:cardId
  Authorization: Bearer JWT
  Body: { 
    title,
    visualizationConfig,
    drillTargetPageId
  }
  Returns: { success: true }

DELETE /api/stories/:storyId/cards/:cardId
  Authorization: Bearer JWT
  Returns: { success: true }
```

### Sharing Endpoints

```
POST /api/share
  Authorization: Bearer JWT
  Body: { resourceType, resourceId, sharedWithEmail, permission }
  Returns: { shareId }

GET /api/share/:storyId
  Authorization: Bearer JWT
  Returns: [{ id, sharedWithUser, permission, sharedAt }]

DELETE /api/share/:shareId
  Authorization: Bearer JWT
  Returns: { success: true }

PUT /api/share/:shareId
  Authorization: Bearer JWT
  Body: { permission }
  Returns: { success: true }
```

### Export Endpoints

```
GET /api/export/:queryId?format=csv|xlsx|pdf
  Authorization: Bearer JWT
  Returns: File download

POST /api/export/story/:storyId
  Authorization: Bearer JWT
  Body: { format: 'pdf' | 'pptx', pages: [1,2,3] }
  Returns: File download
```

---

## Data Flow & Workflow

### Flow 1: User Creates Query (Manual SQL)

```
User → Query Editor
  ↓
Input SQL Query
  ↓
Click "Execute"
  ↓
[Query Service] Validates SQL
  ↓
[Database Service] Connects to selected database
  ↓
Execute SQL query
  ↓
[Cache Service] Store results in Redis (TTL: 5 min)
  ↓
Returns to UI:
  - Data rows
  - Column metadata
  - Execution time
  - Row count
  ↓
User previews results in table format
  ↓
[Optional] Create visualization (chart)
  - User manually selects chart type
  - User maps axes (X, Y, colors, etc)
  - User configures chart options
  ↓
[Optional] Save query
  - Generates Query ID
  - Stores SQL + config in DB
  ↓
[Optional] Save as Story Card
  - Creates Card in selected Story
  - Links to Saved Query
  - Stores visualization config
```

### Flow 2: User Creates Query (AI Natural Language)

```
User → Query Editor → AI Prompt Tab
  ↓
Input natural language prompt:
  "Show me top 10 customers by revenue"
  ↓
Click "Generate SQL"
  ↓
[AI Service] Sends to LLM:
  - User prompt
  - Database schema context
  - Example queries (few-shot)
  ↓
LLM generates SQL query
  ↓
[AI Service] 
  - Validates generated SQL syntax
  - Check against database schema
  - Return {sql, explanation, confidence}
  ↓
Returns to UI:
  - Generated SQL
  - Confidence score
  - Suggested visualizations
  ↓
User reviews SQL (can edit if needed)
  ↓
Click "Execute"
  ↓
[Same as Flow 1: Query Execution]
  ↓
Saves with `query_type: 'ai_generated'`
  + stores original prompt for reference
```

### Flow 3: User Creates Story

```
User → Stories page → Create New Story
  ↓
Input story metadata:
  - Name: "Q4 Revenue Analysis"
  - Description
  - Collection
  ↓
Story created (status: draft)
  ↓
Enter Story Builder
  ↓
Page 1: Create first page
  - Title: "Executive Summary"
  - Narrative: "This page shows..."
  - Layout: "double" (2 columns)
  ↓
Add Card 1:
  - Link to saved query (top products)
  - Chart type: Bar chart
  - Configure X axis: product_name
  - Configure Y axis: revenue
  ↓
Add Card 2:
  - Metric card showing total revenue
  - Value formula: SUM(revenue)
  ↓
Add Story Filter:
  - Filter name: "Date Range"
  - Column: order_date
  - Type: date_range
  - Applies to all cards on this page
  ↓
Page 2: Add second page
  - Title: "Regional Breakdown"
  - Narrative context
  - Add cards with regional data
  - Add drill-down: Click region → go to detailed page
  ↓
Page 3: Drill-down details
  - Shows filtered data for selected region
  - Drill-up button to return
  ↓
User clicks "Publish"
  ↓
Status changes to "published"
  ↓
Story available for sharing
```

### Flow 4: User Views Published Story

```
User A → Shares story with User B
  ↓
User B receives notification
  ↓
User B clicks story link
  ↓
Story Viewer opens
  ↓
Displays Page 1 with:
  - Title & Narrative
  - Cards with current data
  - Filters at top
  ↓
User B interacts with filter:
  - Select date range
  - All cards re-query with filter applied
  - Uses cache if available
  - Shows loading state during query
  ↓
User B clicks drill-down button on card
  ↓
Navigation to Page 3 with filtered context
  - Breadcrumb shows current location
  - Back button to return to Page 1
  ↓
User B navigates pages:
  - Click page number buttons
  - Next/Previous buttons
  - Breadcrumb shows page history
  ↓
User B exports story to PDF
  - All pages included
  - Filters applied to export
  - Professional layout
```

---

## Authentication & Authorization

### JWT Strategy

```
Access Token (short-lived, 1 hour):
{
  iss: 'insightengine-ai',
  sub: 'user_id',
  org_id: 'org_id',
  email: 'user@email.com',
  role: 'analyst',
  permissions: ['query:execute', 'story:create'],
  iat: timestamp,
  exp: timestamp + 1h
}

Refresh Token (long-lived, 30 days):
{
  iss: 'insightengine-ai',
  sub: 'user_id',
  type: 'refresh',
  iat: timestamp,
  exp: timestamp + 30d
}
- Stored in DB with hash
- Rotated on each use
- Single-use per token
```

### Permission Model

```
Roles:
- owner: Full access to organization
- admin: Manage users, databases, collections
- analyst: Create queries, stories, share
- viewer: View published stories, read-only access

Permissions:
- database:read
- database:create
- database:delete
- query:create
- query:execute
- query:delete
- story:create
- story:edit
- story:publish
- story:delete
- share:grant
- export:data
- user:manage (admin only)
```

### Row-Level Security (RLS)

```
All queries must include:
WHERE org_id = current_org_id

Multi-tenant isolation:
- Each org has its own data
- Queries filtered by org_id
- No cross-org data access
- Backup/recovery per org
```

---

## AI Integration (Query Builder Only)

### Natural Language to SQL Architecture

```
┌─────────────────────────────────────────┐
│ User Input: "Top 10 products by sales"  │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ AI Service (FastAPI + Python)           │
├─────────────────────────────────────────┤
│ 1. Parse user prompt                    │
│ 2. Get database schema                  │
│ 3. Create prompt with context           │
│ 4. Call LLM API (OpenAI GPT-4)          │
│ 5. Extract generated SQL                │
│ 6. Validate SQL syntax                  │
│ 7. Test against schema                  │
│ 8. Return to user                       │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ LLM Prompt Template:                    │
│                                         │
│ Database Schema:                        │
│ - Table: products (id, name, category)  │
│ - Table: orders (id, product_id, qty)   │
│ - Table: customers (id, name)           │
│                                         │
│ User Request:                           │
│ "Top 10 products by sales"              │
│                                         │
│ Generate SQL query:                     │
│ [LLM generates SQL]                     │
└─────────────────────────────────────────┘
```

### Supported LLM Providers

1. **OpenAI GPT-4** (Recommended)
   - Cost: $0.03/1K input tokens
   - Latency: ~2s
   - Quality: Best
   
2. **Google Vertex AI** (Bison/Gemini)
   - Cost: Comparable
   - Integration via GCP

3. **Anthropic Claude**
   - Alternative option
   - Similar pricing

### Prompt Engineering

```python
# System Prompt (Fixed)
SYSTEM_PROMPT = """
You are a SQL expert. Convert user requests to SQL queries.
Rules:
1. Only use tables and columns from schema provided
2. Use best practices for performance
3. Include comments explaining the query
4. Return valid SQL only, no markdown
5. Assume PostgreSQL dialect
"""

# Few-Shot Examples
EXAMPLES = [
  {
    "user": "Top 5 customers by revenue",
    "sql": "SELECT customer_id, SUM(amount) as total_revenue FROM orders GROUP BY customer_id ORDER BY total_revenue DESC LIMIT 5;"
  },
  {
    "user": "Average order value by month",
    "sql": "SELECT DATE_TRUNC('month', order_date) as month, AVG(amount) as avg_value FROM orders GROUP BY month ORDER BY month;"
  }
]

# User Prompt Format
USER_PROMPT = f"""
Database Schema:
{database_schema_json}

User Request:
"{user_natural_language_prompt}"

Generate SQL query:
"""
```

### Validation Pipeline

```python
def validate_and_execute_ai_query(user_prompt, database_id):
    # 1. Call LLM
    generated_sql = call_openai_api(user_prompt, db_schema)
    
    # 2. Validate syntax
    try:
        parse_sql(generated_sql)  # sqlparse library
    except:
        return { error: "Invalid SQL syntax" }
    
    # 3. Security check
    if dangerous_patterns(generated_sql):
        return { error: "Query contains restricted operations" }
    
    # 4. Schema validation
    used_tables = extract_tables(generated_sql)
    if not all(table in allowed_tables for table in used_tables):
        return { error: "References invalid tables" }
    
    # 5. EXPLAIN PLAN
    plan = database.explain(generated_sql)
    if plan.estimated_rows > MAX_ROWS:
        return { 
            warning: "Query may return many rows",
            estimatedRows: plan.estimated_rows
        }
    
    # 6. Return to user for approval
    return {
        sql: generated_sql,
        explanation: "Query will...",
        estimatedRows: plan.estimated_rows,
        confidence: 0.95
    }
```

### Important: AI is Query Builder ONLY

```
✅ AI handles:
- Converting natural language to SQL
- Suggesting table joins
- Recommending visualizations (but user chooses)
- Query optimization suggestions

❌ AI does NOT handle:
- Automatically generating charts
- Choosing chart types
- Designing visualizations
- Customizing story layouts
- Creating narratives

User must:
- Choose which chart type to display
- Configure X, Y, color dimensions
- Decide chart styling
- Write story narratives
- Arrange cards in story pages
- Configure filters manually
```

---

## Deployment & Scaling

### Development Environment Setup

```bash
# 1. Backend
git clone <backend-repo>
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Environment variables
cp .env.example .env
# Fill in:
DATABASE_URL=postgresql://user:pass@localhost/insightengine
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key

# 3. Database migrations
alembic upgrade head

# 4. Run backend
uvicorn main:app --reload

# 5. Frontend
cd ../frontend
npm install
npm run dev
```

### Production Deployment (AWS Example)

```
Frontend:
├─ Vercel (recommended)
│  ├─ Auto-deploy from GitHub
│  ├─ Built-in CDN
│  ├─ Serverless functions
│  └─ Environment variables from vault

Backend:
├─ ECS Fargate (Containerized)
│  ├─ Docker image push to ECR
│  ├─ Load balanced across 3+ instances
│  ├─ Auto-scaling based on CPU/Memory
│  └─ Secrets Manager for sensitive data
│
├─ RDS PostgreSQL (Database)
│  ├─ Multi-AZ deployment
│  ├─ Automated backups (daily)
│  ├─ Read replicas for analytics
│  └─ Parameter group for optimization
│
├─ ElastiCache Redis (Cache)
│  ├─ Cluster mode enabled
│  ├─ Multi-AZ
│  ├─ TTL: 5 minutes default
│  └─ Monitoring via CloudWatch
│
├─ Lambda (AI Service)
│  ├─ Serverless for LLM calls
│  ├─ Scales to 1000 concurrent
│  ├─ 15-minute timeout
│  └─ Error handling with DLQ
│
└─ S3 (Data Export)
   ├─ Query result storage
   ├─ PDF/Excel exports
   ├─ Lifecycle policy (30-day deletion)
   └─ Versioning enabled
```

### Scaling Strategy

```
Database Layer:
- Read replicas for heavy analytics queries
- Partitioning on organization_id
- Materialized views for common aggregations
- Connection pooling (PgBouncer)

Cache Layer:
- Redis cluster with 3-5 nodes
- Query result TTL: 5-30 minutes
- User session cache: 7 days
- Rate limiting: 100 requests/minute per user

API Layer:
- Horizontal scaling with load balancer
- Auto-scaling: Scale up at 70% CPU, down at 30%
- Min 3 instances, max 20 instances
- Request batching for bulk operations

AI Service:
- Async queue for LLM requests
- Rate limit: 10 requests/second to OpenAI
- Cache generated SQL for 7 days
- Fallback to simpler queries if LLM fails
```

---

## Development Roadmap

### Phase 1: MVP (4-6 weeks)
- [ ] Backend setup (FastAPI + PostgreSQL)
- [ ] Authentication (JWT + OAuth)
- [ ] Query execution engine
- [ ] Basic story system (single page)
- [ ] One database type (PostgreSQL)

### Phase 2: Core Features (4-6 weeks)
- [ ] AI query builder integration
- [ ] Multiple database support
- [ ] Multi-page stories
- [ ] Filters and drill-down
- [ ] Story publishing

### Phase 3: Collaboration (2-3 weeks)
- [ ] Sharing system
- [ ] Comments and annotations
- [ ] Activity feed
- [ ] Permissions framework

### Phase 4: Enterprise (2-3 weeks)
- [ ] SAML/SSO authentication
- [ ] Data governance
- [ ] Advanced caching
- [ ] Performance optimization

### Phase 5: Advanced Features (Ongoing)
- [ ] Custom SQL functions
- [ ] Scheduled exports
- [ ] Webhooks
- [ ] Mobile app
- [ ] Real-time collaboration

---

## Security Checklist

- [ ] All inputs sanitized (SQL injection prevention)
- [ ] JWT token rotation implemented
- [ ] HTTPS enforced everywhere
- [ ] Database credentials encrypted at rest
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Audit logging for all actions
- [ ] Password hashing with bcrypt (12+ rounds)
- [ ] Secrets stored in vault (not in code)
- [ ] DDoS protection (WAF)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled
- [ ] CSRF tokens for state-changing operations
- [ ] Regular security audits
- [ ] Penetration testing (quarterly)

---

## Monitoring & Observability

```
Metrics to track:
- API response times (p50, p95, p99)
- Query execution times
- Cache hit rate
- Error rates by endpoint
- AI query generation success rate
- Database connection pool utilization
- User activity (DAU, MAU)
- Story views and shares
- Data export counts

Logging:
- All database queries (with execution time)
- Failed authentication attempts
- API errors and exceptions
- User actions (audit trail)
- LLM API calls and costs
- Performance anomalies

Alerting:
- API response time > 5s
- Error rate > 5%
- Database connections exhausted
- Redis memory > 80%
- LLM API failure rate > 10%
- Disk space > 90%
```

---

## Summary: Getting Started

### For Backend Development

1. Set up PostgreSQL + Redis locally
2. Create FastAPI project structure
3. Implement authentication first
4. Build query execution engine
5. Add database abstraction layer
6. Integrate LLM for AI query builder
7. Implement story CRUD operations
8. Add sharing/permissions layer
9. Deploy to staging
10. Performance optimization

### For Frontend Development

Already completed:
- UI components (shadcn/ui)
- Story builder interface
- Query editor
- Story viewer
- Database management
- Authentication context

Remaining:
- Connect to actual backend APIs
- Real data integration
- Live query execution
- Error handling improvements

This architecture is production-ready and follows industry best practices used by Metabase, Tableau, and Power BI.
