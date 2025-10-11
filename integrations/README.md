# Felix Code Indexer - AI Integrations

This directory contains integration packages for various AI-powered coding assistants, allowing them to leverage Felix's advanced rule system, semantic search, and code intelligence features.

## 🎯 Available Integrations

### ✅ Claude Code (Hooks)
**Status:** Complete and Production-Ready

Original integration with Claude Code using hooks system:
- Automatic rule context injection
- Pre-validation of code changes
- Post-analysis and learning
- Easy installer script
- **Note**: Requires separate MCP server setup

[📖 Setup Guide](./claude-code/README.md) | [🚀 Quick Install](./claude-code/install.sh)

### ✅ Claude Code (Plugin)
**Status:** Complete and Production-Ready

**NEW!** Official Claude Code plugin format:
- Bundles MCP server + hooks together
- One-click installation
- Automatic configuration
- Easier setup than hooks-only integration
- Future marketplace support

[📖 Setup Guide](./claude-code-plugin/README.md) | [🚀 Quick Install](./claude-code-plugin/install.sh)

### ✅ OpenAI Codex CLI
**Status:** Complete and Production-Ready

**NEW!** MCP server integration for OpenAI Codex CLI:
- TOML-based MCP server configuration (~/.codex/config.toml)
- Full Felix MCP tools access (search, tasks, workflows, rules, etc.)
- Simple installer script
- **Note**: MCP tools only - no automatic rule injection hooks

[📖 Setup Guide](./codex/README.md) | [🚀 Quick Install](./codex/install.sh)

### 🔄 Cursor (Planned)
**Status:** Research Phase

Potential integration approaches:
- `.cursorrules` file for rule injection
- Custom extension using Cursor's API
- Integration with Cursor's AI Rules feature

### 🔄 VS Code (Planned)
**Status:** Design Phase

Options being explored:
- VS Code extension with Felix MCP client
- Integration with GitHub Copilot Chat
- Custom language server protocol implementation

### 🔄 GitHub Copilot (Planned)
**Status:** Research Phase

Investigating:
- Copilot Chat participant API
- Workspace context providers
- Custom prompt engineering

## 🚀 Quick Start

### For Claude Code Users (Plugin - Recommended)

```bash
# 1. Start Felix server in your project
cd /path/to/your/project
npm run dev

# 2. Run the plugin installer
bash integrations/claude-code-plugin/install.sh

# 3. Follow the prompts to configure

# 4. Restart Claude Code
```

### For Claude Code Users (Hooks)

```bash
# 1. Start Felix server in your project
cd /path/to/your/project
npm run dev

# 2. Run the hooks installer
bash integrations/claude-code/install.sh

# 3. Follow the prompts to configure

# 4. Configure MCP server separately in settings.json
```

### For Codex Users

```bash
# 1. Start Felix server in your project
cd /path/to/your/project
npm run dev

# 2. Run the Codex installer
bash integrations/codex/install.sh

# 3. Follow the prompts to configure

# 4. Start Codex and Felix tools will be available
```

## 🏗️ Architecture

All integrations follow a similar pattern:

```
Integration
    ↓
Felix MCP Server (localhost:3000)
    ↓
Code Indexer Core
    ├── Rule System
    ├── Semantic Search
    ├── Code Analysis
    └── Learning Pipeline
```

## 🔧 Integration Capabilities

Each integration can potentially access:

### Rule System
- **Pattern Rules**: Coding standards and best practices
- **Constraint Rules**: Security and validation requirements
- **Semantic Rules**: Context-aware suggestions
- **Automation Rules**: Code generation templates

### Search & Analysis
- Semantic code search
- Component relationship mapping
- Dependency analysis
- Pattern recognition

### Learning & Adaptation
- Track rule effectiveness
- Learn from user modifications
- Improve suggestions over time

## 📊 Feature Comparison

| Feature | Claude Code (Plugin) | Claude Code (Hooks) | Codex | Cursor | VS Code | Copilot |
|---------|---------------------|---------------------|-------|---------|----------|----------|
| MCP Server | ✅ Bundled | ⚠️ Manual | ✅ Auto | 🔄 Planned | 🔄 Planned | 🔄 Research |
| Rule Context Injection | ✅ Hooks | ✅ Hooks | ❌ None | 🔄 Planned | 🔄 Planned | 🔄 Research |
| Pre-validation | ✅ Blocking | ✅ Blocking | ❌ None | - | - | - |
| Post-analysis | ✅ Learning | ✅ Learning | ❌ None | - | - | - |
| Semantic Search | ✅ Via MCP | ✅ Via MCP | ✅ Via MCP | 🔄 Planned | 🔄 Planned | - |
| Task Management | ✅ Via MCP | ✅ Via MCP | ✅ Via MCP | - | - | - |
| Rules Management | ✅ Via MCP | ✅ Via MCP | ✅ Via MCP | 🔄 Limited | 🔄 Planned | - |
| Installation | ✅ One-click | ✅ Script | ✅ Script | - | - | - |
| Setup Difficulty | ⭐ Easy | ⭐⭐ Medium | ⭐ Easy | - | - | - |

**Note**: Codex only has MCP tools access. It does NOT have automatic rule injection or validation hooks like Claude Code.

## 🛠️ Creating New Integrations

To add support for a new AI coding assistant:

1. **Research Integration Points**
   - Hook systems
   - Extension APIs
   - Configuration files
   - Command interfaces

2. **Create Integration Directory**
   ```
   integrations/your-tool/
   ├── README.md
   ├── install.sh (if applicable)
   └── configuration files
   ```

3. **Implement MCP Client**
   - Connect to Felix server
   - Handle authentication
   - Implement core operations

4. **Add to Feature Matrix**
   - Update this README
   - Document capabilities
   - Add examples

## 📡 Felix MCP Server

All integrations communicate with the Felix MCP server:

### Starting the Server
```bash
cd /path/to/your/project
npm run dev
```

### API Endpoints
- `http://localhost:9000/api/health` - Health check
- `http://localhost:9000` - Felix UI

### Available MCP Tools
- `mcp__felix__search` - Semantic code search
- `mcp__felix__context` - Get component context with relationships
- `mcp__felix__tasks` - Task and workflow management
- `mcp__felix__workflows` - Configure and validate workflows
- `mcp__felix__notes` - Documentation with mermaid/excalidraw
- `mcp__felix__rules` - Define and enforce coding standards
- `mcp__felix__checklists` - Manage task checklists
- `mcp__felix__projects` - Index and manage projects
- `mcp__felix__degradation` - Automatic metadata cleanup

## 🔒 Security Considerations

- Felix server runs locally only
- No code is sent to external services
- Rules are stored in local database
- Sensitive patterns are never logged

## 📚 Documentation

- [Felix Rule System Guide](../docs/rules.md)
- [MCP Protocol Documentation](../docs/mcp.md)
- [API Reference](../docs/api.md)

## 🤝 Contributing

We welcome contributions for new integrations! Please:

1. Open an issue describing the integration
2. Research the tool's extension capabilities
3. Create a proof of concept
4. Submit a pull request with documentation

## 📄 License

Each integration may have different licensing requirements based on the target platform's terms of service. The Felix core system is [your license here].

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/code-indexer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/code-indexer/discussions)
- **Email**: support@your-domain.com

---

*Felix brings intelligent code understanding to your favorite AI coding assistants.*