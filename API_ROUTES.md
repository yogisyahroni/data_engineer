# InsightEngine AI - Backend API Routes (FastAPI/Python)

Dokumentasi ini menjelaskan API routes yang akan diimplementasikan di backend untuk mendukung InsightEngine AI.

## 📋 Base Configuration

```
Base URL: /api/v1
Authentication: Bearer Token (JWT)
Content-Type: application/json
```

## 🔐 Authentication

### POST /auth/login
Login dengan username dan password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### POST /auth/logout
Logout user

### POST /auth/refresh
Refresh JWT token

---

## 📊 Query Execution

### POST /queries/execute
Execute AI-generated or manual SQL query

**Request:**
```json
{
  "mode": "ai",
  "input": "Show top 5 customers by sales",
  "database_id": "db_123",
  "limit": 100
}
```

**Response:**
```json
{
  "query_id": "q_12345",
  "sql": "SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id...",
  "status": "completed",
  "rows_returned": 5,
  "execution_time_ms": 234,
  "results": [
    {"customer_id": 1, "total_sales": 45320},
    ...
  ],
  "reasoning": {
    "context_retrieved": ["orders", "customers"],
    "mappings": [...],
    "validation": [...]
  }
}
```

### GET /queries/:query_id
Get query execution details and results

### POST /queries/validate
Validate SQL query before execution

**Request:**
```json
{
  "sql": "SELECT * FROM customers WHERE...",
  "database_id": "db_123"
}
```

**Response:**
```json
{
  "is_valid": true,
  "warnings": ["Missing LIMIT clause"],
  "errors": [],
  "estimated_rows": 1245
}
```

### POST /queries/cancel/:query_id
Cancel running query execution

---

## 💾 Saved Queries

### POST /saved-queries
Save query for later use

**Request:**
```json
{
  "title": "Top Customers Q1",
  "description": "Revenue analysis for top customers",
  "sql": "SELECT * FROM...",
  "tags": ["q1", "revenue", "customers"],
  "database_id": "db_123"
}
```

**Response:**
```json
{
  "id": "sq_789",
  "title": "Top Customers Q1",
  "created_at": "2024-01-15T10:30:00Z",
  "created_by": "user_123"
}
```

### GET /saved-queries
List all saved queries with pagination

**Query Parameters:**
```
?page=1&limit=20&sort=recent&search=customers
```

### GET /saved-queries/:id
Get single saved query

### PUT /saved-queries/:id
Update saved query

### DELETE /saved-queries/:id
Delete saved query

### POST /saved-queries/:id/share
Share query with team members

**Request:**
```json
{
  "user_ids": ["user_456", "user_789"],
  "permission": "read"
}
```

---

## 🗂️ Metadata Management (Kamus Data)

### GET /metadata/tables
List all tables with metadata

**Response:**
```json
{
  "tables": [
    {
      "name": "customers",
      "alias": "Customers",
      "description": "Customer master data with demographics",
      "columns_count": 12,
      "row_count": 45000
    }
  ]
}
```

### GET /metadata/tables/:table_name
Get detailed table metadata

**Response:**
```json
{
  "name": "customers",
  "alias": "Customers",
  "description": "Customer master data",
  "columns": [
    {
      "name": "customer_id",
      "alias": "ID",
      "type": "INT",
      "description": "Unique identifier",
      "nullable": false,
      "tags": ["PK"],
      "sample_values": [1, 2, 3]
    },
    {
      "name": "email",
      "type": "VARCHAR(255)",
      "tags": ["PII"],
      "description": "Customer email address"
    }
  ]
}
```

### PUT /metadata/tables/:table_name
Update table metadata

**Request:**
```json
{
  "alias": "New Alias",
  "description": "Updated description"
}
```

### PUT /metadata/columns/:table_name/:column_name
Update column metadata

**Request:**
```json
{
  "alias": "Customer ID",
  "description": "Unique customer identifier",
  "tags": ["PK"]
}
```

### POST /metadata/auto-guess
Auto-generate metadata from sample data

**Request:**
```json
{
  "database_id": "db_123",
  "table_names": ["customers", "orders", "products"]
}
```

**Response:**
```json
{
  "job_id": "job_456",
  "status": "processing",
  "progress": 33
}
```

### GET /metadata/auto-guess/:job_id
Get auto-guess progress and results

---

## 🗄️ Database Management

### POST /databases
Register new database connection

**Request:**
```json
{
  "name": "Production DB",
  "type": "postgresql",
  "host": "db.example.com",
  "port": 5432,
  "database": "my_database",
  "username": "user",
  "password_encrypted": true,
  "ssl": true
}
```

**Response:**
```json
{
  "id": "db_123",
  "name": "Production DB",
  "status": "connected",
  "tables_count": 24
}
```

### GET /databases
List all connected databases

### GET /databases/:id
Get database details and schema

### POST /databases/:id/test-connection
Test database connection

**Response:**
```json
{
  "success": true,
  "message": "Connected successfully",
  "latency_ms": 45
}
```

### POST /databases/:id/sync-schema
Sync database schema

**Response:**
```json
{
  "job_id": "sync_789",
  "status": "in_progress"
}
```

### DELETE /databases/:id
Remove database connection

---

## 🤖 AI Provider Management

### POST /ai-providers
Configure AI provider

**Request:**
```json
{
  "provider": "openai",
  "api_key_encrypted": true,
  "model": "gpt-4",
  "is_default": true
}
```

### GET /ai-providers
List configured AI providers

### POST /ai-providers/:id/test
Test AI provider connection

**Response:**
```json
{
  "success": true,
  "model": "gpt-4",
  "latency_ms": 200
}
```

### DELETE /ai-providers/:id
Remove AI provider

---

## 📈 Query Templates

### GET /templates
List all query templates

**Query Parameters:**
```
?category=sales&search=revenue&limit=20
```

### GET /templates/:id
Get template details

### POST /templates
Create new template

**Request:**
```json
{
  "title": "Top Customers by Revenue",
  "description": "Identify most valuable customers",
  "sql": "SELECT customer_id, SUM(amount)...",
  "category": "sales",
  "tags": ["revenue", "customers"]
}
```

### PUT /templates/:id
Update template

### DELETE /templates/:id
Delete template

### POST /templates/:id/clone
Clone template for personal use

---

## 👥 Team & Permissions

### GET /team/members
List team members

**Response:**
```json
{
  "members": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "joined_at": "2024-01-01"
    }
  ]
}
```

### POST /team/members
Invite new team member

**Request:**
```json
{
  "email": "newuser@example.com",
  "role": "analyst"
}
```

### POST /team/members/:id/revoke
Remove team member

### PUT /permissions/:resource_id
Update resource permissions

**Request:**
```json
{
  "user_id": "user_456",
  "permission": "read"
}
```

---

## 🔍 Search & Discovery

### POST /search
Search across queries, templates, and metadata

**Request:**
```json
{
  "q": "customer revenue",
  "type": ["queries", "templates", "tables"],
  "limit": 20
}
```

**Response:**
```json
{
  "results": [
    {
      "type": "query",
      "id": "sq_789",
      "title": "Top Customers Revenue",
      "relevance": 0.95
    }
  ]
}
```

---

## 📊 Analytics & Audit

### GET /analytics/queries
Query execution statistics

**Response:**
```json
{
  "total_queries": 1234,
  "avg_execution_time_ms": 245,
  "queries_today": 42,
  "queries_this_week": 287
}
```

### GET /audit-logs
Get audit trail of all activities

**Query Parameters:**
```
?user_id=user_123&resource_type=query&date_from=2024-01-01&limit=50
```

**Response:**
```json
{
  "logs": [
    {
      "id": "log_123",
      "user_id": "user_123",
      "action": "execute_query",
      "resource_type": "query",
      "resource_id": "q_12345",
      "timestamp": "2024-01-15T10:30:00Z",
      "details": {}
    }
  ]
}
```

---

## ⚙️ Configuration & Settings

### GET /settings
Get user/organization settings

### PUT /settings
Update settings

**Request:**
```json
{
  "theme": "dark",
  "timezone": "UTC",
  "language": "en"
}
```

### GET /settings/security
Get security configuration

**Response:**
```json
{
  "mfa_enabled": false,
  "encryption": "AES-256",
  "rls_enabled": true,
  "password_policy": "strong"
}
```

---

## 🔄 Webhooks (Advanced)

### POST /webhooks
Register webhook for events

**Request:**
```json
{
  "event": "query_completed",
  "url": "https://example.com/webhook",
  "active": true
}
```

### GET /webhooks
List registered webhooks

### DELETE /webhooks/:id
Delete webhook

---

## 📨 Export & Sharing

### POST /queries/:id/export
Export query results

**Request:**
```json
{
  "format": "csv",
  "include_headers": true
}
```

**Response:**
Binary CSV file

### POST /queries/:id/share-link
Generate shareable link

**Request:**
```json
{
  "expiration_days": 7,
  "password": "optional"
}
```

**Response:**
```json
{
  "url": "https://insightengine.ai/share/abc123",
  "expires_at": "2024-01-22"
}
```

---

## 🎯 Scheduled Queries (Future)

### POST /schedules
Create scheduled query execution

**Request:**
```json
{
  "query_id": "sq_789",
  "frequency": "weekly",
  "day_of_week": "monday",
  "time": "09:00",
  "notify_emails": ["user@example.com"]
}
```

### GET /schedules
List scheduled queries

### PUT /schedules/:id
Update schedule

### DELETE /schedules/:id
Delete schedule

---

## 📱 Real-Time Updates (WebSocket)

### WS /ws/query/:query_id
Real-time query execution updates

**Events:**
```json
{
  "type": "status_changed",
  "status": "executing",
  "progress": 45
}
```

---

## ❌ Error Handling

All endpoints return standard error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [
      {
        "field": "limit",
        "message": "Must be between 1 and 100000"
      }
    ]
  }
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

---

## 🔑 Rate Limiting

- Free tier: 100 queries/day
- Pro tier: Unlimited
- Enterprise: Custom limits

```
Headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1234567890
```

---

## 📚 API Documentation

- Full OpenAPI/Swagger docs: `/api/docs`
- Postman collection: [available on request]
- SDK (Python, JS): [Coming soon]

---

**Note:** These API routes are for the Python FastAPI backend. Frontend communicates with these endpoints for all data operations.
