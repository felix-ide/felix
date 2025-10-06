# External Integration Guide

This guide shows how to integrate with The Felix API from external tools like Cursor, VS Code extensions, or other development tools.

## Overview

The Felix HTTP API now supports stateless requests, allowing external tools to query for intelligent coding rules without maintaining sessions.

## API Endpoints

### Base URL
```
http://localhost:9000/api
```

### Authentication
Currently no authentication required. Future versions will support API keys.

## Specifying Project Context

You can specify the project in two ways:

1. **Query Parameter**: `?project=/path/to/project`
2. **HTTP Header**: `X-Project-Path: /path/to/project`

## Key Endpoints

### 1. Get Applicable Rules

Get context-aware coding rules for a specific file or component.

```bash
# Get rules for a specific file
curl "http://localhost:9000/api/rules?project=/path/to/project&entity_type=file&entity_id=src/index.ts"

# With additional context
curl "http://localhost:9000/api/rules?project=/path/to/project&entity_type=component&entity_id=<component-id>&user_intent=implementing+authentication"

# Using header instead
curl -H "X-Project-Path: /path/to/project" \
     "http://localhost:9000/api/rules?entity_type=file&entity_id=src/auth.ts"
```

### 2. Search for Components/Rules/Tasks

```bash
# Search for authentication-related items
curl "http://localhost:9000/api/search?project=/path/to/project&query=authentication"

# Search only for rules
curl "http://localhost:9000/api/search?project=/path/to/project&query=security&entity_type=rule"

# Search for components
curl "http://localhost:9000/api/search?project=/path/to/project&query=login&entity_type=component"
```

### 3. Get Context for a Component

```bash
# Get full context for a component
curl "http://localhost:9000/api/context?project=/path/to/project&entity_id=<component-id>"

# With specific options
curl "http://localhost:9000/api/context?project=/path/to/project&entity_id=<component-id>&include_rules=true&include_notes=true"
```

## Integration Examples

### Cursor Rules Integration

```javascript
// cursor-rules-plugin.js
const FELIX_URL = 'http://localhost:9000/api';
const PROJECT_PATH = '/Users/username/myproject';

async function getApplicableRules(filePath, fileContent) {
  const url = new URL(`${FELIX_URL}/rules`);
  url.searchParams.append('project', PROJECT_PATH);
  url.searchParams.append('entity_type', 'file');
  url.searchParams.append('entity_id', filePath);
  
  if (fileContent) {
    url.searchParams.append('file_content', fileContent);
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.applicable_rules || [];
}

// Use in Cursor
module.exports = {
  async provideRules(context) {
    const rules = await getApplicableRules(
      context.filePath,
      context.fileContent
    );
    
    return rules.map(rule => ({
      id: rule.rule_id,
      type: rule.rule_type,
      message: rule.guidance_text,
      severity: rule.confidence > 0.8 ? 'error' : 'warning',
      autoFix: rule.auto_executable ? rule.code_template : null
    }));
  }
};
```

### VS Code Extension Integration

```typescript
// vscode-extension.ts
import * as vscode from 'vscode';

class CodeIndexerProvider {
  private readonly baseUrl = 'http://localhost:9000/api';
  
  async getRulesForFile(document: vscode.TextDocument): Promise<Rule[]> {
    const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!projectPath) return [];
    
    const params = new URLSearchParams({
      project: projectPath,
      entity_type: 'file',
      entity_id: document.fileName,
      file_content: document.getText()
    });
    
    const response = await fetch(`${this.baseUrl}/rules?${params}`);
    const data = await response.json();
    
    return data.applicable_rules || [];
  }
  
  async searchComponents(query: string): Promise<Component[]> {
    const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!projectPath) return [];
    
    const params = new URLSearchParams({
      project: projectPath,
      query: query,
      entity_type: 'component'
    });
    
    const response = await fetch(`${this.baseUrl}/search?${params}`);
    const data = await response.json();
    
    return data.results || [];
  }
}
```

### Python Integration

```python
# code_indexer_client.py
import requests
from typing import List, Dict, Optional

class CodeIndexerClient:
    def __init__(self, base_url: str = "http://localhost:9000/api"):
        self.base_url = base_url
        
    def get_rules(self, 
                  project_path: str,
                  entity_type: str,
                  entity_id: str,
                  context: Optional[Dict] = None) -> List[Dict]:
        """Get applicable rules for a given entity."""
        params = {
            'project': project_path,
            'entity_type': entity_type,
            'entity_id': entity_id
        }
        
        if context:
            params.update(context)
            
        response = requests.get(f"{self.base_url}/rules", params=params)
        response.raise_for_status()
        
        return response.json().get('applicable_rules', [])
    
    def search(self, 
               project_path: str,
               query: str,
               entity_type: Optional[str] = None) -> List[Dict]:
        """Search for components, rules, tasks, or notes."""
        params = {
            'project': project_path,
            'query': query
        }
        
        if entity_type:
            params['entity_type'] = entity_type
            
        response = requests.get(f"{self.base_url}/search", params=params)
        response.raise_for_status()
        
        return response.json().get('results', [])

# Usage example
client = CodeIndexerClient()

# Get rules for a file
rules = client.get_rules(
    project_path="/path/to/project",
    entity_type="file",
    entity_id="src/auth/login.py",
    context={"user_intent": "implementing oauth"}
)

for rule in rules:
    print(f"Rule: {rule['guidance_text']}")
    if rule.get('code_template'):
        print(f"Template: {rule['code_template']}")
```

## Response Formats

### Rules Response
```json
{
  "applicable_rules": [
    {
      "rule_id": "rule_1234",
      "rule_type": "pattern",
      "guidance_text": "Use async/await instead of promises",
      "confidence": 0.85,
      "why_applicable": "File contains promise chains",
      "suggested_action": "refactor",
      "code_template": "async function example() { ... }"
    }
  ]
}
```

### Search Response
```json
{
  "results": [
    {
      "id": "component_id",
      "name": "AuthService",
      "type": "class",
      "score": 0.95,
      "filePath": "/src/services/auth.ts",
      "snippet": "export class AuthService { ... }"
    }
  ],
  "total": 15,
  "entity_counts": {
    "components": 10,
    "rules": 3,
    "tasks": 2
  }
}
```

## Best Practices

1. **Cache Project Path**: Store the project path in your tool's configuration
2. **Batch Requests**: When possible, get all rules for a file at once
3. **Handle Errors**: Always check for HTTP errors and empty responses
4. **Use Context**: Provide user_intent and file_content for better rule matching
5. **Respect Rate Limits**: Don't make excessive requests in short periods

## Troubleshooting

### No Project Error
If you get "No project specified", ensure you're including the project parameter:
```bash
# Wrong
curl "http://localhost:9000/api/rules"

# Correct
curl "http://localhost:9000/api/rules?project=/path/to/project"
```

### Empty Results
If you get empty results, verify:
1. The project path exists and has been indexed
2. The entity_id is correct (file paths should be relative to project root)
3. The Felix server is running on the expected port

### Connection Refused
Ensure the Felix server is running:
```bash
cd /path/to/Felix
npm start
```

## Future Enhancements

- API key authentication
- WebSocket support for real-time rule updates
- Bulk operations for better performance
- Rule application endpoints
- Project configuration management
