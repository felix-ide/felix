/**
 * Core interfaces for code analysis entities
 */

import { ComponentType, RelationshipType, Location, ScopeContext, Parameter } from './core-types.js';

/**
 * Base component interface
 */
export interface IComponent {
  id: string;
  name: string;
  type: ComponentType;
  language: string;
  filePath: string;
  location: Location;
  code?: string;  // Source code for the component
  metadata: Record<string, any> & {
    // Per-block metadata (optional for backward compatibility)
    parsingLevel?: 'semantic' | 'structural' | 'basic';
    capabilities?: {
      symbols?: boolean;
      relationships?: boolean;
      ranges?: boolean;
      types?: boolean;
      controlFlow?: boolean;
      incremental?: boolean;
    };
    backend?: 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid' | 'textmate' | 'textmate-hybrid';
  };
  scopeContext?: ScopeContext;  // Mixed-language scope context
  parentId?: string;  // ID of the parent component in the AST hierarchy
}

/**
 * Base relationship interface
 */
export interface IRelationship {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
  location?: Location;
  metadata: Record<string, any> & {
    // Edge confidence and provenance (optional for backward compatibility)
    confidence?: number;
    provenance?: {
      source: 'semantic' | 'structural' | 'basic' | 'initial';
      parser?: string;
      backend?: 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid' | 'textmate' | 'textmate-hybrid';
      timestamp?: number;
    };
  };
}

/**
 * Parse error information
 */
export interface ParseError {
  message: string;
  location?: Location;
  severity: 'error' | 'warning';
  code?: string;
  source?: string;  // Added to match code-parser's usage
}

/**
 * Parse warning information
 */
export interface ParseWarning {
  message: string;
  location?: Location;
  code?: string;
  source?: string;  // Added to match code-parser's usage
}

/**
 * Parse result from language parsers
 */
export interface ParseResult {
  components: IComponent[];
  relationships: IRelationship[];
  errors: ParseError[];
  warnings: ParseWarning[];
  metadata?: {  // Added to match code-parser's usage
    filePath: string;
    language: string;
    parseTime: number;
    componentCount: number;
    relationshipCount: number;
    // Capability flags and backend preferences (optional for backward compatibility)
    parsingLevel?: 'semantic' | 'structural' | 'basic';
    capabilities?: {
      symbols?: boolean;        // Can extract symbol definitions
      relationships?: boolean;  // Can extract relationships between symbols
      ranges?: boolean;         // Can provide accurate source ranges
      types?: boolean;          // Can infer/extract type information
      controlFlow?: boolean;    // Can analyze control flow
      incremental?: boolean;    // Supports incremental parsing
    };
    backend?: 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid' | 'textmate' | 'textmate-hybrid';
    segmentation?: {
      backend: 'detectors-only' | 'tree-sitter' | 'hybrid' | 'textmate' | 'textmate-hybrid';
      confidence: number;
    };
    [key: string]: any;
  };
}

// ContextGenerationOptions moved to architecture-intelligence/context/types.ts to avoid duplication

/**
 * Component search criteria
 */
export interface ComponentSearchCriteria {
  type?: string | string[];
  name?: string;
  language?: string | string[];
  filePath?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

/**
 * Relationship search criteria
 */
export interface RelationshipSearchCriteria {
  id?: string | string[];
  type?: string | string[];
  sourceId?: string | string[];
  targetId?: string | string[];
  language?: string | string[];
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
}

/**
 * File component interface
 */
export interface IFileComponent extends IComponent {
  type: ComponentType.FILE;
  size: number;
  extension: string;
  modificationTime: number;
  lineCount: number;
  hash?: string;
}

/**
 * Class component interface
 */
export interface IClassComponent extends IComponent {
  type: ComponentType.CLASS;
  isAbstract?: boolean;
  isFinal?: boolean;
  isStatic?: boolean;
  accessModifier: 'public' | 'private' | 'protected' | 'package';
  superClass?: string;
  interfaces?: string[];
  implementedInterfaces?: string[];
  decorators?: string[];
  generics?: string[];
  documentation?: string;
}

/**
 * Function component interface
 */
export interface IFunctionComponent extends IComponent {
  type: ComponentType.FUNCTION;
  parameters: Parameter[];
  returnType?: string;
  isAsync?: boolean;
  isGenerator?: boolean;
  isArrow?: boolean;
  accessModifier?: 'public' | 'private' | 'protected' | 'package';
  decorators?: string[];
  documentation?: string;
}

/**
 * Method component interface
 */
export interface IMethodComponent extends IComponent {
  type: ComponentType.METHOD;
  parameters: Parameter[];
  returnType?: string;
  isAsync?: boolean;
  isGenerator?: boolean;
  isStatic?: boolean;
  isAbstract?: boolean;
  isFinal?: boolean;
  isConstructor?: boolean;
  accessModifier: 'public' | 'private' | 'protected' | 'package';
  decorators?: string[];
  documentation?: string;
}
