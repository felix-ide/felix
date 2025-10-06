# Full Spectrum Parser Fixture

## Goals

Provide a deterministic mini-repo that exercises every language feature, cross-language interaction, and documentation format our indexer supports. The fixture will be used to:

- Validate parser/component/relationship counts against a golden baseline.
- Catch regressions in multi-language delegation (HTML ↔ JS/CSS, PHP ↔ HTML, Markdown fenced blocks, etc.).
- Verify Markdown index syntax (````index` blocks, `@CODE@`/`@MARKDOWN@`, `[[INDEX:...]]`, explicit component tags) produces stable documentation trees and relationships.
- Measure phase timings (discovery, parse, resolve, documentation) on a consistent workload.

## Planned Layout

```
full-spectrum-project/
  README.md                # this file (fixture spec)
  docs/
    architecture.md        # Markdown index + narrative with code links
    runbook.md             # Markdown with inline/component links and mermaid
  src/
    javascript/
      main.js              # ES modules, async imports, decorator usage
      component.ts         # TypeScript features (decorators, abstract classes, generics)
      utilities.js         # Async import, generator, shared helpers
      widget.jsx           # JSX variant, React component
    python/
      app.py               # Flask-style API calling JS modules; cross-file imports
      async_worker.py      # Async consumer + queue operations
      utils/
        graph.py           # Decorators, inheritance, async generators
    php/
      index.php            # Mixed PHP/HTML template with includes
      templates/dashboard.php
      services/EmailService.php # Namespaces, traits, docblocks
      services/NotifierInterface.php
    java/
      src/app/Main.java    # Basic class + interface usage
      src/app/GraphProcessor.java
    css/styles.css         # Uses @import and keyframes
    html/index.html        # Embeds <script>/<style> blocks, custom data attributes
    sql/schema.sql         # Table definitions + foreign keys
    json/config.json       # Multi-level structure consumed by JS & Python
  testdata/
    mixed.md               # Markdown referencing code + tasks/rules IDs
```

## Coverage Matrix

| Area | Scenario |
| --- | --- |
| JavaScript relationships | `main.js` imports/exports, dynamic `import()`, function calls, class inheritance |
| TypeScript typing | `component.ts` exports interface, enum, generic function referenced from JS |
| JSX parsing | `widget.jsx` uses hooks, cross-file imports |
| Python analysis | `app.py` imports `graph.py`, async def, decorators, context manager |
| PHP + HTML | `index.php` embeds HTML, uses `require`, defines class function calls |
| Mixed HTML | `index.html` inline `<script type="module">` invoking `main.js`, `<style>` referencing CSS classes |
| CSS relationships | `@import`, nested selectors, animation keyframes |
| SQL | Table creation + foreign keys (verify parser emits components + relationships) |
| Documentation | Markdown `architecture.md` defines index (`# FILE_PATHS`, `# SYSTEMS`, etc.), inline `[[INDEX:CONTEXT ...]]`, fenced ` ```mermaid`, code references using `F1>..` |
| Cross-language links | Markdown sections referencing JS/Python components, JS fetching `/api/graph` (Python endpoint), PHP template including JS bundle |
| Metadata | Markdown describing system components and linking to notes/tasks via `[Task:task-001]` syntax |

## Metrics to Capture

When indexing only this fixture:

- Total components per language.
- Relationship totals by type (`imports`, `calls`, `extends`, `documents`, `explains`, etc.).
- Documentation nodes created (Markdown tree depth, index entries).
- Resolve success counts (ensuring cross-file relationships resolve).
- Phase timings (Discovery, Parse+Persist, Resolve, Embeddings, Documentation).

These numbers will be stored in `baseline-metrics.json` alongside component/relationship exports for diffing.

## TODO

1. Populate the directory with concrete source files covering the scenarios above.
2. Run the indexer against the fixture, capture metrics, and author the golden baseline.
3. Add an automated regression test (e.g., `npm run test:fixture-baseline`) that indexes the fixture, compares metrics, and reports timing deltas.
4. Document how to update the baseline when intentional parser changes occur.

## Open Questions

- Do we need additional languages (e.g., C#, Go) represented in the first pass?
- Should we mirror actual production markdown snippets (component rules, task stubs) for authenticity?
- How strict should timing thresholds be to avoid flaky failures on slower CI nodes?

Feedback welcome before we cement the fixture contents.
