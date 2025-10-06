# AIgent Smith Framework Overview

This document provides a comprehensive overview of the AIgent Smith Framework, a portable system designed to enhance AI-assisted development through efficient context management, documentation, and codebase navigation.

## Core Principles

The AIgent Smith Framework addresses several critical challenges in AI-assisted development:

1. **Context Preservation**: Preventing critical information loss during context compression
2. **Navigation Efficiency**: Enabling rapid access to documentation without excessive tool calls
3. **Consistent Collaboration**: Establishing a portable framework across projects
4. **Prioritized Information**: Ensuring the most important context is preserved and highlighted
5. **Project Bootstrapping**: Providing a reusable framework for new projects

## Framework Components

### 1. Initialization System

The initialization system bootstraps Claude's context with critical instructions:

- **Purpose**: Ensures Claude understands how to navigate the project and maintain context
- **Process**: Follows a defined sequence to load essential documentation
- **Signature Verification**: Uses a canary symbol (🐦) to verify instruction compliance
- **Critical Instruction Box**: Presents key instructions in a visually distinct format
- **Location**: `/prompting-framework/init.md`, `/prompting-framework/claude-code/CLAUDE.md`

### 2. Architecture Indexing System

The architecture index provides a compact reference to the entire system:

- **Purpose**: Creates an ultra-efficient navigation system for large codebases
- **Format**: Organizes components, patterns, and implementations with unique IDs
- **Query Operations**: Supports lookups like "COMPONENT C3" for quick navigation
- **Cross-References**: Maintains links between related components 
- **Location**: `/docs/00-system-architecture.md`

### 3. Self-Documenting System

The self-documenting approach maintains context between sessions:

- **Purpose**: Creates a structured framework for AI-human collaboration
- **Current Work Tracking**: Uses `current-work.md` as the source of truth
- **Status Indicators**: Uses consistent markers (🔄✅⏳🧪🐛📝)
- **Reference Chaining**: Implements precise file:line references
- **Location**: `/docs/001-self-documenting-system.md`

### 4. Code Indexing System

The code indexer enables efficient navigation of source code:

- **Purpose**: Provides AI with precise access to code without bloating context
- **Format**: Defines a structured format for code references
- **Query Operations**: Supports operations like EXPAND, CONTEXT, and DEEP_EXPAND
- **Integration**: Works with various AI assistant workflows
- **Location**: `/tools/felix/`

## Context Management Strategy

The framework implements a sophisticated context management strategy:

### During Active Sessions

1. **Start with Current Work**: Always begin by examining `current-work.md`
2. **Use Index References**: Navigate using architecture index IDs instead of searching
3. **Update Documentation**: Maintain documentation alongside code changes
4. **Track Status**: Use consistent status indicators
5. **Reference Precisely**: Use file:line format for all references

### Context Compression Handling

When AI context is compressed:

1. **NEVER modify CLAUDE.md**: This file contains static instructions
2. **Use .claude.context.md**: Store context summaries in this file
3. **Preserve Critical Elements**:
   - The critical instruction box
   - Current focus areas 
   - Status from current-work.md
   - All signature verification requirements
   - Key implementation patterns

### After Context Refresh

1. Re-read `prompting-framework/init.md` completely
2. Re-verify the signature symbol (🐦)
3. Check `current-work.md` for latest status
4. Review `docs/00-system-architecture.md` for architecture updates
5. Load `.claude.context.md` if it exists

## Project Bootstrapping Process

To deploy this framework in a new project:

1. Copy `/prompting-framework/` folder
2. Copy `/docs/00-system-architecture.md` (template)
3. Copy `/docs/001-self-documenting-system.md`
4. Create `current-work.md` for the project
5. Customize the architecture index for the project
6. Generate `CLAUDE.md` with the critical instruction box

## Tool Commands

### Framework Initialization

The `mcp__init_framework` tool bootstraps the AIgent Smith framework:

```
<mcp:tool name="mcp__init_framework" input="{
  \"projectName\": \"your-project-name\", 
  \"targetDirectory\": \"/path/to/project\"
}" />
```

This creates the necessary folder structure and initial files.

### Architecture Index Management

The `mcp__update_architecture_index` tool manages the architecture index:

```
<mcp:tool name="mcp__update_architecture_index" input="{
  \"operation\": \"create\",  
  \"sourcePath\": \"/path/to/docs\", 
  \"outputPath\": \"/path/to/docs/00-system-architecture.md\"
}" />
```

Supported operations: `create`, `update`, `rebuild`

### Code Index Management

The `mcp__code_indexer` tool manages code indices:

```
<mcp:tool name="mcp__code_indexer" input="{
  \"operation\": \"create\",
  \"projectPath\": \"/path/to/project\",
  \"outputPath\": \"/path/to/code-index.md\"
}" />
```

Supported operations: `create`, `update`, `query`

## Framework Directory Structure

```
/project-root/
  /prompting-framework/
    /init.md                        # Main initialization instructions
    /docs/
      /workflow/
        /ai-partner-workflow.md     # Workflow guidelines
    /claude-code/
      /CLAUDE.md                    # Static instructions for Claude
      /claude-initialization.md     # Guide for initialization
      /claude.context.md.template   # Template for context storage
  /docs/
    /00-system-architecture.md      # Architecture index
    /001-self-documenting-system.md # Self-documenting system guide
    /[project-specific-docs]        # Project documentation
  /current-work.md                  # Source of truth for current status
  /tools/
    /felix/                  # Code indexing tools
  /.claude.context.md               # Context storage (not in git)
```

## Benefits

This framework provides several key benefits:

1. **Reduced Context Window Usage**: Ultra-compact indexing format
2. **Prioritized Information**: Critical context is explicitly highlighted
3. **Navigation Efficiency**: Reduces unnecessary tool calls
4. **Portable Framework**: Can be established in any project
5. **Progressive Enhancement**: Builds context over time without loss
6. **Consistent Mental Model**: Shared understanding between humans and AI

## Implementation Notes

- The critical instruction box MUST NEVER be modified
- The signature verification system is essential for ensuring instructions are followed
- Documentation should always be updated alongside code changes
- The current-work.md file is the source of truth for project status
- The architecture indexing format is designed for AI consumption, not human readability
- The code indexer should be integrated into development workflows for maximum benefit