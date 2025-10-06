# Fixture Notes and Tasks

## Tasks

- **task-fixture-001** — Capture graph snapshots every 5 minutes and persist to `/tmp/fixtures`.
- **task-fixture-002** — Reconcile SQL metadata with JSON config (`src/json/config.json`).

## Rules

- **rule-fixture-acceptance**
  - When the ingestion service emits a `graph:update` event, the visualization must respond within 250ms.
  - Linked components: `src/javascript/main.js`, `src/python/app.py`.

## Markdown Snippets

This document is included in the index as `F12`. It references `F1>1-60` and `F4>1-40` to validate Markdown link resolution.

```markdown
> System heartbeat ties JavaScript, Python, PHP, and Markdown together.
```

Additional references: [[INDEX:FIND_REFS F7>10]] and [[INDEX:DEEP_EXPAND PF1]].
