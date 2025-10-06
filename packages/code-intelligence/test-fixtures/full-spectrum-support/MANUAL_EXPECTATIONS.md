# Full Spectrum Fixture – Manual Expectations

This document records the ground-truth components and relationships that **should** exist in the `full-spectrum-project` fixture, independent of the current parser output. Counts are derived directly from the authored source files and documentation, not from the indexing pipeline.

## Summary (hand-counted)

- **Top-level components:** 132
- **Cross-entity relationships:** 109
- **Ignored files:** `baseline-metrics.json`, `COVERAGE.md`, and `README.md` (support files only)

A machine-readable copy of these expectations lives in `manual-expected-metrics.json` and mirrors the tables below.

> **Mismatch alert:** The existing parser reports 213 components and 396 relationships for this fixture. Comparing to the manual counts shows sizable over-reporting (e.g., Markdown files missing sections, JSON inflated, etc.). Treat this document as the source of truth while fixing the parsers.

---

## Documentation

### docs/architecture.md (26 components / 33 relationships)
- Components: 1 document root, 1 H1 section, 12 `FILE_PATHS` entries (F1–F12), 2 `SYSTEMS` entries, 1 `PIPELINE_FLOWS`, 2 `CODE_SNIPPETS`, 1 `DOCS_SECTIONS`, 1 `CONTEXT_LINKS`, 4 narrative bullet items, 1 blockquote, 1 Mermaid diagram.
- Relationships: 12 file documentation links, 6 system→file references, 4 pipeline flow hops, 2 code snippet→file links, 1 docs section→testdata link, 5 context link targets, 3 inline links (EmailService, task, rule).

### docs/runbook.md (15 components / 16 relationships)
- Components: 1 H1, 1 H2, 4 ordered list items, 3 H3 sections, 3 bullet items, Mermaid block, JSON block, concluding narrative.
- Relationships: 4 checklist references to code files, 3 bullet links, 5 Mermaid edges, 2 inline Rowan references (`compute_layout`, `component.ts`), 2 `[[INDEX:...]]` macros.

### testdata/mixed.md (11 components / 7 relationships)
- Components: 1 H1, 3 H2 sections, 2 task list items, 1 rule item, descriptive paragraph, Markdown quote block, 2 index macros.
- Relationships: task→path link, rule→component links (2), snippet references to F1/F4 (2), macros for `FIND_REFS` and `DEEP_EXPAND` (2).

---

## JavaScript / TypeScript / JSX

### src/javascript/component.ts (18 components / 13 relationships)
- Components: interfaces `BaseEntity`, `GraphNode`, `GraphEdge`, `LayoutOptions`, `LayoutStrategy`; enum `LayoutMode`; type aliases `SceneGraph`, `NodeTransformer`; decorator `LogInvocation`; classes `LayoutAlgorithm`, `ForceDirectedLayout`, `GridLayout`; functions `createLayoutStrategy`, `graphToScene`, `traverseEdges`, `loadNodeFormatter`; constants `sceneDefaults`, `graphEvents`.
- Relationships: `GraphNode`→`BaseEntity` (extends), `GraphEdge`→`BaseEntity`, `LayoutAlgorithm`→`LayoutStrategy` (implements), `ForceDirectedLayout`/`GridLayout`→`LayoutAlgorithm` (extends), `SceneGraph` references `GraphNode`/`GraphEdge`/`LayoutMode`, `LayoutStrategy` references `SceneGraph`/`LayoutMode`, `graphToScene`→`createLayoutStrategy`, dynamic import to `./utilities.js`, `sceneDefaults` typed `SceneGraph`.

### src/javascript/main.js (2 / 4)
- Components: class `VisualizationApp`, function `startVisualization` (default export).
- Relationships: static imports from `widget.jsx`, `component.ts`, `utilities.js`; dynamic import of `../python-bridge.js`.

### src/javascript/utilities.js (5 / 3)
- Components: functions `formatNodeLabel`, `computeDegreeMap`, `buildSceneAsync`; class `ForceLayoutRuntime`; const `RUNTIME_VERSION`.
- Relationships: static import from `component.ts`; dynamic import of `loadNodeFormatter`; dependency on `traverseEdges` for degree map.

### src/javascript/widget.jsx (3 / 1)
- Components: functions `initializeWidget`, `attachEventBridges`, `GraphWidget` component.
- Relationships: import of `sceneDefaults` from `component.ts`.

### src/python-bridge.js (1 / 1)
- Components: function `fetchFocusMetadata`.
- Relationships: HTTP call to `/api/graph/:id`.

---

## Python

### src/python/app.py (7 / 7)
- Components: constants `app`, `CONFIG_PATH`; functions `load_config`, `health_check`, `graph_endpoint`, `notify_failure`, coroutine `hydrate_from_file`.
- Relationships: imports from `utils.graph` (compute_layout, GraphSnapshot, stream_snapshots), `async_worker.consume_queue`, dynamic import of `php_bridge.send_email`, queue hand-off between `hydrate_from_file` and `consume_queue`.

### src/python/async_worker.py (2 / 0)
- Components: coroutine `consume_queue`, async helper `drain`.
- Relationships: internal only (no cross-file expectations).

### src/python/utils/graph.py (7 / 4)
- Components: decorator `log_invocation`, dataclasses `GraphSnapshot`, `LayoutContext`, functions `normalize_nodes`, `compute_layout`, `build_adjacency`, coroutine `stream_snapshots`.
- Relationships: `LayoutContext` extends `GraphSnapshot`, decorator wraps `normalize_nodes`, `compute_layout` calls `normalize_nodes`, `stream_snapshots` depends on `asyncio`.

---

## PHP

### src/php/index.php (2 / 6)
- Components: global `$service` instance, function `renderLayout`.
- Relationships: `require_once` EmailService and template, instantiate `EmailService`, call `render_panel`, conditionally call `notifyFailure`, embed `<script type="module" src="../javascript/main.js">`.

### src/php/services/EmailService.php (2 / 3)
- Components: trait `FormatsMessages`, class `EmailService` with methods `registerRecipient` and `notifyFailure`.
- Relationships: class implements `NotifierInterface`, uses trait `FormatsMessages`, relies on `DateTimeImmutable`.

### src/php/services/NotifierInterface.php (1 / 0)
- Component: interface `NotifierInterface`.

### src/php/templates/dashboard.php (1 / 1)
- Component: function `render_panel`.
- Relationship: dependency on `htmlspecialchars`.

---

## HTML / CSS / SQL / JSON

### src/html/index.html (6 / 2)
- Components: HTML document, `<head>`, `<body>`, `<link>` to CSS, module `<script>` block, fallback `<script nomodule>` block.
- Relationships: references `../css/styles.css` and `../javascript/main.js`.

### src/css/styles.css (6 / 1)
- Components: `@import` directive, `:root` variables, `canvas[data-layout="force"]` rule, active state rule, `@keyframes pulse`, `.fixture-highlight` rule, `@media` block.
- Relationship: import of `reset.css`.

### src/css/reset.css (1 / 0)
- Component: universal selector reset.

### src/sql/schema.sql (5 / 4)
- Components: tables `graph_nodes`, `graph_edges`, `ingestion_jobs`; view `active_jobs`; trigger `ensure_status`.
- Relationships: foreign keys from `graph_edges` to `graph_nodes` (2), `active_jobs` view over `ingestion_jobs`, trigger over `ingestion_jobs`.

### src/json/config.json (5 / 0)
- Components: root object, keys `title`, `layout`, nested object `retry`, nested object `notifications` with two arrays.
- Relationships: none expected beyond intrinsic JSON structure.

---

## Java

### src/java/src/app/Main.java (5 / 3)
- Components: class `Main`, methods `Main(List<String>)`, `run`, `process`, static `main`.
- Relationships: implements `Runnable`, implements `GraphProcessor`, uses `List.of` from `java.util`.

### src/java/src/app/GraphProcessor.java (1 / 0)
- Component: interface `GraphProcessor` with method `process` signature.

---

## Manual vs. Parser Comparison

| Metric | Manual expectation | Current parser output | Δ |
| --- | --- | --- | --- |
| Components (top-level) | 132 | 213 | **+81**
| Relationships | 109 | 396 | **+287**

The deltas highlight where the parser over-produces (e.g., JSON/Markdown) or misses intended structures (e.g., Markdown sections absent, programmatic duplicates). Each parser refactor should move the automated counts toward the manual numbers above.

---

## Next Steps

1. Update the parser harness to consume `manual-expected-metrics.json` instead of the previous auto-generated baseline.
2. For each language, diff the parser output vs. manual expectations and file tickets for the gaps.
3. After a parser is fixed, adjust the manual counts (if the fixture changes) and rerun `baseline:verify` to confirm alignment.

