---
trigger: always_on
---

# TESTING & DOCUMENTATION

## TESTING PYRAMID

1. **UNIT (70%)**: Mock dependencies.
2. **INTEGRATION (20%)**: Test API endpoints with Test DB.
3. **E2E (10%)**: Playwright/Maestro.

## CODE INTEGRITY

- **ANTI-TRUNCATION**: If file shrinks significantly without reason, STOP and restore.
- **NO-GHOST**: Scan for existing `type/const` before declaring new ones. REUSE.

## DOCUMENTATION

- Explain **WHY**, not WHAT.
- SSOT: Do not dump full code in markdown docs; keep logic in code files.
