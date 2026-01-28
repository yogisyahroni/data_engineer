# InsightEngine AI - Quick Start Guide

## 5 Minutes to Your First Query ⚡

### Step 1: Initial Setup (2 minutes)

1. **Visit the Onboarding Wizard**
   ```
   Navigate to: http://localhost:3000/onboarding
   ```

2. **Configure Database**
   - Database Type: Select PostgreSQL (or your database)
   - Host: `localhost` (or your database host)
   - Database Name: Your database name
   - Username: Database username
   - Password: Database password
   - Click "Test Connection" to verify
   - Click "Continue"

3. **Setup AI Provider**
   - Choose Provider: OpenAI, Gemini, or Claude
   - API Key: Paste your API key
   - Click "Continue"

4. **Review Auto-Generated Metadata**
   - AI automatically scans your database
   - Review suggested table descriptions
   - Click "Complete Setup"

### Step 2: Your First Query (3 minutes)

#### Option A: AI Prompt (Easiest)
1. Go to Query Editor: `/`
2. Click "AI Prompt" tab
3. Type: `"Show me the top 5 customers by total sales"`
4. Press Enter or click Send button
5. View results in the Table tab
6. Switch to Chart tab to see visualization
7. Adjust chart configuration in the right sidebar

#### Option B: SQL Editor (Manual)
1. Go to Query Editor: `/`
2. Click "SQL Editor" tab
3. Enter your SQL query:
   ```sql
   SELECT 
     customer_name,
     SUM(amount) as total_sales,
     COUNT(id) as order_count
   FROM orders
   GROUP BY customer_name
   ORDER BY total_sales DESC
   LIMIT 5
   ```
4. Click "Execute Query"
5. View results in tabs below

### Step 3: Customize Your Visualization

1. In the **Visualization** sidebar (right panel):
   - Change "Chart Type" to desired visualization
   - Select columns for X-Axis and Y-Axis
   - Add optional "Series Breakout" for multi-dimensional data

2. Your chart updates in real-time!

3. Click **"AI Suggestion"** for smart recommendations

## Common Tasks

### 📊 Create a Sales Dashboard
```
1. Go to `/saved-queries`
2. Browse templates or create new
3. Use "Top Customers by Revenue" template
4. Customize chart and save
```

### 🔍 Explore Your Database
```
1. Open Query Editor `/`
2. Click "Schema" button in header
3. Browse tables and columns
4. Click column names to understand their meaning
```

### 💾 Save Your Analysis
```
In Query Editor `/`:
1. After running query, look for "Save Query" button
2. Give your analysis a name and description
3. Add relevant tags (e.g., "Q1", "revenue")
4. Click Save
```

### 👥 Share with Team
```
1. Go to `/saved-queries`
2. Find your query
3. Click three dots menu (...)
4. Select "Share"
5. Choose team members or make public
```

### 📈 Use Query Templates
```
1. Go to `/templates`
2. Browse available templates by category
3. Click "Use Template" button
4. Template loads in editor
5. Customize and run!
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Execute query |
| `Ctrl/Cmd + S` | Save query |
| `Ctrl/Cmd + Shift + H` | Show query history |
| `Escape` | Close sidebar |
| `Tab` | Tab to autocomplete |

## Pro Tips 💡

### Tip 1: Use Schema Browser
- Always refer to the Schema Browser before writing queries
- Understand column meanings through metadata
- Know which columns are marked as PII, Currency, etc.

### Tip 2: Check AI Reasoning
- Click "AI Reasoning" tab to understand how AI generates SQL
- Review the mapping between natural language and database columns
- Provide feedback to improve future queries

### Tip 3: Leverage Query History
- Click history icon to see recent queries
- Quickly re-run previous analysis
- Copy and modify existing queries

### Tip 4: Save Templates
- Save frequently used queries as templates
- Add descriptions and tags for discoverability
- Share with team members

### Tip 5: Use Validation
- Always review validation results before executing
- Pay attention to warnings about missing LIMIT clauses
- Ensure no dangerous operations are in your query

## Troubleshooting

### ❌ "Connection Failed"
```
Solution:
1. Go to Settings (⚙️ in header)
2. Check Database tab
3. Verify connection credentials
4. Test connection again
5. Contact support if issue persists
```

### ❌ "API Key Invalid"
```
Solution:
1. Go to Settings
2. Go to AI Providers tab
3. Check API key is correct
4. Re-enter API key if needed
5. Test connection
```

### ❌ "Column Not Found in Schema"
```
Solution:
1. Ensure metadata is up to date
2. Click "Sync Schema" in Settings
3. Check Kamus Data for any new tables
4. Use Schema Browser to verify column name
```

### ❌ "Query Timeout"
```
Solution:
1. Add LIMIT clause to limit results
2. Check if query is missing indexes
3. Try simpler query first
4. Contact support for optimization help
```

## Next Steps 🚀

### Now that you've completed quick start:

1. **Explore Templates** (`/templates`)
   - Find analysis relevant to your business
   - Learn from pre-built queries

2. **Configure Metadata** (`/metadata`)
   - Add meaningful descriptions to tables/columns
   - Help team members understand data

3. **Invite Team Members** (`/settings`)
   - Share queries and analyses
   - Collaborate on insights

4. **Create Dashboards**
   - Combine multiple saved queries
   - Schedule automated runs
   - Share with stakeholders

5. **Learn Advanced Features**
   - Row-Level Security (RLS)
   - Scheduled query execution
   - Custom visualizations
   - API integration

## Documentation Links

- **Full Documentation**: See `README.md`
- **Feature Overview**: See `FEATURES.md`
- **Architecture Details**: See technical documentation
- **API Reference**: API docs (coming soon)

## Getting Help

- 📖 **Docs**: Full documentation in markdown files
- 💬 **Community**: Discussion forum
- 🐛 **Report Bug**: GitHub issues
- 📧 **Email Support**: support@insightengine.ai
- 🆘 **Emergency Support**: 24/7 for Enterprise users

---

## Demo Scenario

**Scenario**: Analyze Q1 2024 customer segment performance

### Steps:
1. **Use Template**
   - Go to `/templates`
   - Find "Customer Segmentation Analysis"
   - Click "Use Template"

2. **Customize**
   - In AI Prompt: "Show Q1 2024 performance by segment"
   - AI generates query automatically

3. **Visualize**
   - Switch to Chart tab
   - Change chart type to Pie (segments)
   - Add series breakout for regions

4. **Export**
   - Click Download button
   - Choose CSV format
   - Share with team

5. **Save**
   - Click Save button
   - Name: "Q1 2024 Segment Analysis"
   - Tags: Q1, 2024, segments, performance
   - Share with team

---

**Ready to dive deeper?** Explore the full application and check out the Features documentation! 🎉
