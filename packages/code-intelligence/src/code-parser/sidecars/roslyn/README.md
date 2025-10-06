# Roslyn Sidecar Process

This directory contains the C# Roslyn sidecar process for advanced semantic analysis of C# code. The sidecar provides rich semantic information beyond what traditional LSP servers or syntax-only parsers can offer.

## Overview

The Roslyn sidecar is a standalone .NET console application that uses Microsoft's Roslyn compiler APIs to provide:

- Full semantic model access
- Type hierarchy information
- Control flow graph analysis
- Data flow analysis
- Compilation diagnostics
- Symbol resolution with semantic understanding
- Custom analyzer support
- Incremental parsing with caching

## Architecture

```
┌─────────────────────┐       JSON-RPC        ┌──────────────────────┐
│   Node.js Process   │ ◄─────── stdio ─────► │   C# Sidecar Process │
│                     │                       │                      │
│ RoslynSidecarService│                       │     Program.cs       │
│                     │                       │  ┌─────────────────┐ │
│ Enhanced C# Parser  │                       │  │ JsonRpcServer   │ │
│                     │                       │  └─────────────────┘ │
└─────────────────────┘                       │  ┌─────────────────┐ │
                                              │  │SemanticAnalysis │ │
                                              │  │    Engine       │ │
                                              │  └─────────────────┘ │
                                              │  ┌─────────────────┐ │
                                              │  │ WorkspaceManager│ │
                                              │  └─────────────────┘ │
                                              └──────────────────────┘
```

## Components

### C# Sidecar Application

#### Program.cs
Main entry point supporting multiple modes:
- `stdio`: JSON-RPC server over stdio (primary mode)
- `analyze`: Direct file analysis
- `workspace`: Workspace operations

#### JsonRpcServer.cs
JSON-RPC 2.0 server implementation handling:
- Request/response protocol
- Notifications
- Error handling
- Message framing

#### SemanticAnalysisEngine.cs
Core semantic analysis using Roslyn APIs:
- Syntax tree parsing with caching
- Semantic model creation
- Symbol extraction
- Diagnostic collection
- Control flow analysis
- Data flow analysis

#### WorkspaceManager.cs
MSBuild workspace management:
- Solution/project loading
- Document management
- Compilation creation
- Symbol resolution across projects

### Models

#### JsonRpcModels.cs
JSON-RPC protocol message definitions

#### SemanticModels.cs
Data models for semantic analysis results:
- CodeSymbol: Rich symbol information
- CodeLocation: Source position data
- TypeHierarchy: Inheritance relationships
- ControlFlowNode: Control flow graph nodes
- DataFlowAnalysis: Variable flow analysis
- DiagnosticInfo: Compilation diagnostics

### Node.js Integration

#### RoslynSidecarService.ts
Service wrapper managing the C# process:
- Process lifecycle management
- JSON-RPC communication
- Request/response handling
- Auto-restart capability
- Timeout management

#### RoslynEnhancedCSharpParser.ts
Enhanced C# parser integrating Roslyn:
- Roslyn sidecar integration
- Tree-sitter fallback
- Result caching
- Workspace context
- Error handling

## Building and Setup

### Prerequisites

- .NET 8.0 SDK or later
- MSBuild (included with .NET SDK)

### Build Instructions

1. **Restore dependencies:**
   ```bash
   cd packages/code-intelligence/src/code-parser/sidecars/roslyn
   dotnet restore
   ```

2. **Build the application:**
   ```bash
   dotnet build -c Release
   ```

3. **Publish (optional):**
   ```bash
   dotnet publish -c Release --self-contained false
   ```

The built executable will be available at:
- Debug: `bin/Debug/net8.0/RoslynSidecar.exe` (or `RoslynSidecar` on Linux/macOS)
- Release: `bin/Release/net8.0/RoslynSidecar.exe`

### Testing the Sidecar

**Direct file analysis:**
```bash
dotnet run -- analyze --file TestFile.cs --output result.json
```

**Workspace loading:**
```bash
dotnet run -- workspace --path /path/to/solution.sln
```

**JSON-RPC mode:**
```bash
dotnet run -- stdio
```

## Usage

### From Node.js

```typescript
import { RoslynSidecarService } from './services/RoslynSidecarService.js';

const service = new RoslynSidecarService({
  enableLogging: true,
  requestTimeout: 30000
});

// Analyze a file
const result = await service.analyzeFile('path/to/file.cs');
console.log(`Found ${result.symbols.length} symbols`);

// Load workspace
const workspace = await service.loadWorkspace('path/to/solution.sln');
console.log(`Loaded ${workspace.documentCount} documents`);

// Get advanced analysis
const controlFlow = await service.getControlFlow('path/to/file.cs');
const dataFlow = await service.getDataFlow('path/to/file.cs');
const typeHierarchy = await service.getTypeHierarchy('path/to/file.cs');
```

### Enhanced Parser

```typescript
import { RoslynEnhancedCSharpParser } from './parsers/RoslynEnhancedCSharpParser.js';

const parser = new RoslynEnhancedCSharpParser({
  enableRoslyn: true,
  enableFallback: true,
  enableCaching: true
});

// Parse with enhanced analysis
const result = await parser.parseFile('file.cs', {
  workspaceRoot: '/path/to/workspace',
  preferSemanticAnalysis: true
});

// Access rich metadata
if (result.metadata.hasControlFlow) {
  const controlFlow = await parser.getControlFlowGraph('file.cs');
}
```

## API Reference

### JSON-RPC Methods

#### Workspace Methods
- `workspace/load`: Load solution or project
- `workspace/info`: Get workspace information
- `workspace/symbol`: Find symbols in workspace
- `workspace/diagnostics`: Get workspace diagnostics

#### Document Methods
- `textDocument/analyze`: Analyze a document
- `textDocument/documentSymbol`: Get document symbols
- `textDocument/didOpen`: Document opened notification
- `textDocument/didChange`: Document changed notification
- `textDocument/didSave`: Document saved notification
- `textDocument/didClose`: Document closed notification

#### Analysis Methods
- `textDocument/controlFlow`: Get control flow graph
- `textDocument/dataFlow`: Get data flow analysis
- `textDocument/typeHierarchy`: Get type hierarchy
- `textDocument/diagnostics`: Get document diagnostics

### Service Events

```typescript
service.on('started', () => console.log('Sidecar started'));
service.on('error', (error) => console.error('Sidecar error:', error));
service.on('exit', (code, signal) => console.log('Sidecar exited'));
service.on('diagnostics', (diagnostics) => console.log('New diagnostics'));
```

## Features

### Semantic Analysis
- Full type information
- Symbol accessibility and modifiers
- Generic type parameters
- Method signatures and parameters
- Property accessors
- Attribute information
- Documentation comments

### Advanced Analysis
- **Control Flow Graphs**: Method-level control flow analysis
- **Data Flow Analysis**: Variable usage and assignment tracking
- **Type Hierarchy**: Inheritance and implementation relationships
- **Cross-References**: Symbol usage across files
- **Diagnostics**: Compilation errors and warnings

### Performance Optimizations
- **Incremental Parsing**: Syntax tree caching based on content hash
- **Lazy Loading**: On-demand semantic model creation
- **Memory Management**: Automatic cache cleanup
- **Workspace Caching**: Reuse loaded projects and solutions

### Error Handling
- Graceful fallback to Tree-sitter parsing
- Process restart on crashes
- Timeout handling for long operations
- Detailed error reporting and diagnostics

## Configuration

### Sidecar Configuration
```typescript
const config = {
  executablePath: '/path/to/RoslynSidecar',
  args: ['stdio'],
  requestTimeout: 30000,
  enableLogging: true,
  workingDirectory: process.cwd(),
  autoRestart: true,
  maxRestartAttempts: 3
};
```

### Parser Configuration
```typescript
const config = {
  enableRoslyn: true,
  enableFallback: true,
  enableCaching: true,
  maxCacheSize: 100,
  sidecarTimeout: 15000
};
```

## Troubleshooting

### Common Issues

1. **Sidecar fails to start:**
   - Ensure .NET 8.0 SDK is installed
   - Check executable path and permissions
   - Verify working directory exists

2. **Workspace loading fails:**
   - Ensure MSBuild is available
   - Check project file format and dependencies
   - Verify target framework compatibility

3. **Analysis timeouts:**
   - Increase request timeout
   - Check for very large files
   - Monitor memory usage

4. **JSON-RPC errors:**
   - Enable logging for detailed error messages
   - Check stdin/stdout connectivity
   - Verify message formatting

### Debugging

Enable detailed logging:
```typescript
const service = new RoslynSidecarService({
  enableLogging: true
});
```

Use direct analysis mode for testing:
```bash
dotnet run -- analyze --file TestFile.cs
```

Monitor process output:
```typescript
service.on('stderr', (data) => console.error('Sidecar stderr:', data));
```

## Limitations

- Requires .NET 8.0 runtime
- MSBuild required for workspace operations
- Memory usage scales with workspace size
- Cross-platform executable distribution complexity
- Startup overhead for process initialization

## Future Enhancements

- Custom analyzer support
- Incremental workspace updates
- Background analysis queuing
- Result persistence
- Multi-project workspace support
- Performance profiling and optimization