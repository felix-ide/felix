# Search Guardrails

Felix applies guardrails to search results to reduce noise and surface relevant hits. These safeguards run in both the backend MCP handler and the web UI client.

## Backend Guardrails

Defined in `src/shared/config.ts`:

- `similarityThreshold`: Floor for semantic similarity scores (default `0.2`).
- `rerank.pathDemotePatterns`: Regex patterns (coverage folders, LCOV reports, `node_modules`, etc.) used to demote or filter filesystem paths.
- `rerank.pathDemoteAmount`: Degree to demote paths that match the patterns.

The MCP `search` handler respects these defaults and exposes them in all responses.

## Web UI Guardrails

Located in `web-ui/src/config/searchGuardrails.ts` and `web-ui/src/services/api/searchClient.ts`:

- Filters out results with similarity < `MIN_SIMILARITY` (mirrors backend defaults).
- Removes components under coverage/build artifacts using the same path regex list.
- Returns `guardrailInfo` in the API response `{ removedCount, similarityFiltered, pathFiltered }`.
- `ExploreSection` surfaces guardrail notices to indicate when items were hidden.

## Client Guidance

- Respect `guardrailInfo` to communicate filtered items to users.
- When troubleshooting missing results, check whether path/similarity filters removed them.
- Update `searchGuardrails.ts` only when adding/removing patterns; keep it aligned with backend `appConfig`.

