# Phase 5: Structured Logging Migration Guide

## Overview

Replacing all `log.Println`, `fmt.Printf`, and unstructured logging with JSON structured logging per GEMINI.md Section 15.

---

## 1. Logger Initialization

### In main.go (REQUIRED FIRST STEP)

```go
import "insight-engine-backend/services"

func main() {
    // BEFORE any other initialization
    services.InitLogger("insight-engine-backend")
    
    // Rest of initialization...
}
```

---

## 2. Migration Patterns

### Pattern 1: Simple Info Logging

**Before:**

```go
log.Println("✅ Database connected")
fmt.Printf("Server started on port %s\n", port)
```

**After:**

```go
services.LogInfo("database_connect", "Database connected successfully", nil)
services.LogInfo("server_start", "Server started", map[string]interface{}{
    "port": port,
})
```

### Pattern 2: Error Logging

**Before:**

```go
log.Printf("Error connecting to database: %v", err)
fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
```

**After:**

```go
services.LogError("database_connect", "Failed to connect to database", map[string]interface{}{
    "error": err,
})
services.LogError("config_load", "Failed to load configuration", map[string]interface{}{
    "error": err,
})
```

### Pattern 3: Warning Logging

**Before:**

```go
log.Println("⚠️ .env file not found, using system env")
```

**After:**

```go
services.LogWarn("env_load", ".env file not found, using system environment variables", nil)
```

### Pattern 4: Debug Logging (Development Only)

**Before:**

```go
if os.Getenv("DEBUG") == "true" {
    log.Printf("Query: %s, Params: %v", query, params)
}
```

**After:**

```go
services.LogDebug("query_execute", "Executing database query", map[string]interface{}{
    "query":  query,
    "params": params,
})
```

### Pattern 5: Context-Aware Logging (Handlers)

**Before:**

```go
func MyHandler(c *fiber.Ctx) error {
    userID := c.Locals("userId").(string)
    log.Printf("User %s performed action", userID)
}
```

**After:**

```go
func MyHandler(c *fiber.Ctx) error {
    userID := c.Locals("userId").(string)
    
    services.LogInfo("user_action", "User performed action", map[string]interface{}{
        "user_id": userID,
        "action": "specific_action_name",
    })
}
```

### Pattern 6: Performance Logging

**Before:**

```go
start := time.Now()
// ... operation ...
log.Printf("Operation took %v", time.Since(start))
```

**After:**

```go
start := time.Now()
// ... operation ...
services.LogInfo("operation_complete", "Operation completed", map[string]interface{}{
    "duration_ms": time.Since(start).Milliseconds(),
    "operation": "operation_name",
})
```

### Pattern 7: Fatal Errors

**Before:**

```go
log.Fatalf("❌ Failed to connect: %v", err)
```

**After:**

```go
services.LogFatal("startup_failure", "Failed to initialize critical service", map[string]interface{}{
    "error": err,
    "service": "database",
})
```

---

## 3. Operation Naming Conventions

Use snake_case operation names that describe the action:

**Good:**

- `user_login`
- `database_query`
- `schema_discovery`
- `connection_create`
- `export_generate`

**Bad:**

- `Login` (not snake_case)
- `handle` (too vague)
- `process` (too generic)
- `func1` (meaningless)

---

## 4. Metadata Best Practices

### Always Include

- `user_id` - For user-initiated actions
- `request_id` - For request tracing (if available)
- `error` - For error logs
- `duration_ms` - For performance tracking

### Often Include

- `resource_id` - ID of affected resource
- `operation` - Specific sub-operation
- `status` - Result status
- `count` - Number of items processed

### Never Include

- ❌ Passwords
- ❌ API keys
- ❌ Sensitive PII
- ❌ Full SQL queries with user data

---

## 5. Files to Migrate (Priority Order)

### Batch 1: Core Services (HIGH PRIORITY)

- [ ] `main.go` - Server startup logging
- [ ] `handlers/auth_handler.go` - Authentication events
- [ ] `services/audit_service.go` - Audit trail
- [ ] `middleware/auth_middleware.go` - Auth checks

### Batch 2: Database & Connectors

- [ ] `database/postgres.go`
- [ ] `database/mongodb.go`
- [ ] `database/sqlserver.go`
- [ ] `services/schema_discovery.go`

### Batch 3: Query & Execution

- [ ] `services/query_executor.go`
- [ ] `services/query_builder.go`
- [ ] `services/materialized_view.go`

### Batch 4: Business Logic

- [ ] `handlers/*.go` (all handlers)
- [ ] `services/*.go` (all services)

---

## 6. Testing Structured Logs

### Local Development

```bash
# Run server
go run main.go

# Logs will appear in JSON format:
{"timestamp":"2026-02-09T18:30:00Z","level":"INFO","service":"insight-engine",...}
```

### Production Integration

```bash
# Logs can be piped to log aggregators:
./insight-engine | tee -a /var/log/insight-engine.log

# Or sent to logging services:
./insight-engine 2>&1 | fluentd
```

---

## 7. Verification Checklist

After migration:

- [ ] No `log.Println` or `log.Printf` in code
- [ ] No `fmt.Printf` for logging (only for user output)
- [ ] No `console.log` equivalent patterns
- [ ] All errors logged with `services.LogError`
- [ ] Performance-critical operations logged with duration
- [ ] User actions include `user_id` metadata
- [ ] Build passes without errors
- [ ] Logs are valid JSON (test with `| jq`)

---

## 8. Quick Find & Replace Guide

### PowerShell Commands

```powershell
# Find all log.Println usage
Get-ChildItem -Recurse -Filter *.go | Select-String "log.Println" | Select-Object Path,LineNumber,Line

# Find all fmt.Printf usage (review each - some are valid)
Get-ChildItem -Recurse -Filter *.go | Select-String "fmt.Printf" | Select-Object Path,LineNumber,Line

# Count remaining violations
(Get-ChildItem -Recurse -Filter *.go | Select-String "log.Print").Count
```

---

## 9. Example: Complete Handler Migration

**Before:**

```go
func CreateUser(c *fiber.Ctx) error {
    userID := c.Locals("userId").(string)
    
    var req CreateUserRequest
    if err := c.BodyParser(&req); err != nil {
        log.Printf("Failed to parse request: %v", err)
        return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
    }
    
    log.Printf("User %s creating new user: %s", userID, req.Email)
    
    // ... business logic ...
    
    log.Println("User created successfully")
    return c.JSON(user)
}
```

**After:**

```go
func CreateUser(c *fiber.Ctx) error {
    userID := c.Locals("userId").(string)
    
    var req CreateUserRequest
    if err := c.BodyParser(&req); err != nil {
        services.LogError("user_create_parse", "Failed to parse create user request", map[string]interface{}{
            "user_id": userID,
            "error": err,
        })
        return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
    }
    
    services.LogInfo("user_create_start", "Creating new user", map[string]interface{}{
        "user_id": userID,
        "target_email": req.Email,
    })
    
    // ... business logic ...
    
    services.LogInfo("user_create_success", "User created successfully", map[string]interface{}{
        "user_id": userID,
        "new_user_id": user.ID,
    })
    return c.JSON(user)
}
```

---

## Completion Status

- [x] Logger service created (`services/logger.go`)
- [ ] main.go updated with InitLogger
- [ ] Batch 1 files migrated
- [ ] Batch 2 files migrated
- [ ] Batch 3 files migrated
- [ ] Batch 4 files migrated
- [ ] Verification complete
- [ ] Build passing
