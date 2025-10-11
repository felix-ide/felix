# Felix Plugin for Claude Code

This directory contains the Felix plugin for Claude Code in the official plugin format, bundling MCP server and hooks together for easy installation.

## Overview

The Felix plugin provides comprehensive code intelligence and task management for Claude Code:

### Core Features
- **Semantic Code Search** - Search your entire codebase using natural language
- **Component Context** - Get full context for any code component with relationships
- **Task Workflows** - Manage tasks with validation bundles and status flows
- **Documentation System** - Create rich docs with markdown, mermaid, and excalidraw
- **Coding Rules** - Define and enforce coding standards automatically
- **Pattern Learning** - Learn from successful patterns to improve over time

### Integrated Components
- **MCP Server** - Provides Felix tools to Claude Code
- **Hooks** - Automatic rule validation and context injection
  - `UserPromptSubmit` - Inject relevant rules when you submit prompts
  - `PreToolUse` - Validate code changes before execution
  - `PostToolUse` - Analyze and track patterns after successful operations

## Installation

### Method 1: Using the Installer (Recommended)

Run the installation script:

```bash
cd integrations/claude-code-plugin
bash install.sh
```

The installer will:
- Install the plugin to `~/.claude/plugins/felix`
- Configure MCP server in settings.json
- Set up hooks for automatic rule validation
- Configure environment variables
- Test the connection to Felix server

### Method 2: Manual Installation

1. Copy plugin files:
```bash
mkdir -p ~/.claude/plugins/felix
cp -r .claude-plugin ~/.claude/plugins/felix/
cp -r hooks ~/.claude/plugins/felix/
chmod +x ~/.claude/plugins/felix/hooks/*.sh
```

2. Update `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "felix": {
      "command": "npx",
      "args": ["-y", "@felix/mcp-server"],
      "env": {
        "FELIX_SERVER_URL": "http://localhost:9000"
      }
    }
  },
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/plugins/felix/hooks/felix-user-prompt-submit.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/plugins/felix/hooks/felix-pre-tool-use.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit|NotebookEdit|Task",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/plugins/felix/hooks/felix-post-tool-use.sh"
          }
        ]
      }
    ]
  }
}
```

3. Create environment config:
```bash
cat > ~/.felix_claude_config <<EOF
export FELIX_SERVER_URL="http://localhost:9000"
export DEBUG_MODE="false"
EOF

# Add to shell profile
echo "[ -f ~/.felix_claude_config ] && source ~/.felix_claude_config" >> ~/.zshrc
source ~/.zshrc
```

### Method 3: Using Claude Code Plugin Command (Future)

Once Felix is published to the Claude Code plugin marketplace:

```
/plugin install felix
```

## Prerequisites

1. **Claude Code** - Install from https://claude.com/claude-code
2. **Felix Server** - Running in your project:
   ```bash
   cd /path/to/your/project
   npm run dev
   ```
3. **Dependencies** - `jq` and `curl` (for installer only)

## Configuration

### Environment Variables

Set in `~/.felix_claude_config`:

```bash
# Felix server URL (required)
export FELIX_SERVER_URL="http://localhost:9000"

# Enable debug logging (optional)
export DEBUG_MODE="true"
```

### Plugin Settings

Configure in `.claude-plugin/marketplace.json`:

- `server_url` - Felix server URL (default: http://localhost:9000)
- `debug_mode` - Enable debug logging (default: false)
- `auto_index` - Automatically index projects (default: true)

## Available MCP Tools

Once installed, Claude Code can use these Felix tools:

### Code Intelligence
```typescript
mcp__felix__search       // Semantic search across code and docs
mcp__felix__context      // Get full context for components
```

### Task Management
```typescript
mcp__felix__tasks        // Create, update, manage tasks
mcp__felix__workflows    // Configure and validate workflows
mcp__felix__checklists   // Manage task checklists
```

### Documentation
```typescript
mcp__felix__notes        // Create notes with mermaid/excalidraw
```

### Rules & Patterns
```typescript
mcp__felix__rules        // Define and enforce coding standards
mcp__felix__degradation  // Automatic metadata cleanup
```

### Project Management
```typescript
mcp__felix__projects     // Index and manage projects
```

## Hook Behavior

### UserPromptSubmit Hook
- **Trigger**: When you submit any prompt to Claude
- **Behavior**: Non-blocking (always continues)
- **Actions**:
  - Searches for semantically relevant rules based on your prompt
  - Gets file-specific rules if working on a file
  - Fetches high-priority constraint rules
  - Injects rules as system messages

### PreToolUse Hook
- **Trigger**: Before Edit, Write, MultiEdit, NotebookEdit operations
- **Behavior**: Blocking (can prevent operations)
- **Actions**:
  - Validates code against applicable rules
  - Blocks operations that violate security/constraint rules
  - Provides warnings for pattern violations
  - Suggests improvements

### PostToolUse Hook
- **Trigger**: After successful tool execution
- **Behavior**: Non-blocking (provides feedback)
- **Actions**:
  - Analyzes generated code for pattern compliance
  - Tracks rule applications for effectiveness metrics
  - Learns from successful patterns
  - Updates rule analytics

## Built-in Workflows

The Felix plugin includes comprehensive workflow support:

### Feature Development
Complete Epic → Story → Task hierarchy:
- **Status Flow**: Planning → Spec Ready → In Progress → In Review → Done
- **Validation Bundles**: Architecture, ERD, UI mockups, acceptance criteria
- **Transition Gates**: Require acknowledgement before progressing
- **Auto-checklists**: Automatically add checklist items at each stage

### Bug Fix
Structured bug fixing workflow:
- **Status Flow**: Todo → Root Cause Analysis → In Progress → Testing → Done
- **Validation Bundles**: Root cause analysis, fix documentation, test coverage
- **Required Documentation**: Reproduction steps, root cause, fix description

### Research
Research task workflow:
- **Status Flow**: Todo → In Progress → Findings Documented → Done
- **Validation Bundles**: Research plan, findings documentation
- **Required Documentation**: Research notes, recommendations

### Simple
Basic workflow:
- **Status Flow**: Todo → In Progress → Done
- **No validation**: For quick tasks that don't need heavy process

## Usage Examples

### Create a Task with Workflow
```
Create a task to implement user authentication with the feature_development workflow
```

Felix will:
1. Create the task with feature_development workflow
2. Show validation status (what's missing)
3. Provide guidance on next steps
4. Enforce workflow status transitions

### Search for Code
```
Search for all authentication-related functions
```

Felix will:
1. Use semantic search across your codebase
2. Return skeleton view showing function signatures
3. Provide line numbers and file paths

### Get Component Context
```
Show me the full context for the UserService class
```

Felix will:
1. Find the UserService component
2. Get full source code
3. Include relationships (calls, imports, extends)
4. Show related documentation

### Define a Coding Rule
```
Create a rule that all API endpoints must have error handling
```

Felix will:
1. Create a constraint rule
2. Set up triggers for API-related files
3. Add validation logic
4. Apply the rule going forward

## Workflow Validation

Felix enforces workflow requirements automatically:

### Status Transitions
```
Update task status to "in_progress"
```

If the workflow defines transitions, Felix will:
- Check if transition is allowed from current status
- Validate required bundles are complete
- Show missing requirements if validation fails
- Block invalid transitions with helpful error messages

### Validation Bundles
Each workflow can require:
- **Notes**: Architecture diagrams, ERD, mockups
- **Checklists**: Acceptance criteria, test verification
- **Rules**: Entity links to coding standards
- **Child Tasks**: Required subtasks of specific types

### Transition Gates
Some transitions require acknowledgement:
- Felix creates a gate token
- You must provide the token to proceed
- Gates can auto-add checklists
- Ensures critical steps aren't skipped

## Testing the Plugin

### Verify Installation
```bash
# Check plugin is installed
ls ~/.claude/plugins/felix

# Check hooks are executable
ls -la ~/.claude/plugins/felix/hooks/*.sh

# Test Felix server connection
curl http://localhost:9000/api/health
```

### Test Hooks Individually
```bash
# Test UserPromptSubmit hook
CLAUDE_USER_PROMPT="Create a React component" \
bash ~/.claude/plugins/felix/hooks/felix-user-prompt-submit.sh

# Test PreToolUse hook
CLAUDE_TOOL_NAME="Edit" \
CLAUDE_TOOL_INPUT='{"file_path": "/test/file.ts"}' \
bash ~/.claude/plugins/felix/hooks/felix-pre-tool-use.sh
```

### Enable Debug Mode
```bash
export DEBUG_MODE=true
# Hooks will now log detailed information
```

## Troubleshooting

### Plugin Not Loading
1. Check plugin directory exists: `ls ~/.claude/plugins/felix`
2. Verify settings.json is valid JSON: `jq . ~/.claude/settings.json`
3. Restart Claude Code

### MCP Server Not Connecting
1. Check Felix server is running: `curl http://localhost:9000/api/health`
2. Verify FELIX_SERVER_URL environment variable
3. Check Claude Code logs for MCP connection errors

### Hooks Not Triggering
1. Verify hooks are executable: `chmod +x ~/.claude/plugins/felix/hooks/*.sh`
2. Check settings.json has correct hook configuration
3. Enable debug mode to see hook output

### Rules Not Applying
1. Ensure Felix server is running
2. Check rules are created in Felix UI
3. Verify hooks can connect to Felix server
4. Enable debug mode to see rule matching

## Updating the Plugin

To update to the latest version:

```bash
cd integrations/claude-code-plugin
bash install.sh
```

The installer will:
- Backup existing configuration
- Replace plugin files with new version
- Preserve your settings
- Test the connection

## Uninstalling

### Remove Plugin
```bash
rm -rf ~/.claude/plugins/felix
```

### Remove MCP Server Configuration
Edit `~/.claude/settings.json` and remove the `felix` entry from `mcpServers`.

### Remove Hooks
Edit `~/.claude/settings.json` and remove Felix hooks from the `hooks` section.

### Remove Environment Config
```bash
rm ~/.felix_claude_config
# Remove from shell profile
```

## Distribution

### Publishing to Plugin Marketplace

To publish Felix to the Claude Code plugin marketplace:

1. Ensure all files are in place:
   - `.claude-plugin/marketplace.json` (plugin manifest)
   - `hooks/` directory with all hook scripts
   - `README.md` (this file)

2. Create plugin package:
```bash
# Package will be uploaded to marketplace
zip -r felix-plugin.zip .claude-plugin hooks README.md
```

3. Submit to Claude Code plugin marketplace through their submission process

### Desktop Extension Format (.mcpb)

To create a Desktop Extension:

```bash
# Install mcpb tools
npm install -g @anthropic-ai/mcpb

# Initialize manifest
npx @anthropic-ai/mcpb init

# Pack as .mcpb
npx @anthropic-ai/mcpb pack
```

## Development

### Plugin Structure
```
claude-code-plugin/
├── .claude-plugin/
│   └── marketplace.json    # Plugin manifest
├── hooks/
│   ├── felix-utils.sh      # Shared utilities
│   ├── felix-user-prompt-submit.sh
│   ├── felix-pre-tool-use.sh
│   └── felix-post-tool-use.sh
├── install.sh              # Installation script
└── README.md              # This file
```

### Modifying Hooks

Edit hook files in `hooks/` directory:
- `felix-utils.sh` - Shared functions for all hooks
- `felix-user-prompt-submit.sh` - Rule injection logic
- `felix-pre-tool-use.sh` - Validation logic
- `felix-post-tool-use.sh` - Analytics and learning logic

After modifying, reinstall:
```bash
bash install.sh
```

### Testing Changes

1. Make changes to hook files
2. Reinstall plugin
3. Enable debug mode
4. Test in Claude Code
5. Check logs for issues

## Support

For issues or questions:
- Felix Documentation: [GitHub repo]
- Claude Code: https://github.com/anthropics/claude-code/issues
- Plugin Issues: [GitHub issues]

## See Also

- [Codex Integration](../codex/) - Integration for OpenAI Codex CLI
- [Claude Code Integration](../claude-code/) - Original hooks-only integration
- [Felix Documentation](../../README.md) - Main Felix documentation
