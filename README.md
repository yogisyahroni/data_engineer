# InsightEngine AI - Hybrid Business Intelligence Platform

A next-generation Business Intelligence platform that combines the precision of SQL with the intuitive power of AI, enabling data analysts and business users to explore data seamlessly.

## 🌟 Key Features

### Dual-Engine Workspace
- **AI Prompt Interface**: Write natural language queries like "Show me top 5 customers by sales last month"
- **SQL Editor**: Full-featured SQL editor for complex queries with syntax highlighting
- **Seamless Switching**: Move between AI and SQL modes while maintaining query context

### Intelligent Data Discovery
- **Kamus Data (Data Dictionary)**: Business-friendly metadata with human-readable descriptions
- **Schema Browser**: Real-time exploration of database structure with column types and tags
- **Auto-Guessing**: AI automatically generates metadata from sample data
- **Semantic Tagging**: Mark columns as PII (sensitive), Currency, Temporal, etc.

### AI-Powered Query Generation
- **RAG Architecture**: Retrieval-Augmented Generation for accurate, contextual SQL generation
- **Context Management**: AI understands business glossary and prevents hallucinations
- **Multi-Provider Support**: OpenAI, Google Gemini, Anthropic Claude, OpenRouter
- **SQL Validation**: Automatic safety checks (no DROP, DELETE, TRUNCATE)

### Smart Visualizations
- **AI Suggestions**: Intelligent chart recommendations based on data types
- **Interactive Configuration**: Drag-and-drop axis mapping and series breakout
- **Chart Types**: Bar, Line, Pie, Scatter plots with full customization
- **Real-time Preview**: See changes instantly as you configure visualizations

### Enterprise Security
- **AES-256 Encryption**: API keys and credentials encrypted at rest
- **Row-Level Security (RLS)**: Automatic data filtering by organization
- **Read-Only Access**: Safe database access with service account permissions
- **Audit Logging**: Track all executed queries for compliance

### Developer-Friendly
- **Query History**: Access and reuse previous queries
- **AI Reasoning Display**: Understand how AI generates SQL (context, mapping, validation)
- **API Ready**: RESTful API for programmatic access
- **Export Options**: Download results as CSV, JSON, Excel

## 🏗️ Architecture

### Frontend (Next.js 16)
- **Server Components**: Optimized rendering and data fetching
- **Responsive Design**: Works seamlessly on desktop, tablet, mobile
- **Component-Based**: Modular, reusable UI components (shadcn/ui)
- **Tailwind CSS v4**: Modern styling with design tokens

### Backend (Python FastAPI)
- **AI Orchestration**: LiteLLM for multi-provider LLM support
- **Database Abstraction**: SQLAlchemy with support for PostgreSQL, MySQL, BigQuery, Snowflake
- **Async Processing**: Celery + RabbitMQ for background jobs
- **Caching Layer**: Redis for query result caching

### Database Integration
- **Metadata Store**: PostgreSQL for Kamus Data, user profiles, audit logs
- **Encrypted Credentials**: Secure storage of database connection strings
- **Vector Embeddings**: Semantic search for RAG-based context retrieval
- **Service Accounts**: Read-only database access with minimal permissions

## 📱 Pages & Components

### Main Pages
- `/` - **Query Editor**: Dual-engine workspace for SQL/AI queries
- `/dashboard` - **Dashboard**: Overview, stats, recent queries, quick links
- `/metadata` - **Metadata Editor**: Manage Kamus Data and column aliases
- `/settings` - **Settings**: Database connections, AI providers, security config
- `/onboarding` - **Setup Guide**: 3-step onboarding (Database → AI → Metadata)

### Components
- `WorkspaceHeader` - Navigation and database connection info
- `DualEngineEditor` - AI Prompt and SQL Editor tabs
- `ResultsPanel` - Query results in table format
- `ChartVisualization` - Interactive charts (Bar, Line, Pie, Scatter)
- `VisualizationSidebar` - Chart configuration and AI suggestions
- `SchemaBrowser` - Database schema with column metadata
- `AIReasoning` - Transparent AI reasoning display
- `QueryHistory` - Access previous queries
- `MetadataEditor` - Edit table/column descriptions and aliases

## 🚀 Getting Started

### Installation
```bash
# Clone repository
git clone <repo-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

### Initial Setup
1. Visit `/onboarding` to complete 3-step setup
2. Connect your database (PostgreSQL, MySQL, BigQuery, etc.)
3. Configure AI provider (OpenAI, Gemini, Claude, etc.)
4. Review auto-generated metadata in Kamus Data

### First Query
1. Go to `/` (Query Editor)
2. Choose AI Prompt or SQL Editor
3. Write your query
4. View results in Table or Chart tabs
5. Adjust visualization with sidebar controls

## 🔐 Security Best Practices

- **Never** store API keys in code or `.env` files
- Use environment variables or secret managers (AWS Secrets Manager, HashiCorp Vault)
- Enable **Row-Level Security (RLS)** in settings for multi-tenant deployments
- Use service accounts with **read-only** database permissions
- Regularly review **Audit Logs** for query activity
- Encrypt all database connections with **SSL/TLS**

## 📊 Supported Databases

- PostgreSQL (recommended)
- MySQL / MariaDB
- BigQuery
- Snowflake
- Redshift
- DuckDB

## 🤖 Supported AI Providers

### Zero-Config (Vercel AI Gateway)
- OpenAI (GPT-4, GPT-4 Turbo)
- Google Gemini
- Anthropic Claude
- Fireworks AI
- AWS Bedrock

### API Key Required
- OpenRouter (open-source models)
- Groq (fast inference)
- Custom LLM endpoints

## 🛠️ Development

### Tech Stack
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Forms**: React Hook Form (optional)
- **Database ORM**: SQLAlchemy (Python backend)
- **AI**: LiteLLM, LangChain, OpenAI, etc.

### File Structure
```
/app
  /page.tsx          # Query Editor (main workspace)
  /dashboard         # Dashboard overview
  /metadata          # Kamus Data editor
  /settings          # Configuration
  /onboarding        # Setup wizard
  /layout.tsx        # Root layout
  /globals.css       # Theme and styles

/components
  /workspace-header.tsx         # Top navigation
  /dual-engine-editor.tsx       # AI + SQL editor
  /results-panel.tsx            # Query results table
  /chart-visualization.tsx      # Interactive charts
  /visualization-sidebar.tsx    # Chart config
  /schema-browser.tsx           # Database schema
  /ai-reasoning.tsx             # AI transparency
  /query-history.tsx            # Query history panel
  /ui/                          # shadcn/ui components
```

## 🎨 Design System

### Color Palette
- **Primary**: Indigo (Accent colors for buttons, links, highlights)
- **Secondary**: Light gray (Neutral backgrounds)
- **Accent**: Purple (Interactive elements)
- **Danger**: Red (Destructive actions)

### Typography
- **Sans-serif**: Geist (headings and body)
- **Mono**: Geist Mono (code, SQL, technical text)

### Design Tokens (globals.css)
- `--primary`: Primary action color
- `--secondary`: Secondary backgrounds
- `--muted`: Disabled/inactive states
- `--accent`: Highlight elements
- `--destructive`: Delete/danger actions
- `--border`: Divider lines
- `--radius`: Border radius

## 📈 Roadmap

### Phase 1 (Current)
- ✅ Dual-engine workspace (AI + SQL)
- ✅ Kamus Data (metadata management)
- ✅ Interactive visualizations
- ✅ Multi-provider AI support

### Phase 2
- 🔄 Saved queries and dashboards
- 🔄 Team collaboration & permissions
- 🔄 Query templates and snippets
- 🔄 Advanced filtering and drill-down

### Phase 3
- 📋 Real-time streaming data
- 📋 ML model integration
- 📋 Natural language export (reports)
- 📋 Mobile native apps

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📧 Support

For questions, issues, or feedback:
- GitHub Issues: [GitHub issues page]
- Email: support@insightengine.ai
- Documentation: [docs.insightengine.ai]
- Community: [Discord/Slack]

---

Built with ❤️ for data-driven organizations
