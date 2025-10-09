# MCP Contracts & List Outputs

Felix surfaces Model Context Protocol (MCP) handlers for tasks, notes, rules, search, and context. These handlers are contract-driven and each tool must respect fixed request/response shapes. This document summarizes the contracts and guardrails and provides examples to aid client integrations.

## Common Conventions

- All list handlers return compact JSON objects: `{ total, offset, limit, items: [...] }`.
- `output_format: 'text'` triggers a human-friendly text summary; otherwise JSON is returned.
- `view` or `fields` can be used to limit payloads to specific projections (e.g., `ids`, `titles`, `summary`).
- Every list item always includes `id` and `title` even when older storage layers omit them.

## Tasks Tool

### List

Request shape (`TasksListRequest`):
```json
{
  "action": "list",
  "project": "...",
  "output_format": "json" | "text",
  "view": "ids" | "titles" | "summary" | "full",
  "fields": ["id", "title", ...],
  "limit": 20,
  "offset": 0,
  "parent_id": "...",
  "task_status": "...",
  "task_type": "...",
  "include_children": false
}
```

Response: `{ total, offset, limit, items: [{ id, title, task_status, task_type, parent_id, ...}] }`

### Get / Add / Update / Delete

- `add`: requires `title`; optional fields mirror server API; returns `{ content: [ JSON task payload, workflow warnings if validation fails ] }`.
- `get`: returns the task; optional expansions include notes (if `include_notes`) and child tasks (if `include_children`).
- `update`: accepts partial fields plus `spec_state`, `checklists`, `skip_validation`. Results include validation and guidance packages when validation is run.
- `get_tree`, `get_dependencies`, `add_dependency`, `suggest_next` mirror backend responses with `content: [ { ... } ]` JSON payloads.

## Notes Tool

- `list`: projection controls identical to tasks; response items include `note_type`.
- `add`: accepts `content`, optional `title`, `note_type`, `entity_links`, `stable_tags`.
- `get_spec_bundle`: returns `{ task, notes, subtasks, validation, guidance }` JSON.
- `update`, `delete` follow the REST semantics.

## Rules Tool

- `list`: fields default to `{ id, title, rule_type, active }`. Includes guardrails for automation queries.
- `add`: requires `name`, `rule_type`, `guidance_text`; optional weights and triggers are pass-through.
- `get`, `update`, `delete` are straightforward JSON wrappers.

## Projects Tool

`projects` supports `help`, `list`, `set`, `index`, `get_stats`. 

- `get_stats` returns `{ project, stats }` JSON.
- `index`/`set` return success messages only.

## Workflows Tool

Workflows expose configuration and validation controls for AI parity with the UI. Supported `action` values:

- `list|get|create|update|delete` – CRUD for workflow definitions.
- `get_default|set_default|resolve` – inspect or change defaults and per-task-type resolution.
- `get_config|update_config|reseed|guide|validate|scaffold` – existing behavioural controls (unchanged).
- `set_type_mapping|get_type_mapping` – legacy workflow ↔ task-type mapping helpers.
- `list_statuses|upsert_status|delete_status` – manage the global task status catalog. `upsert_status` expects `{ status: { name, id?, display_label?, emoji?, color?, description? } }`.
- `list_status_flows|upsert_status_flow|delete_status_flow` – CRUD reusable status flows. `status_ids` must reference existing statuses; responses include any built-in presets.
- `get_flow_mapping|set_flow_mapping` – read or update `task_type → status_flow` assignments. Bulk updates pass `flow_map: { task_type: flow_id }`; single updates use `task_type` + `flow_id` (or `flow_id_for_type`).

Every response includes both a human-readable text `content` entry and a JSON `payload` mirroring the data (`{ statuses }`, `{ flow }`, `{ map }`, etc.) so clients can parse deterministically.

## Search Tool

- Primary search accepts filters (`entity_types`, `component_types`, `path_include`, `path_exclude`, `max_results`, `context_window_size`, etc.).
- Guardrails remove coverage/node_modules paths and low-similarity matches; responses include `guardrailInfo` with counts of filtered results.
- `search_related` returns backend discover results unchanged.

## Context Tool

- Accepts `component_id` plus options (`depth`, `include_source`, `include_relationships`, `output_format`).
- Output defaults to JSON; UI-specific flows request `output_format: 'ui'` and parse the JSON `content` block.
- Light file freshness heuristics trigger background re-indexing when timestamps or hashes drift.

## Response Wrappers

Every handler responds with
```json
{ "content": [{ "type": "text", "text": "..." }], "payload": { ...optional duplicated JSON... } }
```

Clients can rely on the JSON text payload for deterministic parsing while still supporting plain-text fallbacks. The `payload` property mirrors JSON for convenience in environments where direct access is simpler.
