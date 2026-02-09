# Phase 3: Refactoring Plan - 35 Oversized Files

## Objective

Refactor all files exceeding 300 lines to comply with **GEMINI.md Section 13** code quality standards.

## Strategy

Split files by logical responsibility while maintaining build integrity.

---

## BATCH 1: CRITICAL (>450 lines) - 6 files

### 1. main.go (468 → 547 lines)

**Actual size:** 547 lines (updated during analysis)

**Split Strategy:**

- `main.go` (150 lines) - Server initialization & startup
- `routes/api_routes.go` (200 lines) - Core API routes  
- `routes/admin_routes.go` (100 lines) - Admin-only routes
- `routes/ws_routes.go` (50 lines) - WebSocket routes

**Rationale:** Route registration is declarative and easily extractable

---

### 2. dashboard_handler.go (478 → 564 lines)

**Actual size:** 564 lines

**Split Strategy:**

- `dashboard_handler.go` (200 lines) - Dashboard CRUD (Get, Create, Update, Delete)
- `dashboard_card_handler.go` (250 lines) - Card operations (Add, Update, Remove, GetCards)
- `dashboard_schedule_handler.go` (100 lines) - Schedule creation

**Rationale:** Clear functional boundaries - dashboards, cards, and schedules

---

### 3. data_blender.go (460 lines)

**Split Strategy:**

- `data_blender.go` (280 lines) - Core blending logic
- `data_blender_filters.go` (180 lines) - Filter & aggregation logic

**Rationale:** Filtering logic is self-contained utility

---

### 4. materialized_view.go (452 lines)

**Split Strategy:**

- `materialized_view.go` (250 lines) - Service core & CRUD
- `materialized_view_refresh.go` (200 lines) - Refresh strategies (full/incremental)

**Rationale:** Refresh logic is complex and self-contained

---

### 5. cross_db_join.go (450 lines)

**Split Strategy:**

- `cross_db_join.go` (250 lines) - Service core & API
- `cross_db_join_algorithms.go` (200 lines) - Join implementation (nested loop, hash join)

**Rationale:** Algorithm implementation separate from orchestration

---

### 6. rest_connector.go (442 lines)

**Split Strategy:**

- `rest_connector.go` (250 lines) - Core connector logic
- `rest_auth_handlers.go` (Already exists - 348 lines, needs refactor)

**Note:** rest_auth.go already split, but still oversized

---

## BATCH 2: HIGH PRIORITY (400-449 lines) - 5 files

### 7. auth_handler.go (428 lines)

**Split Strategy:**

- `auth_handler.go` (250 lines) - Login, register, logout
- `auth_password_handler.go` (180 lines) - Password reset & email verification

---

### 8. export_service.go (439 lines)

**Split Strategy:**

- `export_service.go` (250 lines) - Service core & job management
- `export_generators.go` (190 lines) - PDF/PNG/PPTX generation logic

---

### 9. semantic_service.go (423 lines)

**Split Strategy:**

- `semantic_service.go` (250 lines) - Core service
- `semantic_generators.go` (173 lines) - SQL/Query generation from NL

---

### 10. visual_query_handler.go (407 lines)

**Split Strategy:**

- `visual_query_handler.go` (250 lines) - CRUD operations
- `visual_query_preview_handler.go` (157 lines) - Preview & execution logic

---

### 11. snowflake.go (399 lines)

**Keep as-is:** Database connector - domain-specific, cohesive

---

## BATCH 3: MEDIUM PRIORITY (350-399 lines) - 13 files

Most can be refactored by extracting:

- Test helpers → separate test utility files
- Large functions → smaller utilities  
- Type definitions → separate types file

---

## BATCH 4: LOW PRIORITY (300-349 lines) - 11 files

**Strategy:** Extract only if clear separation exists, otherwise document as acceptable complexity

---

## Execution Order

1. ✅ Batch 1 (Critical) - Maximum impact
2. ✅ Batch 2 (High) - High ROI
3. ⚠️ Batch 3 (Medium) - Evaluate case-by-case
4. ⏭️ Batch 4 (Low) - Skip if low value

---

## Success Criteria

- ✅ All files under 300 lines (excluding framework configs)
- ✅ Build passes after each refactor
- ✅ No duplicate code introduced
- ✅ Imports properly updated
- ✅ Functionality preserved
