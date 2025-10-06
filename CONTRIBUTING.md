# Contributing to Felix

Thanks for contributing! This guide covers conventions that keep the codebase predictable for humans and tools.

## Runtime Architecture
- TypeORM-only storage
  - All metadata (tasks, notes, rules) is persisted with TypeORM repositories.
  - Legacy managers (better-sqlite3) are removed; do not add new direct-SQL storage.
- MCP handlers
- Feature files live under `apps/server/src/mcp/handlers/` (e.g., `tasks.ts`, `notes.ts`, `rules.ts`, `search.ts`, `context.ts`, `projects.ts`).
  - `handlers.ts` is a tiny router that dispatches to feature handlers.

## MCP Output Contracts
- List endpoints return compact, stable lists and support two formats. Format only changes representation, not content:
  - `output_format: "json"` → JSON object `{ total, offset, limit, items }`.
  - `output_format: "text"` → One row per item, same fields, tab-separated and human-readable.
- Defaults by tool (consistent across formats):
  - tasks.list → `['id','title','task_status','task_type','parent_id']`
  - notes.list → `['id','title','note_type']`
  - rules.list → `['id','name','rule_type','active']`
- Projections
  - `view` presets (`ids`, `names`/`titles`, `summary`, `full`) or explicit `fields: string[]` override defaults.
  - When projections are requested, JSON and text include the same fields.
- No ContentOptimizer for list endpoints. It is reserved for long “search narrative” text only.

## Logging
- Use the leveled logger from `src/shared/logger.ts` (debug/info/warn/error). Avoid `console.*`.
- Configure via `LOG_LEVEL` env var (`debug|info|warn|error|silent`).
- Keep repositories pure: return data/errors, avoid side effects and noisy logs.

## Config
- Centralize user-tunable constants in `src/shared/config.ts`.
  - Search: similarity threshold and rerank path excludes.
  - Embeddings: batch sizes.
  - Logging: default level.
- Prefer `appConfig` over ad‑hoc env reads inside business code.

## Naming & Docs
- Use professional filenames and tone (no profanity or slang in file names).
- If you rename a doc, update all references (`rg -n` is your friend).
- Add or update docs when changing public behavior or contracts.

## PR Discipline
- Zero behavior change by default. If behavior must change, call it out and update snapshots.
- Keep PRs small and thematic (routing-only, logging-only, etc.).
- Golden snapshots for MCP:
  - tasks: list/get/tree/deps
  - notes/rules: list/get
  - search: semantic universal (json projection)
- Ensure tests mock repositories/services; do not reintroduce legacy managers.

Happy hacking!
