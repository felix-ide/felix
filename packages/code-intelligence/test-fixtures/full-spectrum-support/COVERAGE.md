# Full Spectrum Fixture Coverage Matrix

This fixture exists to stress every parser and cross-language pathway we rely on. Each checked box maps to a deliberate construct in the fixture; when we add new language features we update this table alongside the expected metrics.

| Feature | JavaScript | TypeScript | JSX | Python | PHP | HTML | CSS | Markdown | SQL | Java |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Module imports/exports | ✅ `javascript/main.js`, `javascript/utilities.js` | ✅ `javascript/component.ts` | ✅ `javascript/widget.jsx` | ✅ `python/app.py` | ✅ `php/index.php`, `services/EmailService.php` | ✅ `<script type="module">` | n/a | ✅ `docs/architecture.md` index block | n/a | ✅ `java/src/app/Main.java` |
| Dynamic import / lazy load | ✅ `main.js` (`import('../python-bridge.js')`) | ✅ `loadNodeFormatter()` | n/a | ✅ `hydrate_from_file` async iterator | n/a | n/a | n/a | n/a | n/a | n/a |
| Classes & inheritance | ✅ `ForceLayoutRuntime` | ✅ `ForceDirectedLayout` extends abstract | ✅ component function | ✅ `LayoutContext(GraphSnapshot)` | ✅ `EmailService` + trait | n/a | n/a | n/a | n/a | ✅ `Main implements GraphProcessor` |
| Interfaces / traits | n/a | ✅ `LayoutStrategy` interface | n/a | ✅ `GraphSnapshot` dataclass usage | ✅ `NotifierInterface` + trait | n/a | n/a | n/a | n/a | ✅ `GraphProcessor` interface |
| Decorators / annotations | ✅ method decorator consumed via TS | ✅ `@LogInvocation` | n/a | ✅ Flask route decorators | ✅ docblocks | n/a | n/a | n/a | n/a | n/a |
| Async / generators | ✅ generator in `utilities.js` | ✅ async loader | ✅ hooks with effects | ✅ async queue consumer + async iterator | n/a | n/a | n/a | n/a | n/a | n/a |
| Mixed-language embedding | ✅ interacts with HTML canvas | ✅ exported types consumed by JS | ✅ consumed by JS runtime | ✅ bridge to PHP + Markdown links | ✅ renders HTML via template include | ✅ inline `<script>` + `nomodule` | ✅ `@import`, keyframes, media query | ✅ index + fenced code + mermaid | n/a | n/a |
| Documentation index syntax | n/a | n/a | n/a | n/a | n/a | n/a | n/a | ✅ `docs/architecture.md`, `docs/runbook.md`, `testdata/mixed.md` | n/a | n/a |
| Markdown → code links | n/a | n/a | n/a | n/a | n/a | n/a | n/a | ✅ `F*` references, tasks/rules, `[[INDEX:...]]` | n/a | n/a |
| SQL objects & relations | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | ✅ tables, view, trigger | n/a |
| JSON references | ✅ uses `config.json` in bootstrap | ✅ typed transformers expect metadata | n/a | ✅ loads config path | ✅ payload references config | n/a | n/a | ✅ docs mention JSON config | n/a | n/a |
| Queue/async workflows | n/a | n/a | n/a | ✅ `async_worker.consume_queue` | n/a | n/a | n/a | n/a | n/a | n/a |

## Metrics Expectations

See `baseline-metrics.json` and inline constants in `src/test-fixtures/fullSpectrumBaseline.ts` for the authoritative counts. We update both the matrix and the constants whenever we change the fixture.
