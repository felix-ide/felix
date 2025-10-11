# Felix MCP Server Integration for Codex

This directory contains the installer for integrating Felix MCP server with OpenAI Codex CLI.

## Overview

The Felix MCP server integration provides Codex with:
- **Code intelligence and search** across your entire codebase
- **Task and workflow management** with validation bundles
- **Documentation system** with mermaid and excalidraw support
- **Coding rules and patterns** for consistency
- **Component context** with relationship tracking

## Installation

Run the installation script to configure Felix MCP server in Codex:

```bash
cd integrations/codex
bash install.sh
```

The installer will:
- Check for Codex installation
- Configure `~/.codex/config.toml` with Felix MCP server
- Set up environment variables for your project
- Test the connection to Felix server

## Configuration

### Automatic Configuration

The installer adds the following to `~/.codex/config.toml`:

```toml
[mcp_servers.felix]
command = "npx"
args = ["-y", "@felix/mcp-server"]
env.FELIX_PROJECT_PATH = "/path/to/your/project"
env.FELIX_SERVER_URL = "http://localhost:9000"
```

### Manual Configuration

You can also add Felix manually using Codex CLI:

```bash
codex mcp add felix
# Then edit ~/.codex/config.toml to add the configuration above
```

### Environment Variables

- `FELIX_PROJECT_PATH`: Path to your project directory (required)
- `FELIX_SERVER_URL`: URL of the Felix server (default: http://localhost:9000)

## Prerequisites

1. **Codex Installed**: Install from https://github.com/openai/codex
2. **Felix Server Running**: Start the Felix server:
   ```bash
   cd /path/to/your/project
   npm run dev
   ```
3. **Project Indexed**: Felix will automatically index your project on first connection

## Available MCP Tools

Once configured, Codex can use these Felix tools:

### Code Intelligence
- `mcp__felix__search` - Semantic search across code and documentation
- `mcp__felix__context` - Get full context for components with relationships

### Task Management
- `mcp__felix__tasks` - Create, update, and manage tasks
- `mcp__felix__workflows` - Configure and validate task workflows
- `mcp__felix__checklists` - Manage task checklists

### Documentation
- `mcp__felix__notes` - Create notes with markdown, mermaid, and excalidraw

### Rules & Patterns
- `mcp__felix__rules` - Define and enforce coding standards
- `mcp__felix__degradation` - Automatic metadata cleanup

### Project Management
- `mcp__felix__projects` - Index and manage projects

## Usage Examples

### Search for Code
```
codex> Search for all authentication functions
[Felix will use mcp__felix__search to find auth-related code]
```

### Create a Task
```
codex> Create a task to implement user login with the feature_development workflow
[Felix will use mcp__felix__tasks with workflow validation]
```

### Get Code Context
```
codex> Show me the full context for the UserService class
[Felix will use mcp__felix__context to show code + relationships]
```

### Define a Coding Rule
```
codex> Create a rule that all API endpoints must have error handling
[Felix will use mcp__felix__rules to define a constraint rule]
```

## Workflow Support

Felix provides comprehensive workflow support with:
- **Status flows** - Define allowed state transitions
- **Validation bundles** - Require specific documentation/checklists
- **Transition gates** - Require acknowledgement before progressing
- **Auto-checklists** - Automatically add checklist items

Built-in workflows:
- `simple` - Basic todo → done flow
- `feature_development` - Comprehensive feature workflow with spec gates
- `bugfix` - Bug fix workflow with root cause analysis
- `research` - Research task workflow

## Verification

After installation, verify Felix is connected:

```bash
# List all MCP servers
codex mcp list

# Should show:
# felix - Connected
```

Test Felix is working:
```bash
# In Codex
codex> List my tasks
[Felix should respond with tasks from your project]
```

## Troubleshooting

### Felix Not Showing in MCP List
1. Check config file: `cat ~/.codex/config.toml`
2. Verify Felix server is running: `curl http://localhost:9000/api/health`
3. Restart Codex

### Connection Errors
1. Ensure Felix server is running in your project directory
2. Check `FELIX_PROJECT_PATH` matches your project location
3. Verify server URL is correct (default: http://localhost:9000)

### MCP Server Not Starting
1. Check npx is installed: `which npx`
2. Test MCP server manually: `npx -y @felix/mcp-server`
3. Check for errors in Codex logs

## Advanced Configuration

### Multiple Projects

To use Felix with multiple projects, you can:

1. **Switch projects by restarting Codex** in different directories
2. **Configure multiple instances** with different ports:

```toml
[mcp_servers.felix-project-a]
command = "npx"
args = ["-y", "@felix/mcp-server"]
env.FELIX_PROJECT_PATH = "/path/to/project-a"
env.FELIX_SERVER_URL = "http://localhost:9000"

[mcp_servers.felix-project-b]
command = "npx"
args = ["-y", "@felix/mcp-server"]
env.FELIX_PROJECT_PATH = "/path/to/project-b"
env.FELIX_SERVER_URL = "http://localhost:9001"
```

### Custom Server Port

If running Felix on a different port:

```bash
# Start Felix on custom port
FELIX_PORT=9001 npm run dev

# Update config.toml
env.FELIX_SERVER_URL = "http://localhost:9001"
```

## Updating

To update the Felix MCP server:

```bash
# Clear npx cache and reinstall
npx clear-npx-cache
npx -y @felix/mcp-server@latest
```

Or run the installer again:
```bash
bash install.sh
```

## Uninstalling

To remove Felix from Codex:

1. Edit `~/.codex/config.toml`
2. Remove the `[mcp_servers.felix]` section
3. Restart Codex

Or use Codex CLI:
```bash
codex mcp remove felix
```

## Support

For issues or questions:
- Felix Documentation: [GitHub repo]
- Codex Documentation: https://github.com/openai/codex
- Report issues: [GitHub issues]

## See Also

- [Claude Code Integration](../claude-code/) - Hooks-based integration for Claude Code
- [Claude Code Plugin](../claude-code-plugin/) - Plugin format for Claude Code
- [Felix Documentation](../../README.md) - Main Felix documentation
