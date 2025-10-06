export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const PROJECT_PROPERTY = {
  project: {
    type: 'string',
    description: 'Project name or path'
  }
} as const;

export function withProjectProperty(properties: Record<string, unknown>) {
  return {
    ...PROJECT_PROPERTY,
    ...properties
  };
}

export const COMMON_FILTER_PROPERTIES = {
  component_types: {
    type: 'array',
    items: { type: 'string' },
    description: 'Filter component symbol kinds (e.g., function,class,interface,method)'
  },
  lang: {
    type: 'array',
    items: { type: 'string' },
    description: 'Filter by language (e.g., ["typescript","javascript"])'
  },
  path_include: {
    type: 'array',
    items: { type: 'string' },
    description: 'Only include results whose filePath matches any of these substrings'
  },
  path_exclude: {
    type: 'array',
    items: { type: 'string' },
    description: 'Exclude results whose filePath matches any of these substrings'
  }
} as const;
