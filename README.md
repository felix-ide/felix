# Felix

<!--
SPDX-License-Identifier: AGPL-3.0-only OR Commercial
Copyright (c) 2025 Brett Thomas (@epoplive)
-->

A multi-package workspace that provides:
- Parser + semantic intelligence library (`packages/code-intelligence`)
- Headless gateway/CLI/MCP server (`apps/server`)
- React UI for exploring indexed projects (`apps/client`)
- Theme system and markdown extensions (under `packages/`)

## Getting Started

**Prerequisites:** Node 18+, npm 9+, Python 3.8+ (optional for embeddings)

### Quick Start

1. **Install dependencies:**
   ```bash
   git clone https://github.com/felix-ide/felix.git
   cd felix
   npm install
   ```

2. **Start Felix:**
   ```bash
   npm run dev
   ```
   This starts the full stack (server on port 9000 + UI) with hot reload and ensures the Python sidecar is ready on first run.

3. **Connect to Claude Code:**

   **Option A: Using CLI (recommended)**
   ```bash
   claude mcp add felix --transport http http://localhost:9000/mcp --scope user
   ```

   **Option B: Manual config** - Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

   For HTTP Streaming (recommended):
   ```json
   {
     "mcpServers": {
       "felix": {
         "type": "http",
         "url": "http://localhost:9000/mcp"
       }
     }
   }
   ```

   For SSE (legacy):
   ```json
   {
     "mcpServers": {
       "felix": {
         "type": "sse",
         "url": "http://localhost:9000"
       }
     }
   }
   ```

Restart Claude Code. Felix MCP tools will appear in the tool list.

Useful workspace scripts:
- `npm run build:packages` – build core packages
- `npm run build:backend` – build server only
- `npm run dev:backend` – run server + oraicle library in watch mode
- `npm run dev:frontend` – run UI + packages in watch mode

## Packages

- `packages/code-intelligence` – core parsing, embeddings, and knowledge-graph utilities
- `packages/extended-markdown` – remark/unified extensions and React helpers
- `packages/theme-system` – composable theme primitives for the UI

## Apps

- `apps/server` – MCP/HTTP/CLI server for indexing, search, tasks, notes, and rules
- `apps/client` – React UI that talks to the server via MCP/HTTP

## Development Notes

- Run `node scripts/setup.js` to verify native parsers, grammars, and optional sidecars
- Configure log verbosity via `LOG_LEVEL=debug|info|warn|error|silent`
- Generated artifacts (coverage, logs, local DBs) are ignored by Git

## Release Checklist (suggested)

- Clean working tree: remove coverage, logs, and local DBs
- Run tests in all workspaces: `npm test --workspaces`
- Lint + typecheck: `npm run lint --workspaces` and `npm run type-check --workspace @felix/client`
- Verify `files` and `exports` fields in each `package.json`
- Confirm license and README per package
- Tag and publish packages as needed (server/UI may remain private apps)

## License

```
SPDX-License-Identifier: AGPL-3.0-only OR Commercial
Copyright (c) 2025 Brett Thomas (@epoplive)
```

**Dual Licensed: AGPL-3.0 or Commercial**

This software is available under:
- The GNU AGPL v3.0 open source license, or
- A commercial license for closed-source use

Felix is free and open-source software licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

### What this means:
- ✅ Free to use, modify, and distribute
- ✅ Perfect for open-source projects
- ⚠️ If you run Felix as a network service, you must open-source your modifications
- ⚠️ Cannot be used in closed-source SaaS products without a commercial license

### Commercial License
For organizations that need to use Felix in proprietary software or SaaS products without open-sourcing their code, commercial licenses are available.

**Contact:** [GitHub Discussions](https://github.com/felix-ide/felix/discussions) or [@epoplive](https://github.com/epoplive)

Benefits of commercial licensing:
- 🔓 Use in closed-source/proprietary software
- 🎯 Priority support and consulting
- 🚀 Access to premium extensions and plugins
- ⚡ Priority bug fixes and feature development

## Links

- **Repository:** https://github.com/felix-ide/felix
- **Documentation:** https://felix-ide.github.io/felix/
- **Discussions:** https://github.com/felix-ide/felix/discussions
- **Issues:** https://github.com/felix-ide/felix/issues
