# CodeIndexer CLI Guide

This document explains how to use the CodeIndexer command-line interface for creating, querying, and serving code indices.

## Installation

First, ensure all dependencies are installed:

```bash
cd tools/felix
npm install
```

Make the CLI executable:

```bash
chmod +x cli.js
```

## Basic Usage

The CLI provides several commands:

```bash
./cli.js <command> [options]
```

Or if not executable:

```bash
node cli.js <command> [options]
```

## Available Commands

### Create an Index

Create a new index file from a codebase:

```bash
./cli.js create-index <directory> <output-file>
```

Example:
```bash
./cli.js create-index /path/to/project /path/to/project-index.md
```

This scans the directory for code files and creates an index file with:
- File paths (mapped to IDs)
- Empty sections for systems, interfaces, etc.

### Run the API Server

Start the HTTP server to handle index queries:

```bash
./cli.js serve [--port=3333]
```

The server provides these endpoints:
- `POST /register` - Register an index file for a project
- `POST /query` - Query an index
- `GET /projects` - List registered projects

### Run a Single Query

Execute a single query against an index file:

```bash
./cli.js query <index-file> <query>
```

Examples:
```bash
./cli.js query ./project-index.md "EXPAND CS1"
./cli.js query ./project-index.md "CONTEXT CL1" 
./cli.js query ./project-index.md "DEEP_EXPAND P1"
./cli.js query ./project-index.md "FIND_REFS F1>10"
```

### Interactive Mode

Start an interactive session for running multiple queries:

```bash
./cli.js interactive <index-file>
```

This starts a REPL where you can enter queries and see results immediately.

## Query Types

The following query types are supported:

- `EXPAND <id>` - Expand a code snippet or documentation section
- `CONTEXT <id>` - Show all related components for a context link
- `DEEP_EXPAND <id>` - Recursively expand a pipeline flow with code snippets
- `FIND_REFS <file>><line>` - Find all references to a specific line of code

## Integration Examples

### Shell Alias

Create a shell alias for quick queries:

```bash
# Add to .bashrc or .zshrc
alias code-index="./tools/felix/cli.js"
```

### Piping to Claude

Use with Claude CLI:

```bash
./cli.js query ./project-index.md "EXPAND CS1" | claude
```

### Automated Index Updates

Add to Git pre-commit hooks:

```bash
# .git/hooks/pre-commit
#!/bin/bash
./tools/felix/cli.js create-index . ./code-index.md
git add ./code-index.md
```

## Troubleshooting

If you encounter issues:

1. **Permissions**: Ensure CLI file is executable (`chmod +x cli.js`)
2. **Dependencies**: Verify all npm packages are installed
3. **File paths**: Use absolute paths when referencing files outside current directory
4. **Server connection**: Ensure port isn't blocked by firewall or used by another app

## Server API Reference

When running in server mode, these endpoints are available:

### Register an Index

```
POST /register
{
  "projectId": "my-project",
  "indexPath": "/path/to/index.md"
}
```

### Query an Index

```
POST /query
{
  "projectId": "my-project",
  "query": "EXPAND CS1"
}
```

### List Projects

```
GET /projects
```

## Environment Variables

- `DEBUG=true` - Enable verbose logging
- `PORT=3333` - Set server port (can also use --port flag)

## Exit Codes

- `0` - Success
- `1` - Error (invalid arguments, query failed, etc.)