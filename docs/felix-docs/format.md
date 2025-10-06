# AI Codebase Indexing Format

## Purpose

This document defines the indexing format used to provide AI assistants with rapid navigation of the Darth Shader codebase. The format is specifically optimized for AI consumption rather than human readability, enabling quick retrieval of code paths and system interactions without repeatedly scanning files.

## Format Structure

The index is contained within a code block with the ```index tag and consists of multiple sections, each with a specific focus. Sections are prefixed with #.

```
# SECTION_NAME
ENTRY_ID:SHORT_NAME|Brief description|
FILE_ID>LINE_RANGE:Description
FILE_ID>LINE_RANGE:Description
...
```

## Section Types

### FILE_PATHS

Simple mapping of file IDs to absolute paths.

```
# FILE_PATHS
F1:/path/to/file.js
F2:/another/path/file.js
```

### SYSTEMS

Major application systems with their key components and file locations.

```
# SYSTEMS
S1:SYSTEM_NAME|Description|
F1>10-20:Component description
F3>100-150:Another component
```

### ELECTRON_APIS

Electron-specific API usage throughout the codebase.

```
# ELECTRON_APIS
E1:API_NAME|Purpose description|
F2>50-70:Usage description
F4>200-220:Another usage location
```

### CRITICAL_INTERFACES

Interfaces between components that require special attention.

```
# CRITICAL_INTERFACES
I1:INTERFACE_NAME|Purpose description|
F2>100-120:Implementation details
F5>200-230:Related code
```

### PROBLEM_AREAS

Specific issues or bugs with their relevant code locations.

```
# PROBLEM_AREAS
P1:ISSUE_NAME|Description|
F3>150-180:Problematic code
F6>220-240:Related problems
```

### PIPELINE_FLOWS

End-to-end execution paths through the system.

```
# PIPELINE_FLOWS
PF1:FLOW_NAME|F1>Component1>F2>Component2>F4>Component3
```

### CODE_SNIPPETS

Indexed references to important code snippets that can be expanded when needed.

```
# CODE_SNIPPETS
CS1:SNIPPET_NAME|Important code that needs context|
F3>150-180:@CODE@
```

The @CODE@ indicator tells the system to retrieve the actual code content when this entry is queried.

### DOCS_SECTIONS

Key documentation sections that can be expanded for more detailed explanations.

```
# DOCS_SECTIONS
DS1:SECTION_NAME|Brief description of this documentation section|
F8>50-100:@MARKDOWN@
```

The @MARKDOWN@ indicator tells the system to retrieve the actual documentation content when this entry is queried.

### CONTEXT_LINKS

Cross-references between related components or concepts in the codebase.

```
# CONTEXT_LINKS
CL1:CONCEPT_NAME|Brief description|
S2:Related system
I3:Related interface
CS4:Related code snippet
DS2:Related documentation
```

## ID Convention

- **Files**: F1, F2, F3, etc.
- **Systems**: S1, S2, S3, etc.
- **Electron APIs**: E1, E2, E3, etc.
- **Interfaces**: I1, I2, I3, etc.
- **Problem Areas**: P1, P2, P3, etc.
- **Pipeline Flows**: PF1, PF2, PF3, etc.
- **Code Snippets**: CS1, CS2, CS3, etc.
- **Documentation Sections**: DS1, DS2, DS3, etc.
- **Context Links**: CL1, CL2, CL3, etc.

## Line Reference Format

- **Single line**: `F1>42`
- **Line range**: `F1>42-50`
- **Multiple segments**: `F1>42-50,F1>100-110`
- **Expandable code**: `F1>42-50:@CODE@`
- **Expandable docs**: `F1>42-50:@MARKDOWN@`

## Query Operations

The index supports several query operations that can expand its utility:

### Expand Code

Query: `EXPAND CS1`
Result: The system retrieves the actual code snippet referenced by CS1.

### Expand Context

Query: `CONTEXT S2`
Result: The system identifies all related entries (from CONTEXT_LINKS) for system S2.

### Deep Expand

Query: `DEEP_EXPAND PF1`
Result: The system recursively expands all components in the pipeline flow PF1, retrieving code snippets and documentation.

### Find References

Query: `FIND_REFS F1>50`
Result: Locates all index entries that reference line 50 in file F1.

## Layered Index Structure

The index can be organized in layers for efficient access:

1. **Core Index**: Essential file paths and high-level systems
2. **Component Index**: Detailed breakdowns of each system
3. **Detail Index**: Specific implementations, code snippets, and deep context

This structure allows the AI to load only the relevant layers based on the current task, preventing context bloat.

## Usage Instructions for AI Assistants

1. When investigating an issue, first check relevant sections in the index
2. Use file IDs to quickly reference the correct files
3. Follow pipeline flows to understand execution paths
4. Focus on critical interfaces when analyzing cross-component issues
5. When planning changes, check for dependencies in the systems section
6. Use query operations to expand only the needed context

## Updating the Index

The index should be updated when:

1. New files are added to the codebase
2. System components change significantly
3. Electron API usage is modified
4. New critical interfaces are introduced
5. Problem areas are discovered or resolved
6. Important code snippets are modified

## Efficiency Benefits

This indexing approach allows AI assistants to:

1. Quickly locate relevant code without extensive file scanning
2. Understand system interactions without rebuilding context each time
3. Focus on critical areas for specific issues
4. Maintain consistent knowledge of the codebase structure
5. Make more targeted file reads and precise code changes
6. Expand specific context only when needed, avoiding context overload
7. Follow code paths through layered expansions

## Implementation Example

To implement this indexing system:

1. Create base index files for each layer (core, component, detail)
2. Build a simple query processor that can expand index entries
3. Integrate query commands into the AI workflow
4. Update indices automatically after significant code changes

By using this index, repetitive exploratory code reading is minimized, allowing the AI to work more efficiently and consistently.