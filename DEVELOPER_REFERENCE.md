# InsightEngine AI - Developer Reference

## Quick Navigation

### Most Important Files
```
/app/page.tsx                          - Main workspace (START HERE)
/components/dual-engine-editor.tsx     - Query execution engine
/hooks/use-query-execution.ts          - Core query logic
/contexts/user-context.tsx             - Authentication
/lib/types.ts                          - All TypeScript types
/app/api/                              - All API routes
```

### Get Started
1. Read `/BUILD_SUMMARY.md` for overview
2. Read `/PRODUCTION_GUIDE.md` for backend integration
3. Check `/API_ROUTES.md` for all endpoints
4. Review `/lib/types.ts` for data structures

## Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Key Hooks Reference

### useQueryExecution
```typescript
const { execute, isLoading, data, columns, error, executionTime } = useQueryExecution();

// Execute a query
await execute({
  sql: 'SELECT * FROM users',
  connectionId: 'db1',
  aiPrompt: 'optional AI prompt'
});
```

### useSavedQueries
```typescript
const { queries, saveQuery, deleteQuery, pinQuery } = useSavedQueries({
  collectionId: 'col1',
  autoFetch: true
});

// Save a query
await saveQuery({
  name: 'My Query',
  sql: 'SELECT * FROM table',
  connectionId: 'db1',
  collectionId: 'col1',
  userId: 'user1'
});
```

### useCollections
```typescript
const { collections, createCollection, deleteCollection } = useCollections();

// Create collection
await createCollection({
  name: 'Analytics',
  icon: '📊',
  isPublic: false
});
```

### useQueryCache
```typescript
const cache = useQueryCache();

// Get cached result
const result = cache.get(sql, connectionId);

// Cache result
cache.set(sql, connectionId, data);

// Clear all cache
cache.clear();
```

### useUser
```typescript
const { user, isAuthenticated, login, logout, signup } = useUser();

if (!isAuthenticated) {
  await login(email, password);
}

console.log(user.name, user.email);
```

## API Route Pattern

All API routes follow this pattern:

```typescript
// /app/api/resource/route.ts
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Implementation
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[v0] Error:', error);
    return NextResponse.json(
      { success: false, error: 'message' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Implementation
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }
}
```

## Component Prop Patterns

### Query Editor
```typescript
<DualEngineEditor
  onSchemaClick={() => {}}
  onResultsUpdate={(results) => {}}
  connectionId="db1"
/>
```

### Dashboard Card
```typescript
<DashboardCard
  id="card1"
  title="Sales Metrics"
  queryId="q1"
  data={data}
  columns={columns}
  visualizationType="bar"
  isEditMode={true}
  onRemove={(id) => {}}
/>
```

### Share Modal
```typescript
<ShareModal
  isOpen={true}
  onClose={() => setOpen(false)}
  resourceType="query"
  resourceName="My Query"
  onShare={async (email, permission) => {}}
  sharedWith={[]}
/>
```

## Adding New Features

### 1. Add API Route
```typescript
// /app/api/feature/route.ts
export async function POST(request: NextRequest) {
  // Implement feature
}
```

### 2. Add Hook
```typescript
// /hooks/use-feature.ts
export function useFeature() {
  // Implement hook
}
```

### 3. Add Component
```typescript
// /components/feature.tsx
export function Feature() {
  // Implement component
}
```

### 4. Update Types
```typescript
// /lib/types.ts
export interface NewFeature {
  // Add types
}
```

## Debugging

All debug logs use `[v0]` prefix:

```typescript
console.log('[v0] Query executed:', { connectionId, rowCount });
console.error('[v0] Error occurred:', error);
```

Filter console logs:
```javascript
// In browser DevTools
filter: "[v0]"
```

## Data Flow Example

```
User Input (dual-engine-editor)
         ↓
Execute Button Click
         ↓
useQueryExecution.execute()
         ↓
POST /api/queries/execute
         ↓
Mock/Real Query Execution
         ↓
Response with Results
         ↓
Cache Results
         ↓
Update Component State
         ↓
Render Results Panel
         ↓
Display Table/Charts
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Authentication
JWT_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret

# Optional
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-xxx
```

## Common Tasks

### Execute a Query
```typescript
const { execute } = useQueryExecution();
await execute({
  sql: 'SELECT * FROM orders',
  connectionId: 'db1'
});
```

### Save Query Results
```typescript
const { saveQuery } = useSavedQueries();
await saveQuery({
  name: 'Sales Report',
  sql: 'SELECT * FROM sales',
  connectionId: 'db1',
  collectionId: 'col1',
  userId: 'user1'
});
```

### Cache Query Result
```typescript
const cache = useQueryCache();
cache.set(sql, connectionId, resultData);
const cached = cache.get(sql, connectionId);
```

### Get User Info
```typescript
const { user, isAuthenticated } = useUser();
if (isAuthenticated) {
  console.log(`Welcome, ${user.name}`);
}
```

### Share Query
```typescript
// POST /api/share?type=query
const response = await fetch('/api/share?type=query', {
  method: 'POST',
  body: JSON.stringify({
    queryId: 'q1',
    sharedWith: 'colleague@email.com',
    permission: 'view'
  })
});
```

## State Management Pattern

Use Context + Hooks:

```typescript
// Create context
const Context = createContext();

// Provider component
export function Provider({ children }) {
  const [state, setState] = useState();
  // ...
  return <Context.Provider value={{ state }}>{children}</Context.Provider>;
}

// Hook
export function useContext() {
  return useContext(Context);
}

// Usage
const { state } = useContext();
```

## Error Handling Pattern

```typescript
try {
  const response = await fetch('/api/endpoint', { method: 'POST' });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Operation failed');
  }
  
  // Handle success
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[v0] Error:', message);
  // Show user error
}
```

## Performance Tips

1. **Use useCallback** for function props
2. **Use useMemo** for expensive computations
3. **Implement pagination** for large datasets
4. **Cache query results** with 5-min TTL
5. **Debounce search** inputs
6. **Lazy load components** for dashboards

## Testing the App

### Test Query Execution
1. Navigate to `/`
2. Enter SQL: `SELECT * FROM orders LIMIT 10`
3. Click "Execute Query"
4. See mock results

### Test Saving
1. Execute a query
2. Click "Save Query"
3. Enter name: "Test Query"
4. Check `/saved-queries` page

### Test Collections
1. Go to `/explorer`
2. Click "New Collection"
3. Verify in sidebar

### Test Sharing
1. Open query
2. Click "Share"
3. Enter email
4. Select permission
5. Click "Share"

## File Size Limits

- Recommended max query result: 10,000 rows
- Max history entries stored: 100
- Cache TTL default: 5 minutes

## Deployment Checklist

- [ ] Environment variables set
- [ ] Database connected
- [ ] Authentication working
- [ ] API endpoints tested
- [ ] Error logging configured
- [ ] Monitoring set up
- [ ] SSL certificate configured
- [ ] CDN configured
- [ ] Backups configured
- [ ] Health checks passing

## Support

- Check `/PRODUCTION_GUIDE.md` for backend setup
- See `/API_ROUTES.md` for API documentation
- Review `/BUILD_SUMMARY.md` for feature overview
- Check `/FEATURES.md` for detailed features

## Quick Links

- Main Workspace: `/` 
- Query Explorer: `/explorer`
- Dashboard Builder: `/dashboards`
- Settings: `/settings`
- Saved Queries: `/saved-queries`
- Metadata: `/metadata`
- Templates: `/templates`

---

**Remember:** All debug logs use `[v0]` prefix for easy filtering!
