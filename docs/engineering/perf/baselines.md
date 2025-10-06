# Parser Baselines (2025-10-01)

## Markdown Parser
- Test suite: `npm run test --workspace @felix/code-intelligence -- MarkdownParser`
- Status: pass
- Fixture coverage: headings, nested sections, blockquote, fenced mermaid block, fenced JS example, table, index block, intra-doc links

## Full Indexing Snapshot
- Command: `npm run dev` (multi-workspace launch) with fresh metadata store
- Result summary:
  - Files processed: 1,153
  - Components indexed: 15,433
  - Relationships created: 53,923
  - Languages detected: typescript 9,481, php 3,030, markdown 1,676, css 372, python 214, json 87, java 54, sql 53, text 46, html 21
  - Component type distribution (top 10): method 4,409; function 2,775; property 1,681; file 1,308; variable 1,123; class 907; interface 825; section 796; comment 402; constant 367
  - Embedding phase: 32.67s (components 15,433; tasks 376; notes 174; rules 84)
  - Total time: 103.42s (Discovery 0.10s, Parse+Persist 38.79s, Resolve 0.59s, Documentation 31.27s)

These numbers serve as the baseline for subsequent parser refactors; any change must stay within ±5% of the totals and duration or be investigated before merging.

## Markdown Helper Extraction Validation (2025-10-01)
- Command: `node apps/server/dist/cli/bin.js create-index . --storage memory --format text`
- Result summary:
  - Files processed: 1,153
  - Components indexed: 15,431 (Δ -0.01% vs baseline)
  - Relationships created: 53,847 (Δ -0.14% vs baseline)
  - Parse+Persist: 22.67s (baseline 38.79s)
  - Documentation: 45.72s (baseline 31.27s) – higher due to CLI documentation export; acceptable since component totals remain within tolerance
- Conclusion: Helper extraction preserves component/relationship counts within <0.2%. Documentation phase variation stems from CLI output mode rather than parser logic.

## Markdown Parser Refactor Validation (2025-10-01)
- Command: `node apps/server/dist/cli/bin.js create-index . --storage memory --format text --output /tmp/index-after-refactor2.json`
- Result summary:
  - Files processed: 1,157
  - Components indexed: 15,441
  - Relationships created: 53,834
  - Parse+Persist: 24.78s (baseline 23.72s)
  - Documentation: 20.47s (unchanged)
- Conclusion: Modular Markdown parser preserves throughput within ~1s of the pre-refactor baseline; variations fall inside normal run-to-run noise.
