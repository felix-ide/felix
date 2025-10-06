# AI Codebase Index Format - Machine Reference

```
# FILE_PATHS
F1:/path/to/file.js

# SYSTEMS
S1:SYSTEM_NAME|Description|
F1>10-20:Component description

# ELECTRON_APIS
E1:API_NAME|Purpose|
F2>50-70:Usage

# CRITICAL_INTERFACES
I1:INTERFACE_NAME|Purpose|
F2>100-120:Details

# PROBLEM_AREAS
P1:ISSUE_NAME|Description|
F3>150-180:Problematic code

# PIPELINE_FLOWS
PF1:FLOW_NAME|F1>Component1>F2>Component2

# CODE_SNIPPETS
CS1:SNIPPET_NAME|Description|
F3>150-180:@CODE@

# DOCS_SECTIONS
DS1:SECTION_NAME|Description|
F8>50-100:@MARKDOWN@

# CONTEXT_LINKS
CL1:CONCEPT_NAME|Description|
S2:Related system
I3:Related interface
```

## ID Syntax
- Files: F1, F2...
- Systems: S1, S2...
- APIs: E1, E2...
- Interfaces: I1, I2...
- Problems: P1, P2...
- Flows: PF1, PF2...
- Code Snippets: CS1, CS2...
- Doc Sections: DS1, DS2...
- Context Links: CL1, CL2...

## References
- Line: `F1>42`
- Range: `F1>42-50`
- Multiple: `F1>42-50,F1>100-110`
- Code: `F1>42-50:@CODE@`
- Doc: `F1>42-50:@MARKDOWN@`

## Queries
- `EXPAND CS1` - Get code/doc content
- `CONTEXT CL1` - Get related components
- `DEEP_EXPAND PF1` - Recursively expand pipeline
- `FIND_REFS F1>50` - Find references to line