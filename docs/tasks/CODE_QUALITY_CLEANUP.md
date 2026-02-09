# 🧹 Code Quality Cleanup - Master Task List

**Objective:** Eliminate ALL code inconsistencies to achieve 100% GEMINI.md compliance  
**Status:** 🔴 **IN PROGRESS** - Phase 5 Complete, Phases 6-11 Remaining  
**Started:** 2026-02-09  
**Target Completion:** 2026-02-16 (1 week sprint)

---

## 📊 Current State

| Area | Violations | Status | Priority |
|------|-----------|--------|----------|
| **Backend: log.Print*** | 16 (exempt) | ✅ 84% Complete | - |
| **Backend: fmt.Print*** | 22 (was 23) | ⏳ 4% Started | 🔴 **HIGH** |
| **Backend: panic()** | 0 (was 1) | ✅ **100% DONE** | - |
| **Frontend: console.*** | 4427 | ❌ Not Started | 🟡 **MEDIUM** |
| **Error Handling** | Unknown | ❌ Not Audited | 🟡 **MEDIUM** |
| **Code Complexity** | Unknown | ❌ Not Audited | 🟢 **LOW** |
| **Function Length** | Unknown | ❌ Not Audited | 🟢 **LOW** |
| **Naming Conventions** | Unknown | ❌ Not Audited | 🟢 **LOW** |

**Overall Compliance:** ~22% (Phase 7 complete, Phase 6 started)
**Last Updated:** 2026-02-09 19:33

---

## 🎯 Task Breakdown

### **PHASE 6: Backend fmt.Print* Migration** 🔴 CRITICAL

**Objective:** Replace all `fmt.Print*` with structured logging  
**Priority:** 🔴 **HIGH**  
**Effort:** 2-3 hours  
**Dependencies:** Phase 5 complete ✅

#### Subtasks

- [x] **TASK-6.1:** Migrate `services/usage_tracker.go` (1 violation) ✅ **DONE 2026-02-09**
  - Line 120: Alert threshold check failure
  - Replaced with `services.LogWarn` for non-fatal errors

- [ ] **TASK-6.2:** Migrate `services/temp_table_service.go` (2 violations)
  - Line 312: Failed to drop expired table
  - Line 318: Failed to delete metadata
  - Replace with `services.LogError`

- [ ] **TASK-6.3:** Migrate `services/semantic_service.go` (2 violations)
  - Line 218, 277: Failed to load conversation history
  - Replace with `services.LogWarn`

- [ ] **TASK-6.4:** Migrate `services/rate_limiter.go` (2 violations)
  - Line 167, 360: Failed to log rate limit violation
  - Replace with `services.LogError`

- [ ] **TASK-6.5:** Migrate `services/{json,excel,csv}_importer.go` (3 violations)
  - Performance timing logs
  - Replace with `services.LogDebug` (only in dev mode)

- [ ] **TASK-6.6:** Migrate `services/email_service.go` (9 violations)
  - Line 260-268: Console mode email preview
  - **DECISION REQUIRED:** Keep console output for dev mode or use structured logging?
  - Recommended: Use `services.LogInfo` with `dev_email_preview` operation

- [ ] **TASK-6.7:** Migrate `middleware/ratelimit/redis_limiter.go` (1 violation)
  - Line 75: Redis error warning
  - Replace with `services.LogWarn`

- [ ] **TASK-6.8:** Migrate `handlers/visual_query_handler.go` (2 violations)
  - Line 225, 260: Failed to invalidate cache warnings
  - Replace with `services.LogWarn`

- [ ] **TASK-6.9:** Build verification
  - Run `go build` to ensure no errors
  - Run application and verify logs are structured

**Acceptance Criteria:**

- ✅ All 23 `fmt.Print*` replaced with structured logging
- ✅ Build passes without errors
- ✅ Manual testing confirms logs are JSON formatted
- ✅ No functionality broken

**Completion:** ⏳ **In Progress** - 1/23 tasks done (4.3%)
**Started:** 2026-02-09 19:33

---

### **PHASE 7: Backend panic() Elimination** 🔴 CRITICAL

**Objective:** Replace `panic()` with proper error handling  
**Priority:** 🔴 **CRITICAL** (Production stability)  
**Effort:** 30 minutes  
**Dependencies:** None

#### Subtasks

- [x] **TASK-7.1:** Fix `services/export_service.go` line 119 ✅ **DONE 2026-02-09**

  ```go
  // BEFORE (FORBIDDEN):
  panic(fmt.Sprintf("failed to create export directory: %v", err))
  
  // AFTER (CORRECT):
  return nil, fmt.Errorf("failed to create export directory %s: %w", exportDir, err)
  ```

  - ✅ Updated function signature to return `(*ExportService, error)`
  - ✅ Propagated error to caller
  - ✅ Added structured logging (LogError + LogInfo)

- [x] **TASK-7.2:** Audit entire codebase for other `panic()` calls ✅ **DONE 2026-02-09**
  - ✅ Confirmed only 1 panic() existed (export_service.go)
  - ✅ Dashboard verification: panic(): 0
  - ✅ No additional violations found

- [x] **TASK-7.3:** Build and test ✅ **DONE 2026-02-09**
  - ✅ Build passes: `go build` exit code 0
  - ⚠️ Export functionality not actively used in main.go (future feature)
  - ✅ Error propagation pattern verified

**Acceptance Criteria:**

- ✅ Zero `panic()` calls in production code (init() functions exempt)
- ✅ All errors properly propagated
- ✅ Export functionality works correctly
- ✅ Error messages are user-friendly

**Completion:** ✅ **100% COMPLETE** - 2026-02-09 19:30

---

### **PHASE 8: Frontend Logging Infrastructure** 🟡 MEDIUM

**Objective:** Build structured logging system for frontend  
**Priority:** 🟡 **MEDIUM**  
**Effort:** 4-6 hours  
**Dependencies:** None

#### Subtasks

- [ ] **TASK-8.1:** Research frontend logging solutions
  - Evaluate: Winston, Pino, custom solution
  - Decision: Log only to backend API or also to browser console in dev?
  - Document ADR (Architecture Decision Record)

- [ ] **TASK-8.2:** Create `lib/logger.ts`

  ```typescript
  // Structured logger for frontend
  interface LogMetadata {
    [key: string]: any;
  }
  
  export const logger = {
    info: (operation: string, message: string, metadata?: LogMetadata) => {...},
    warn: (operation: string, message: string, metadata?: LogMetadata) => {...},
    error: (operation: string, message: string, metadata?: LogMetadata) => {...},
    debug: (operation: string, message: string, metadata?: LogMetadata) => {...},
  };
  ```

- [ ] **TASK-8.3:** Implement environment-aware logging
  - Development: Log to console + backend
  - Production: Log only to backend API
  - Never log sensitive data (tokens, passwords)

- [ ] **TASK-8.4:** Create backend endpoint for frontend logs
  - POST `/api/logs/frontend`
  - Rate limit: 100 requests/minute per user
  - Store in separate `frontend_logs` table or send to observability tool

- [ ] **TASK-8.5:** Integrate error boundary with logger
  - Capture React errors
  - Send to backend with component stack trace

**Acceptance Criteria:**

- ✅ Logger utility created and tested
- ✅ Backend endpoint for logs created
- ✅ Environment-aware behavior works
- ✅ Error boundary integration complete
- ✅ Documentation written

**Completion:** **/**/____

---

### **PHASE 9: Frontend console.* Migration** 🟡 MEDIUM

**Objective:** Replace 4300+ `console.*` calls with structured logging  
**Priority:** 🟡 **MEDIUM**  
**Effort:** 8-12 hours (batched approach)  
**Dependencies:** Phase 8 complete

#### Strategy

**NOT feasible to migrate all 4300+ manually.** Use **tiered approach:**

1. **Critical Paths (Manual):** Auth, API calls, data mutations
2. **Scripts/Tests (Keep):** E2E tests, dev scripts can keep console logs
3. **Components (Automated):** Use codemod/regex replace for patterns

#### Subtasks

- [ ] **TASK-9.1:** Categorize console.* usage
  - Run analysis script to group by file type:
    - Production app code (`app/`, `components/`, `lib/`)
    - Test code (`tests/`, `*.spec.ts`)
    - Dev scripts (`scripts/`)
  - Determine: ~X production, ~Y test, ~Z script

- [ ] **TASK-9.2:** Create exemption list
  - Tests and dev scripts can keep `console.*`
  - Add ESLint rule: `no-console` with exemptions
  - Document in `.eslintrc.json`

- [ ] **TASK-9.3:** Migrate critical production code (Manual)
  - `app/**/*.tsx` - Auth flows, data fetching
  - `lib/**/*.ts` - Utilities, API clients
  - `components/**/*.tsx` - User-facing components
  - Estimated: ~500-800 violations

- [ ] **TASK-9.4:** Create codemod for pattern replacement (Automated)

  ```typescript
  // Pattern 1: Simple logs
  console.log('Message') → logger.info('operation', 'Message')
  
  // Pattern 2: With variables
  console.error('Error:', err) → logger.error('operation', 'Error occurred', { error: err })
  ```

- [ ] **TASK-9.5:** Run codemod on remaining files
  - Dry run first
  - Manual review of changes
  - Commit in batches

- [ ] **TASK-9.6:** Enable ESLint `no-console` rule
  - Production code: Error
  - Test/script code: Warning

**Acceptance Criteria:**

- ✅ Zero `console.*` in production code paths
- ✅ ESLint rule enforced
- ✅ Tests still pass
- ✅ Application functionality unchanged

**Completion:** **/**/____

---

### **PHASE 10: Error Handling Audit** 🟡 MEDIUM

**Objective:** Ensure consistent error handling patterns  
**Priority:** 🟡 **MEDIUM**  
**Effort:** 6-8 hours  
**Dependencies:** Phases 6-7 complete

#### GEMINI.md Requirements

- **Backend:** Every endpoint must handle errors with try/catch or error returns
- **Frontend:** Every API call must have `.catch()` or try/catch
- **User Feedback:** Errors must show toast/alert, not silent failures

#### Subtasks

- [ ] **TASK-10.1:** Backend error handling audit
  - Run script to find all handler functions
  - Check each for proper error handling
  - Document violations

- [ ] **TASK-10.2:** Frontend API call audit
  - Find all `fetch()` and `axios` calls
  - Ensure all have error handling
  - Ensure user gets feedback (toast/alert)

- [ ] **TASK-10.3:** Create error handling utilities

  ```typescript
  // Frontend
  export async function apiCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      logger.error('api_call_failed', 'API request failed', { error: err });
      toast.error('Something went wrong');
      throw err;
    }
  }
  ```

- [ ] **TASK-10.4:** Standardize error response format

  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input",
      "details": { "field": "email", "reason": "invalid format" }
    }
  }
  ```

- [ ] **TASK-10.5:** Document error handling patterns
  - Add to `docs/ERROR_HANDLING.md`
  - Include examples for common scenarios

**Acceptance Criteria:**

- ✅ All API endpoints have error handling
- ✅ All frontend API calls have .catch() or try/catch
- ✅ Standard error format used everywhere
- ✅ User always gets feedback on errors
- ✅ Documentation complete

**Completion:** **/**/____

---

### **PHASE 11: Code Complexity & Style** 🟢 LOW

**Objective:** Enforce GEMINI.md code style requirements  
**Priority:** 🟢 **LOW** (Non-breaking improvements)  
**Effort:** 10-15 hours  
**Dependencies:** Phases 6-10 complete

#### GEMINI.md Requirements

- **Max indentation:** 3 levels (use guard clauses)
- **Max function length:** 50 lines
- **Max file length:** 300 lines (excluding config files)
- **Naming:** Semantic names (no `d`, `x`, use `daysUntilExpiration`)

#### Subtasks

- [ ] **TASK-11.1:** Setup linting tools
  - Backend: `golangci-lint` with complexity rules
  - Frontend: ESLint with complexity plugin
  - Configure max function lines, cyclomatic complexity

- [ ] **TASK-11.2:** Run complexity analysis
  - Generate report of violations
  - Prioritize by severity

- [ ] **TASK-11.3:** Refactor high-complexity functions
  - Extract helper functions
  - Use guard clauses to reduce nesting
  - Split into multiple functions if needed

- [ ] **TASK-11.4:** Refactor long files
  - Split into logical modules
  - Extract reusable components

- [ ] **TASK-11.5:** Variable naming audit
  - Find single-letter variables
  - Rename to semantic names
  - Use search/replace carefully

- [ ] **TASK-11.6:** Enable linting in CI/CD
  - Add to GitHub Actions
  - Fail builds on violations

**Acceptance Criteria:**

- ✅ No functions exceed 50 lines
- ✅ No files exceed 300 lines (except configs)
- ✅ Max indentation level is 3
- ✅ No single-letter variables (except loop counters)
- ✅ Linting passes in CI/CD

**Completion:** **/**/____

---

### **PHASE 12: Documentation & Testing** 🟢 LOW

**Objective:** Ensure code quality changes are documented and tested  
**Priority:** 🟢 **LOW**  
**Effort:** 4-6 hours  
**Dependencies:** All previous phases

#### Subtasks

- [ ] **TASK-12.1:** Update COMPLIANCE.md
  - Mark all sections as complete
  - Update compliance percentage to 100%

- [ ] **TASK-12.2:** Create STYLE_GUIDE.md
  - Document all code style requirements
  - Include examples and anti-patterns

- [ ] **TASK-12.3:** Add pre-commit hooks
  - Run linters before commit
  - Block commits with violations

- [ ] **TASK-12.4:** Update CI/CD pipeline
  - Add all linting checks
  - Add complexity checks
  - Add test coverage requirements

- [ ] **TASK-12.5:** Team training
  - Code review with team
  - Explain new patterns
  - Answer questions

**Acceptance Criteria:**

- ✅ All documentation updated
- ✅ Pre-commit hooks installed
- ✅ CI/CD enforces all rules
- ✅ Team trained on new standards

**Completion:** **/**/____

---

## 📅 Sprint Plan (1 Week)

### **Day 1-2: Backend Cleanup (Critical)**

- ✅ Phase 6: fmt.Print* migration (3 hours)
- ✅ Phase 7: panic() elimination (30 min)
- Total: ~4 hours

### **Day 3-4: Frontend Infrastructure**

- ✅ Phase 8: Frontend logging infrastructure (6 hours)
- ✅ Phase 9.1-9.3: Frontend console.* (manual migration) (8 hours)
- Total: ~14 hours

### **Day 5: Frontend Automation**

- ✅ Phase 9.4-9.6: Frontend console.* (automated migration) (4 hours)

### **Day 6: Error Handling**

- ✅ Phase 10: Error handling audit (8 hours)

### **Day 7: Polish & Docs**

- ✅ Phase 11: Code complexity (select high-priority issues) (6 hours)
- ✅ Phase 12: Documentation (4 hours)

**Total Effort:** ~40-45 hours (1 full week dedicated sprint)

---

## 🚨 Critical Path

**MUST DO IMMEDIATELY (Production Stability):**

1. Phase 7: panic() elimination ← **BLOCKS DEPLOYMENT**
2. Phase 6: fmt.Print* migration ← **BLOCKS MONITORING**

**SHOULD DO THIS SPRINT (Code Quality):**
3. Phase 8-9: Frontend logging ← **BLOCKS OBSERVABILITY**
4. Phase 10: Error handling ← **BLOCKS USER EXPERIENCE**

**CAN DEFER (Nice to Have):**
5. Phase 11: Complexity refactoring ← **ITERATIVE IMPROVEMENT**
6. Phase 12: Documentation ← **DEVELOPER EXPERIENCE**

---

## 📊 Progress Tracking

**Overall Progress:** [ ] 0% → [ ] 100%

| Phase | Status | Completion Date | Notes |
|-------|--------|----------------|-------|
| Phase 5: log.Print* | ✅ Complete | 2026-02-09 | 84% migrated (16 exempt) |
| Phase 6: fmt.Print* | ⏳ In Progress | - | 1/23 done (4.3%) |
| Phase 7: panic() | ✅ Complete | 2026-02-09 | 1/1 fixed (100%) |
| Phase 8: Frontend Logger | ⏳ Pending | - | - |
| Phase 9: console.* | ⏳ Pending | - | - |
| Phase 10: Error Handling | ⏳ Pending | - | - |
| Phase 11: Complexity | ⏳ Pending | - | - |
| Phase 12: Documentation | ⏳ Pending | - | - |

---

## 🎯 Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Backend fmt.Print*** | 22 | 0 | ⏳ (4% done) |
| **Backend panic()** | 0 | 0 | ✅ |
| **Frontend console.*** (prod) | 4427 | <1000 | ❌ |
| **Error handling coverage** | Unknown | 100% | ❌ |
| **Functions > 50 lines** | Unknown | 0 | ❌ |
| **Files > 300 lines** | Unknown | <10 | ❌ |
| **GEMINI.md Compliance** | 22% | 100% | ⏳ |

---

## 🔥 BRUTAL MIRROR: Reality Check

**This is NOT a small task.** Fixing 4300+ console logs alone could take days.

**Strategy:**

1. Fix **critical production issues** first (panic, fmt.Print*)
2. Build **infrastructure** (frontend logger)
3. Use **automation** where possible (codemod)
4. Be **pragmatic** - tests can keep console logs
5. Make **incremental progress** - don't aim for 100% in one sprint

**Expected realistic outcome after 1 week:**

- ✅ Backend: 100% clean
- ✅ Frontend logger: Built and ready
- ✅ Frontend critical paths: Migrated
- ✅ Frontend tests/scripts: Exempted (documented)
- ⏳ Frontend full migration: 60-70% (ongoing)

**Full 100% completion:** ~2-3 weeks with dedicated effort.

---

## 📝 Notes

- Update this file daily with progress
- Mark tasks complete with ✅ and date
- Document blockers immediately
- Celebrate small wins!

---

**Created:** 2026-02-09  
**Owner:** Backend Team (Phases 6-7), Frontend Team (Phases 8-9)  
**Reviewer:** Tech Lead  
**Next Review:** 2026-02-16

**LET'S CLEAN THIS CODEBASE! 🧹**
