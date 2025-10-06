import type { LanguageCapabilityDefinition, LanguageCapabilityMap } from './types.js';

const definitions: LanguageCapabilityDefinition[] = [
  {
    id: 'javascript',
    displayName: 'JavaScript / TypeScript',
    parserTier: {
      primary: 'ast',
      fallbacks: ['tree-sitter', 'detector']
    },
    constructs: {
      classes: 'semantic',
      interfaces: 'semantic',
      functions: 'semantic',
      methods: 'semantic',
      properties: 'semantic',
      variables: 'structural',
      enums: 'structural',
      imports: 'semantic',
      exports: 'semantic',
      inheritance: 'semantic',
      generics: 'basic',
      documentation: 'basic'
    },
    services: {
      incrementalParsing: true,
      embeddedLanguages: 'delegated',
      crossFileResolution: 'speculative',
      docLinking: 'basic'
    },
    notes: 'Primary AST parser with Tree-sitter fallback; import enrichment resolves local modules opportunistically.'
  },
  {
    id: 'python',
    displayName: 'Python',
    parserTier: {
      primary: 'ast',
      fallbacks: ['tree-sitter', 'detector']
    },
    constructs: {
      classes: 'semantic',
      functions: 'semantic',
      methods: 'semantic',
      properties: 'basic',
      variables: 'basic',
      imports: 'structural',
      inheritance: 'structural',
      documentation: 'basic'
    },
    services: {
      incrementalParsing: false,
      embeddedLanguages: 'none',
      crossFileResolution: 'speculative',
      docLinking: 'basic'
    },
    notes: 'AST parser emits import components; cross-file resolution performed in normalization.'
  },
  {
    id: 'php',
    displayName: 'PHP',
    parserTier: {
      primary: 'ast',
      fallbacks: ['tree-sitter', 'detector']
    },
    constructs: {
      classes: 'semantic',
      interfaces: 'semantic',
      traits: 'semantic',
      functions: 'semantic',
      methods: 'semantic',
      properties: 'semantic',
      variables: 'structural',
      imports: 'semantic',
      inheritance: 'semantic',
      documentation: 'basic'
    },
    services: {
      incrementalParsing: false,
      embeddedLanguages: 'delegated',
      crossFileResolution: 'speculative',
      docLinking: 'basic'
    },
    notes: 'nikic AST parser with Tree-sitter fallback for embedded HTML.'
  },
  {
    id: 'java',
    displayName: 'Java',
    parserTier: {
      primary: 'ast',
      fallbacks: ['tree-sitter', 'detector']
    },
    constructs: {
      classes: 'semantic',
      interfaces: 'semantic',
      enums: 'semantic',
      methods: 'semantic',
      properties: 'structural',
      variables: 'structural',
      imports: 'structural',
      inheritance: 'structural',
      generics: 'basic'
    },
    services: {
      incrementalParsing: false,
      embeddedLanguages: 'none',
      crossFileResolution: 'none'
    },
    notes: 'JavaParser-based AST with limited cross-file resolution; Tree-sitter fallback provides structure when AST fails.'
  },
  {
    id: 'csharp',
    displayName: 'C#',
    parserTier: {
      primary: 'ast',
      fallbacks: ['tree-sitter', 'detector']
    },
    constructs: {
      classes: 'semantic',
      interfaces: 'semantic',
      enums: 'semantic',
      methods: 'semantic',
      properties: 'semantic',
      variables: 'structural',
      imports: 'structural',
      inheritance: 'structural'
    },
    services: {
      incrementalParsing: false,
      embeddedLanguages: 'none',
      crossFileResolution: 'none'
    },
    notes: 'Roslyn sidecar generates AST data; Tree-sitter acts as backup when Roslyn unavailable.'
  },
  {
    id: 'markdown',
    displayName: 'Markdown',
    parserTier: {
      primary: 'ast',
      fallbacks: ['detector']
    },
    constructs: {
      documentation: 'semantic',
      templates: 'structural'
    },
    services: {
      incrementalParsing: false,
      embeddedLanguages: 'delegated',
      docLinking: 'structural'
    },
    notes: 'Structured document extraction, with embedded code blocks routed to language delegates.'
  },
  {
    id: 'documentation',
    displayName: 'Plain Documentation',
    parserTier: {
      primary: 'ast',
      fallbacks: ['detector']
    },
    constructs: {
      documentation: 'structural'
    },
    services: {
      incrementalParsing: false,
      embeddedLanguages: 'none',
      docLinking: 'basic'
    }
  },
  {
    id: 'html',
    displayName: 'HTML',
    parserTier: {
      primary: 'ast',
      fallbacks: ['tree-sitter', 'detector']
    },
    constructs: {
      templates: 'structural',
      documentation: 'basic'
    },
    services: {
      incrementalParsing: true,
      embeddedLanguages: 'delegated',
      crossFileResolution: 'none'
    }
  },
  {
    id: 'css',
    displayName: 'CSS / Preprocessors',
    parserTier: {
      primary: 'ast',
      fallbacks: ['tree-sitter', 'detector']
    },
    constructs: {
      templates: 'structural',
      documentation: 'none'
    },
    services: {
      incrementalParsing: true,
      embeddedLanguages: 'none',
      crossFileResolution: 'none'
    }
  },
  {
    id: 'json',
    displayName: 'JSON',
    parserTier: {
      primary: 'ast',
      fallbacks: ['detector']
    },
    constructs: {
      documentation: 'basic'
    },
    services: {
      incrementalParsing: false,
      embeddedLanguages: 'none',
      crossFileResolution: 'none'
    }
  }
];

export const languageCapabilities: LanguageCapabilityMap = definitions.reduce<LanguageCapabilityMap>((acc, definition) => {
  acc[definition.id] = definition;
  return acc;
}, {});

export function getLanguageCapability(id: string): LanguageCapabilityDefinition | undefined {
  return languageCapabilities[id];
}

export function listLanguageCapabilities(): LanguageCapabilityDefinition[] {
  return definitions.slice();
}
