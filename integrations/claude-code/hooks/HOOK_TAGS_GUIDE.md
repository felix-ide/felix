# Felix Hook Tags Guide

## Overview

Felix rules can be tagged with `stable_tags` to indicate which Claude Code hook contexts they're most relevant for. This improves rule relevance and reduces noise by showing the most contextually appropriate rules.

## Available Hook Contexts

### 1. `user-prompt-submit`
Rules that should be shown when the user submits a new prompt.

**Use for:**
- General project guidelines and conventions
- High-level architecture decisions
- Security and compliance rules
- Code review standards

**Example:**
```javascript
{
  name: "Always use TypeScript strict mode",
  rule_type: "constraint",
  priority: 7,
  stable_tags: ["user-prompt-submit", "typescript", "configuration"],
  guidance_text: "All TypeScript files must use strict mode..."
}
```

### 2. `pre-tool-use`
Rules that should be validated before Edit/Write operations.

**Use for:**
- File-specific formatting rules
- Import organization standards
- Naming conventions
- Code structure patterns

**Example:**
```javascript
{
  name: "Components must use PascalCase",
  rule_type: "pattern",
  priority: 6,
  stable_tags: ["pre-tool-use", "naming", "react"],
  guidance_text: "React components must use PascalCase naming..."
}
```

### 3. `post-tool-use`
Rules for validating completed code changes.

**Use for:**
- Quality checks
- Test coverage requirements
- Documentation requirements
- Performance considerations

**Example:**
```javascript
{
  name: "New features require tests",
  rule_type: "constraint",
  priority: 8,
  stable_tags: ["post-tool-use", "testing", "quality"],
  guidance_text: "All new features must include unit and integration tests..."
}
```

### 4. `session-end`
Rules for session-level feedback and retrospectives.

**Use for:**
- Workflow improvement suggestions
- Pattern adoption tracking
- Technical debt reminders

**Example:**
```javascript
{
  name: "Review TODOs before ending session",
  rule_type: "pattern",
  priority: 5,
  stable_tags: ["session-end", "workflow"],
  guidance_text: "Before ending the session, review and prioritize any TODO comments..."
}
```

## Multi-Context Tags

Rules can have multiple hook context tags if they're relevant to multiple scenarios:

```javascript
{
  name: "Never commit secrets",
  rule_type: "constraint",
  priority: 10,
  stable_tags: ["pre-tool-use", "post-tool-use", "user-prompt-submit", "security"],
  guidance_text: "Never commit API keys, passwords, or other secrets..."
}
```

## Tag Boosting Strategy

Hooks boost rules with matching tags in their semantic search:
- Rules with exact hook tag matches get higher relevance
- Rules without hook tags are still shown but ranked lower
- Multiple tags increase relevance

## Best Practices

1. **Be Specific**: Use hook tags to target rules to the most relevant moments
2. **Avoid Over-Tagging**: Don't tag rules with all hooks - be selective
3. **Priority Matters**: Higher priority rules (≥5) are shown even without tag matches
4. **Combine Tags**: Use hook tags + domain tags (e.g., "security", "testing", "typescript")

## Adding Tags to Rules

### Via MCP Tool
```javascript
await mcp__felix__rules({
  project: "/path/to/project",
  action: "update",
  rule_id: "rule_12345",
  stable_tags: ["pre-tool-use", "typescript", "naming"]
});
```

### Via HTTP API
```bash
curl -X PUT http://localhost:9000/api/rules/rule_12345 \
  -H "Content-Type: application/json" \
  -H "x-project-path: /path/to/project" \
  -d '{"stable_tags": ["pre-tool-use", "typescript", "naming"]}'
```

## Hook Query Enhancement

Hooks automatically include their context tag in semantic searches to boost relevant rules:

```javascript
// PreToolUse hook includes "pre-tool-use" in search
const query = "code modification refactoring pre-tool-use";

// This boosts rules tagged with "pre-tool-use" in semantic ranking
const results = await searchRulesSemantic(query, 20);
```
