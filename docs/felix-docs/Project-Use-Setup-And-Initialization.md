# CodeIndexer: Project Setup and Initialization Guide

This guide explains how to set up and use the CodeIndexer tool in your project (like darth-shader) to provide enhanced context to AI assistants.

## 1. Project Setup

### Prerequisites

- Node.js 14+ installed
- npm or yarn
- Access to your project repository

### Installation Options

#### Option A: Add as Git Submodule (Recommended)

This allows easy updates while keeping the tool separate from your project:

```bash
# From your project root
git submodule add https://github.com/your-username/felix.git tools/felix
cd tools/felix
npm install
```

#### Option B: Copy Files Directly

If you prefer keeping the tool as part of your project:

```bash
# Copy the tool files to your project
mkdir -p tools/felix
cp -r /path/to/felix/* tools/felix/
cd tools/felix
npm install
```

## 2. Create Initial Project Index

Generate an index file for your codebase:

```bash
cd your-project-root
./tools/felix/cli.js create-index . ./code-index.md
```

This creates a basic index with file paths. You'll need to enhance it with:
- System definitions
- Critical interfaces
- Code snippets 
- Context links

## 3. Enhance Your Index

Edit `code-index.md` to add important code sections. For example:

```markdown
# CODE_SNIPPETS
CS1:WINDOW_MANAGEMENT|Browser window creation code|
F2>585-614:@CODE@

# CONTEXT_LINKS
CL1:AUDIO_PROCESSING|Audio processing system overview|
S3:AUDIO_PROCESSING
F17>40-106:AudioContext setup
F18>30-100:Audio input handling
```

Focus on areas where AI assistance would be most valuable.

## 4. Setting Up for Use

### Option A: Run Local Server (Recommended)

Set up the indexer as a service:

```bash
# Start the server
cd your-project-root
./tools/felix/cli.js serve --port=3333

# In another terminal, register your project
curl -X POST http://localhost:3333/register \
  -H "Content-Type: application/json" \
  -d '{"projectId": "darth-shader", "indexPath": "./code-index.md"}'
```

### Option B: Direct CLI Use

For standalone usage without a server:

```bash
cd your-project-root
./tools/felix/cli.js query ./code-index.md "EXPAND CS1"
```

## 5. Integration with AI Workflow

### Shell Alias Method

Add to your `.bashrc` or `.zshrc`:

```bash
# Add these to your shell configuration
alias code-query="./tools/felix/cli.js query ./code-index.md"
alias start-indexer="./tools/felix/cli.js serve --port=3333"
alias register-project="curl -X POST http://localhost:3333/register -H 'Content-Type: application/json' -d '{\"projectId\": \"darth-shader\", \"indexPath\": \"./code-index.md\"}'"
```

Then use:

```bash
# Start server and register once per session
start-indexer
register-project

# Use with Claude
code-query "EXPAND CS1" | claude
```

### Message Interception Method

Set up a message interceptor for Claude:

```javascript
// In your claude-assistant tool
const axios = require('axios');

async function interceptMessage(message) {
  // Check for index query pattern
  const indexQueryMatch = message.match(/\[\[INDEX:([A-Z_]+)\s+([^\]]+)\]\]/g);
  
  if (!indexQueryMatch) return message;
  
  let processedMessage = message;
  
  for (const match of indexQueryMatch) {
    const innerMatch = match.match(/\[\[INDEX:([A-Z_]+)\s+([^\]]+)\]\]/);
    const [, command, query] = innerMatch;
    
    try {
      // Query the index server
      const response = await axios.post('http://localhost:3333/query', {
        projectId: 'darth-shader',
        query: `${command} ${query}`
      });
      
      // Replace the query with the result
      processedMessage = processedMessage.replace(
        match, 
        `\n\n--- INDEX RESULT ---\n${response.data.result}\n--- END RESULT ---\n\n`
      );
    } catch (error) {
      console.error('Error querying index:', error);
      processedMessage = processedMessage.replace(
        match, 
        `\n\n[Error querying index: ${error.message}]\n\n`
      );
    }
  }
  
  return processedMessage;
}
```

### MCP Tool Method

For Claude users with MCP access:

1. Create an MCP tool file:

```javascript
// mcp_tools/code_indexer.js
const axios = require('axios');

module.exports = {
  name: 'mcp__code_indexer',
  description: 'Query the codebase index for darth-shader',
  parameters: {
    type: 'object',
    properties: {
      queryType: {
        type: 'string',
        enum: ['EXPAND', 'CONTEXT', 'DEEP_EXPAND', 'FIND_REFS'],
        description: 'Type of query to run'
      },
      queryValue: {
        type: 'string',
        description: 'Value to query for (e.g., "CS1", "CL1", "F1>50")'
      }
    },
    required: ['queryType', 'queryValue']
  },
  execute: async function(params) {
    const { queryType, queryValue } = params;
    
    try {
      const response = await axios.post('http://localhost:3333/query', {
        projectId: 'darth-shader',
        query: `${queryType} ${queryValue}`
      });
      
      return { result: response.data.result };
    } catch (error) {
      return { error: `Error querying index: ${error.message}` };
    }
  }
};
```

2. Register with MCP server (follow MCP setup docs)

3. Use in Claude with:

```
<mcp:tool name="mcp__code_indexer" input="{\"queryType\":\"EXPAND\",\"queryValue\":\"CS1\"}" />
```

## 6. Automating Index Updates

### Git Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Get changed files
CHANGED_FILES=$(git diff --cached --name-only)

# Check if we need to update index
if echo "$CHANGED_FILES" | grep -q "\.js\|\.py\|\.md"; then
  echo "Updating code index..."
  ./tools/felix/cli.js create-index . ./code-index.md
  git add ./code-index.md
fi
```

Make executable:

```bash
chmod +x .git/hooks/pre-commit
```

### Scheduled Updates

For larger codebases, set up a weekly cron job:

```bash
# Add to crontab -e
0 0 * * 0 cd /path/to/your-project && ./tools/felix/cli.js create-index . ./code-index.md
```

## 7. Documentation References

The felix includes two format documentation files:

1. **Human-readable format**: `./tools/felix/format.md`
   - Detailed explanation of the indexing format
   - Examples and best practices
   - For developers enhancing the index

2. **Machine-optimized format**: `./tools/felix/format-machine.md`
   - Concise reference of all format elements
   - Quick lookup for syntax rules
   - For use in AI prompts and constrained contexts

When setting context for AI assistants, point to the machine-optimized version to save tokens.

## 8. Usage Examples

### Example 1: Getting Context for a System

```
[[INDEX:CONTEXT S3]]
```

### Example 2: Expanding a Code Snippet

```
[[INDEX:EXPAND CS1]]
```

### Example 3: Deep Expanding a Pipeline Flow

```
[[INDEX:DEEP_EXPAND PF1]]
```

### Example 4: Finding References to a Line

```
[[INDEX:FIND_REFS F1>50]]
```

## 9. Troubleshooting

- **Server not responding**: Ensure server is running (`./tools/felix/cli.js serve`)
- **Project not found**: Make sure you've registered your project with the server
- **Index not updating**: Check file permissions and git hooks
- **Missing dependencies**: Run `npm install` in the tools/felix directory

## 10. Next Steps

- Regularly update your index as the codebase evolves
- Add more CODE_SNIPPETS for complex areas of code
- Create CONTEXT_LINKS between related components
- Document PIPELINE_FLOWS for end-to-end processes