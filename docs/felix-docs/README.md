# CodeIndexer - AI-Assisted Codebase Navigation and Visualization

This tool enables AI assistants like Claude to efficiently navigate your codebase by creating and querying an index of code components, systems, and documentation. It now includes a visualization system that renders code relationships as an interactive graph.

## Overview

CodeIndexer addresses several challenges when working with AI assistants on large codebases:

1. **Context efficiency**: Provides critical code sections without bloating context
2. **Mental model maintenance**: Helps AI build and maintain a mental model of your system
3. **Systematic exploration**: Traces relationships between components
4. **Query capabilities**: Allows on-demand expansion of code sections and documentation
5. **Visual representation**: Renders code relationships as interactive visualizations

## Setup Guide

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone or copy the tool files:
   - `felix.js` - Main implementation
   - `format.md` - Format documentation
   - `README.md` - This README

2. Install dependencies:

```bash
npm install express axios glob
```

3. Create an index file:

```bash
node felix.js create-index /path/to/project /path/to/output-index.md
```

4. Start the server:

```bash
node felix.js serve --port 3333
```

### Quick Start

```javascript
// Import the library
const { CodeIndexer, runApiServer, runIndexCreator } = require('./felix');

// Create an index (one-time setup)
runIndexCreator('/path/to/project', '/path/to/project-index.md');

// Start the API server
const server = runApiServer(3333);

// Or use directly in your code
const indexer = new CodeIndexer('/path/to/project-index.md');
const result = await indexer.handleQuery('EXPAND CS1');
console.log(result);
```

## AIgent Smith Integration

The code indexer is now fully integrated with the AIgent Smith application:

### Visualization Features

- **Interactive Relationship Graph**: Visualize code dependencies and relationships
- **Multiple Layout Algorithms**: Force-directed, radial, and hierarchical views
- **Filtering System**: Filter components by type, relationship, and more
- **Component Details**: View detailed information about components when selected
- **Real Data Analysis**: Automatically analyzes project structure and file dependencies
- **Import Detection**: Identifies and visualizes import relationships between files
- **Directory Structure**: Displays hierarchical folder structure

### Using the Visualization

1. **Index a Project**: 
   - Open a project in AIgent Smith
   - Click on "Code Visualization" in the sidebar
   - Click "Run Felix" to analyze the project

2. **Explore the Visualization**:
   - Click on nodes to see component details
   - Use the control panel to filter components and relationships
   - Use the layout options to switch between different views
   - Zoom and pan to navigate the graph

3. **Handle Errors**:
   - The visualization includes comprehensive error handling
   - If indexing fails, you'll see helpful error messages and recovery options
   - Fallback mechanisms provide mock data when real data can't be loaded

## Documentation & Contracts

- **MCP Contracts**: See [`MCP-Contracts.md`](./MCP-Contracts.md) for typed request/response shapes for every MCP tool (tasks, notes, rules, search, context, projects).
- **Search Guardrails**: See [`Search-Guardrails.md`](./Search-Guardrails.md) for details on the similarity threshold, path demotion patterns, and frontend filter behavior.
- **API Clients**: The web UI now consumes feature-specific API clients under `web-ui/src/services/api/`, with shared HTTP helpers centralizing error handling and base URL configuration.

## Usage with Claude and Other AI Assistants

### Direct CLI Usage

The simplest way to use the tool is via CLI:

```bash
node felix.js /path/to/index.md
```

This launches an interactive prompt where you can enter queries and see results.

### Using with Claude

#### Method 1: Manual Copy/Paste

1. Run a query with the CLI tool
2. Copy the result
3. Paste it into your conversation with Claude

#### Method 2: Message Interceptor

Integrate with your Claude client to automatically process special syntax:

```
User: Tell me about the mouse handling system.

[[INDEX:CONTEXT CL1]]

Claude: (The indexer will replace this with expanded information)
```

#### Method 3: MCP Tool Implementation

For Claude users with access to the MCP (Model Configuration and Programs) framework:

1. Create an MCP tool definition file:

```javascript
// mcp_code_indexer.js
const { CodeIndexer } = require('./felix');

// Project index mapping
const PROJECT_INDICES = {
  'my-project': '/path/to/my-project-index.md',
  'darth-shader': '/path/to/darth-shader-index.md',
};

// MCP tool definition
module.exports = {
  name: 'mcp__code_indexer',
  description: 'Query the codebase index to efficiently find code and documentation',
  parameters: {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        description: 'The ID of the project to query',
        enum: Object.keys(PROJECT_INDICES),
      },
      queryType: {
        type: 'string',
        enum: ['EXPAND', 'CONTEXT', 'DEEP_EXPAND', 'FIND_REFS'],
        description: 'The type of query to run'
      },
      queryValue: {
        type: 'string',
        description: 'The value to query for (e.g., "CS1", "CL1", "P1", "F1>50")'
      }
    },
    required: ['projectId', 'queryType', 'queryValue']
  },
  execute: async function(params) {
    const { projectId, queryType, queryValue } = params;
    
    const indexPath = PROJECT_INDICES[projectId];
    if (!indexPath) {
      return {
        error: `Project ${projectId} not found in project index map`
      };
    }
    
    const indexer = new CodeIndexer(indexPath);
    const query = `${queryType} ${queryValue}`;
    
    try {
      const result = await indexer.handleQuery(query);
      return { result };
    } catch (error) {
      return {
        error: `Error processing query: ${error.message}`
      };
    }
  }
};
```

2. Register it with your MCP server

3. Use it in Claude conversations:

```
To understand this better, I'll check the code index.

<mcp:tool name="mcp__code_indexer" input="{
  \"projectId\": \"darth-shader\",
  \"queryType\": \"EXPAND\",
  \"queryValue\": \"CS1\"
}" />

Based on this code snippet, I can see...
```

#### Method 4: Claude Code Integration

To use with Claude Code CLI:

1. Start the API server:

```bash
node felix.js serve --port 3333
```

2. Create an alias in your shell configuration:

```bash
# Add to .bashrc or .zshrc
alias claude-index="curl -s -X POST http://localhost:3333/query -H 'Content-Type: application/json' -d '{\"projectId\":\"my-project\",\"query\":\"$1 $2\"}' | jq -r '.result'"
```

3. Use the alias before asking Claude:

```bash
# Get context for a component
claude-index CONTEXT CL1 | claude

# Expand a code snippet
claude-index EXPAND CS1 | claude
```

#### Method 5: Claude API Integration

For applications using Claude's API:

```javascript
const axios = require('axios');

async function queryWithIndex(userMessage, indexerUrl, projectId) {
  // Parse index query patterns
  const indexQueryMatch = userMessage.match(/\[\[INDEX:([A-Z_]+)\s+([^\]]+)\]\]/g);
  
  if (indexQueryMatch) {
    let processedMessage = userMessage;
    
    for (const match of indexQueryMatch) {
      const innerMatch = match.match(/\[\[INDEX:([A-Z_]+)\s+([^\]]+)\]\]/);
      const [, command, query] = innerMatch;
      
      try {
        // Call your indexer API
        const response = await axios.post(indexerUrl + '/query', {
          projectId,
          query: `${command} ${query}`
        });
        
        // Replace the query with the result
        processedMessage = processedMessage.replace(
          match, 
          `\n\n--- INDEX RESULT ---\n${response.data.result}\n--- END RESULT ---\n\n`
        );
      } catch (error) {
        console.error('Error processing index query:', error);
        processedMessage = processedMessage.replace(
          match, 
          `\n\n[Error processing index query: ${error.message}]\n\n`
        );
      }
    }
    
    return processedMessage;
  }
  
  return userMessage;
}

// Example usage with Claude API
async function sendToClaudeWithIndexing(userMessage, projectId) {
  const processedMessage = await queryWithIndex(
    userMessage, 
    'http://localhost:3333', 
    projectId
  );
  
  // Now send the processed message to Claude's API
  const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-opus-20240229',
    messages: [{ role: 'user', content: processedMessage }],
    // ... other Claude API parameters
  }, {
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'content-type': 'application/json'
    }
  });
  
  return claudeResponse.data;
}
```

### Integration with Other AI Tools

#### OpenAI GPT-4 & Assistant API

Similar approach to Claude, but adapted for OpenAI's API:

```javascript
// For the chat completions API
const processedMessage = await queryWithIndex(userMessage, 'http://localhost:3333', projectId);

const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: processedMessage }],
});
```

#### Anthropic Claude Notebook Extension

For Jupyter notebook environments:

```python
import requests
import json
import anthropic

def query_index(project_id, query_type, query_value):
    response = requests.post(
        "http://localhost:3333/query",
        json={"projectId": project_id, "query": f"{query_type} {query_value}"}
    )
    return response.json()["result"]

# Use in notebook
result = query_index("my-project", "EXPAND", "CS1")
print(result)

# Then use with Claude in the notebook
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=1000,
    messages=[{"role": "user", "content": f"Analyze this code:\n\n{result}"}]
)
```

## Visualization Architecture

The visualization system is built on a modular architecture:

### Components

1. **RelationshipVisualizationView**: Renders the actual visualization using SVG
2. **RelationshipVisualizationPresenter**: Manages the data and user interactions
3. **RelationshipVisualizationContainer**: React component that integrates everything
4. **VisualizationControlPanel**: UI for filtering and layout options
5. **code-visualization-store**: State management for visualization data

### Data Flow

1. **Indexing**: The code indexer analyzes the project structure
2. **Data Generation**: Creates nodes (files/components) and edges (relationships)
3. **Layout Calculation**: Positions nodes using the selected algorithm
4. **Rendering**: Draws the graph with SVG elements
5. **Interaction**: Handles user events like clicking, zooming, and filtering

### Implementation Details

- **Error Handling**: Comprehensive error handling with fallbacks
- **ESM/CommonJS Compatibility**: Mockable components for different module formats
- **Performance Optimization**: Efficient rendering for large graphs
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Keyboard navigation and screen reader support

## Index Format Reference

See the [format.md](./format.md) file for detailed documentation on the index file format.

## Advanced Configuration

### Express Middleware Integration

Add the indexer as middleware to an existing Express app:

```javascript
const express = require('express');
const { CodeIndexer } = require('./felix');

const app = express();
app.use(express.json());

// Indexer middleware
app.use('/api/indexer', (req, res, next) => {
  if (!req.body.projectId || !req.body.query) {
    return res.status(400).json({
      success: false,
      error: 'Missing projectId or query parameter'
    });
  }
  
  const indexer = new CodeIndexer(`/path/to/${req.body.projectId}-index.md`);
  
  indexer.handleQuery(req.body.query)
    .then(result => {
      req.indexResult = result;
      next();
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        error: err.message
      });
    });
});

// Your route that uses the indexer
app.post('/api/indexer/query', (req, res) => {
  res.json({
    success: true,
    result: req.indexResult
  });
});
```

### Auto-Updating Indices

Set up a Git pre-commit hook to update your indices:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Get changed files
CHANGED_FILES=$(git diff --cached --name-only)

# Check if we need to update indices
if echo "$CHANGED_FILES" | grep -q "\.js\|\.py\|\.md"; then
  echo "Updating code indices..."
  node tools/felix/felix.js create-index . ./code-index.md
  git add ./code-index.md
fi
```

### Custom Index Generators

For specialized code patterns:

```javascript
const { IndexCreator } = require('./felix');

class ReactComponentIndexer extends IndexCreator {
  constructor(basePath) {
    super(basePath);
  }
  
  // Override to add React-specific component detection
  create(outputPath) {
    const filePaths = this.createFilePathsSection();
    
    // Find React components
    const components = this.findReactComponents();
    
    let indexContent = `# React Project Index\n\n\`\`\`index\n# FILE_PATHS\n`;
    indexContent += filePaths.join('\n');
    indexContent += '\n\n# COMPONENTS\n';
    
    // Add component entries
    for (const [id, component] of Object.entries(components)) {
      indexContent += `${id}:${component.name}|${component.description}|\n`;
      indexContent += `${component.fileId}>${component.lineRange}:Component definition\n`;
    }
    
    indexContent += '```\n';
    
    fs.writeFileSync(outputPath, indexContent);
    console.log(`React component index created at ${outputPath}`);
    
    return this.fileMap;
  }
  
  findReactComponents() {
    // Implementation to scan for React components
    // ...
  }
}
```

## Performance Considerations

- For large codebases (>1000 files), split indices by module or feature
- Use layered indices (core/component/detail) to avoid loading everything at once
- Cache query results for frequently accessed components
- Use a persistent server rather than creating new indexer instances for each query
- For visualization, consider using WebGL for very large graphs (>1000 nodes)
- Implement pagination or lazy loading for large visualization datasets

## Troubleshooting

### Common Issues

1. **Missing dependencies**: Ensure you've installed express, axios, and glob
2. **Path issues**: Use absolute paths in your index file
3. **Large files**: For files >1MB, use line ranges to limit what's loaded
4. **API timeouts**: For complex deep expansions, increase your API timeout
5. **Visualization performance**: Reduce the number of displayed nodes with filtering
6. **ESM/CommonJS compatibility**: Check module format compatibility if using custom visualization components

### Debugging

Enable debug mode for more verbose logging:

```bash
DEBUG=true node felix.js serve
```

For visualization debugging, check the browser console for detailed logs when running in development mode.

## Future Development

Planned enhancements:

1. **Enhanced Language Support**: Add Python, Java, and Ruby parsers
2. **Semantic Understanding**: NLP-based component linking
3. **Advanced Visualization**: More layout algorithms and interaction modes
4. **Integration with Documentation**: Link visualization with documentation
5. **Pattern Detection**: Automatic detection of design patterns in code
6. **Performance Optimization**: Improved rendering for very large codebases
7. **Export Options**: Export visualizations as images or interactive HTML

## Contributing

Improvements to consider:

1. Adding a web UI for index management
2. Supporting more query types
3. Implementing automatic index generation for popular frameworks
4. Adding language-specific indexing plugins
5. Creating more visualization layout algorithms
6. Enhancing performance for large codebases

## License

No open-source license granted at this time (TBD).
