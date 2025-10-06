# Felix Rule System Integration for Claude Code

This directory contains hooks that integrate the Felix code-indexer rule system with Claude Code, providing automatic rule discovery, validation, and learning capabilities.

## Overview

The Felix rule system integration provides:
- **Automatic rule context injection** when you submit prompts
- **Pre-validation** before code modifications
- **Post-analysis** and tracking after code generation
- **Continuous learning** from successful patterns

## Hook Components

### 1. `felix-utils.sh`
Common utilities for all hooks:
- Felix MCP server communication
- Rule searching and application
- Response formatting
- Environment validation

### 2. `felix-user-prompt-submit.sh`
Runs when you submit a prompt to Claude:
- Searches for semantically relevant rules based on your prompt
- Gets file-specific rules if working on a particular file
- Fetches high-priority constraint rules
- Injects rules as system messages for Claude's awareness

### 3. `felix-pre-tool-use.sh`
Runs before Edit/Write operations:
- Validates code against applicable rules
- Blocks operations that violate security/constraint rules
- Provides warnings for pattern violations
- Suggests improvements based on best practices

### 4. `felix-post-tool-use.sh`
Runs after successful tool execution:
- Analyzes generated code for pattern compliance
- Tracks rule applications for effectiveness metrics
- Learns from successful patterns
- Updates rule analytics periodically

## Configuration

### Environment Variables
Set these in your shell profile or before running Claude:

```bash
# Felix server URL (default: http://localhost:3000)
export FELIX_SERVER_URL="http://localhost:3000"

# Project path for Felix (change to your project path)
export FELIX_PROJECT_PATH="/path/to/your/project"

# Enable debug logging
export DEBUG_MODE="true"
```

### Prerequisites

1. **Felix Server Running**: The Felix server must be running:
   ```bash
   cd /path/to/felix
   npm run dev
   ```

2. **Rules Configured**: Add rules using Felix MCP tools:
   ```bash
   # Example: Add a React best practices rule
   mcp__Felix__rules project="/path/to/project" action="add" \
     name="React Best Practices" \
     rule_type="pattern" \
     guidance_text="Use TypeScript interfaces, React.memo for performance..."
   ```

## Rule Types

### Pattern Rules
Define coding patterns and best practices:
- Component structure
- Naming conventions
- Code organization

### Constraint Rules
Enforce validation and security:
- Input validation requirements
- Security checks
- Performance constraints

### Semantic Rules
Context-aware suggestions:
- Business domain logic
- Architectural layer compliance
- Cross-cutting concerns

### Automation Rules
Generate boilerplate code:
- Component templates
- Test scaffolding
- Configuration files

## Hook Behavior

### UserPromptSubmit
- **Non-blocking**: Always continues even if Felix is unavailable
- **Priority**: High for semantic matches, medium for file-specific, low for constraints
- **Output**: System messages with rule guidance

### PreToolUse
- **Blocking**: Can prevent operations that violate critical rules
- **Focus**: Edit, Write, MultiEdit, NotebookEdit tools
- **Validation**: Security checks, pattern compliance, best practices

### PostToolUse
- **Non-blocking**: Provides feedback without interrupting flow
- **Analysis**: Pattern compliance scoring (1-5)
- **Learning**: Tracks successful patterns for future reference

## Testing Hooks

### Test Individual Hooks
```bash
# Test with mock environment variables
CLAUDE_USER_PROMPT="Create a React component" \
CLAUDE_CURRENT_FILE="/path/to/Component.tsx" \
bash ~/.claude/hooks/felix-user-prompt-submit.sh

# Check output (should be valid JSON)
```

### Debug Mode
Enable detailed logging:
```bash
export DEBUG_MODE=true
```

### Validate Environment
```bash
bash ~/.claude/hooks/felix-utils.sh
```

## Troubleshooting

### Hook Not Triggering
1. Check Claude settings.json has correct hook configuration
2. Verify scripts are executable: `chmod +x ~/.claude/hooks/*.sh`
3. Run Claude with debug: `claude --debug`

### Felix Server Connection
1. Ensure server is running: `curl http://localhost:3000/health`
2. Check FELIX_SERVER_URL environment variable
3. Verify project path exists and is indexed

### Rule Not Found
1. Index the project first: `mcp__Felix__projects action="index"`
2. Add rules using Felix MCP tools
3. Check rule is active: `mcp__Felix__rules action="list"`

## Advanced Usage

### Custom Rule Matching
Modify `felix-pre-tool-use.sh` to add custom validation logic:
```bash
# Add custom pattern checks
if [[ "$file_path" == *"critical"* ]]; then
    # Extra validation for critical files
fi
```

### Integration with CI/CD
Export rule compliance metrics:
```bash
# Get analytics
mcp__Felix__rules action="get_analytics" days_since=7
```

### Rule Learning Pipeline
The PostToolUse hook tracks:
- Successful patterns (score ≥ 4/5)
- Failed patterns (violations)
- User modifications (acceptance rate)

This data improves rule effectiveness over time.

## Security Considerations

- Hooks run with your user permissions
- Felix server should only be accessible locally
- Sensitive code patterns are analyzed but not stored
- Rule violations are logged without exposing code content

## Contributing

To improve the Felix integration:
1. Add new pattern recognizers in hooks
2. Enhance rule matching algorithms
3. Improve analytics and reporting
4. Add support for more tools

## Support

For issues or questions:
- Felix/code-indexer: [GitHub repo]
- Claude Code: https://github.com/anthropics/claude-code/issues