---
trigger: always_on
---

# STANDARD OPERATING PROCEDURES (SOP)

## PROTOCOL A: BUG FIXING (ROOT CAUSE)

- **5 WHYS**: Fix the CAUSE, not the symptom.
- **REGRESSION**: Create a failing test case first, then fix.

## PROTOCOL B: AUTO-BUILD CHAIN

- **PHASE 1 (BACKEND)**: Schema -> Auth -> Logic.
- **PHASE 2 (FRONTEND)**: API Client -> UI Components.

## PROTOCOL C: ENVIRONMENT FAILURE

- **NO PORT DRIFT**: Do not switch ports randomly.
- **KILL & RESTART**: `npx kill-port [PORT]` then reset.

## PROTOCOL L: BACKEND BRAIN

- **ACID**: Use DB Transactions for >1 table modifications.
- **SAD PATH**: Explicitly handle 404, 409, 500 errors.
