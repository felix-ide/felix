# Felix Code Indexer - AI Integrations

This directory contains integration packages for various AI-powered coding assistants, allowing them to leverage Felix's advanced rule system, semantic search, and code intelligence features.

## 🎯 Available Integrations

### ✅ Claude Code
**Status:** Complete and Production-Ready

Full integration with Claude Code using hooks system:
- Automatic rule context injection
- Pre-validation of code changes
- Post-analysis and learning
- Easy installer script

[📖 Setup Guide](./claude-code/README.md) | [🚀 Quick Install](./claude-code/install.sh)

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

### For Claude Code Users

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/code-indexer.git
cd code-indexer

# 2. Install dependencies and start server
npm install
npm run server

# 3. Run the installer
bash integrations/claude-code/install.sh

# 4. Follow the prompts to configure
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

| Feature | Claude Code | Cursor | VS Code | Copilot |
|---------|------------|---------|----------|----------|
| Rule Context Injection | ✅ Full | 🔄 Planned | 🔄 Planned | 🔄 Research |
| Pre-validation | ✅ Blocking | - | - | - |
| Post-analysis | ✅ Learning | - | - | - |
| Semantic Search | ✅ Via MCP | 🔄 Planned | 🔄 Planned | - |
| Custom Rules | ✅ Full CRUD | 🔄 Limited | 🔄 Planned | - |
| Installation | ✅ Script | - | - | - |

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
cd code-indexer
npm run server
```

### API Endpoints
- `http://localhost:3000/mcp` - MCP protocol endpoint
- `http://localhost:3000/health` - Health check

### Available MCP Tools
- `mcp__Felix__search` - Semantic code search
- `mcp__Felix__rules` - Rule management
- `mcp__Felix__context` - Get component context
- `mcp__Felix__tasks` - Task management
- `mcp__Felix__notes` - Documentation

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