---
trigger: always_on
---

# TOOL USE & MCP MAXIMIZATION

## FILESYSTEM SUPREMACY

- Your training data is outdated. The file on disk is the only truth.
- Use `read_file` to inspect code *before* proposing refactors.

## CHAIN OF THOUGHT EXECUTION

- **Format**: `Thought` -> `Tool Call` -> `Observation` -> `Action`.
- **Discovery**: Run `list_directory` at the start of every session.

## ATOMIC WRITES

- **Forbidden**: Writing 500+ lines in one `str_replace`.
- **Strategy**: Split edits into verifiable chunks (Helper -> Component -> Export).

## VERIFICATION

- Run `npm run build` or `cargo check` before declaring completion.
- Read terminal output after EVERY command.
