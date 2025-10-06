/**
 * Core type definitions for The Felix system
 */

/**
 * Location information for components in source code
 */
export interface Location {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

/**
 * Parameter information for functions and methods
 */
export interface Parameter {
  name: string;
  type?: string;
  defaultValue?: string;
  isOptional?: boolean;
  isRest?: boolean;
}

/**
 * Component types enum for type safety
 */
export enum ComponentType {
  FILE = 'file',
  CLASS = 'class',
  FUNCTION = 'function',
  METHOD = 'method',
  PROPERTY = 'property',
  VARIABLE = 'variable',
  MODULE = 'module',
  NAMESPACE = 'namespace',
  PACKAGE = 'package',
  INTERFACE = 'interface',
  ENUM = 'enum',
  CONSTRUCTOR = 'constructor',
  ACCESSOR = 'accessor',
  DECORATOR = 'decorator',
  ANNOTATION = 'annotation',
  STRUCT = 'struct',
  UNION = 'union',
  PROTOCOL = 'protocol',
  MIXIN = 'mixin',
  GENERIC = 'generic',
  LAMBDA = 'lambda',
  CLOSURE = 'closure',
  TYPEDEF = 'typedef',
  TEMPLATE = 'template',
  MACRO = 'macro',
  
  // PHP-specific
  TRAIT = 'trait',
  
  // Documentation/Markdown-specific
  SECTION = 'section',
  COMMENT = 'comment',
  CONSTANT = 'constant',
  IMPORT = 'import',
  INDEX_ENTRY = 'index_entry',
  BRACKET_REFERENCE = 'bracket_reference',
  DOC_SECTION = 'doc_section'
}

/**
 * Relationship types enum for type safety
 */
export enum RelationshipType {
  // Basic relationships
  EXTENDS = 'extends',
  IMPLEMENTS = 'implements',
  IMPORTS = 'imports',
  IMPORTS_FROM = 'imports_from',
  EXPORTS = 'exports',
  EXPORTS_FROM = 'exports_from',
  
  // Function/method relationships
  CALLS = 'calls',
  CALLS_CONSTRUCTOR = 'calls_constructor',
  OVERRIDES = 'overrides',
  
  // General usage relationships
  REFERENCES = 'references',
  USES = 'uses',
  CREATES = 'creates',
  
  // Exception handling
  THROWS = 'throws',
  CATCHES = 'catches',
  
  // Structural relationships
  CONTAINS = 'contains',
  BELONGS_TO = 'belongs_to',
  DEPENDS_ON = 'depends_on',
  
  // Type relationships
  RETURNS = 'returns',
  ACCEPTS = 'accepts',
  HAS_TYPE = 'has_type',
  IMPLEMENTS_TYPE = 'implements_type',
  
  // Member relationships
  HAS_METHOD = 'has_method',
  HAS_PROPERTY = 'has_property',
  HAS_PARAMETER = 'has_parameter',
  
  // Language-specific relationships
  EMBEDS = 'embeds', // Go struct embedding
  COMPOSES = 'composes', // C++, Go composition
  INHERITS_MULTIPLE = 'inherits_multiple', // Python, C++
  MIXES_IN = 'mixes_in', // JS/TS, Python
  FRIEND_OF = 'friend_of', // C++
  SPECIALIZES = 'specializes', // C++ templates
  PROTOCOL_CONFORMS = 'protocol_conforms', // Python
  DECORATES = 'decorates', // JS/TS, Python, Java
  ANNOTATES = 'annotates', // Java
  IMPLEMENTS_ABSTRACT = 'implements_abstract', // Java, C++
  YIELDS_TO = 'yields_to', // JS/TS, Python generators
  SENDS_TO = 'sends_to', // Go channels
  DEFERS = 'defers', // Go defer
  LISTENS_TO = 'listens_to', // Event handlers
  ACCESSES = 'accesses', // Property/field access
  MODIFIES = 'modifies', // State modification
  INCLUDES = 'includes', // C/C++ includes
  DELEGATES_TO = 'delegates_to', // Delegation pattern
  FACTORY_FOR = 'factory_for', // Factory pattern
  SUBSCRIBES_TO = 'subscribes_to', // Event/message subscription
  
  // PHP-specific relationships
  USES_TRAIT = 'uses_trait', // PHP trait usage
  IN_NAMESPACE = 'in_namespace' // PHP namespace membership
}

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
  metadata: Record<string, any>;
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
  metadata: Record<string, any>;
}

/**
 * Parse error information
 */
export interface ParseError {
  message: string;
  location?: Location;
  severity: 'error' | 'warning';
  code?: string;
}

/**
 * Parse warning information
 */
export interface ParseWarning {
  message: string;
  location?: Location;
  code?: string;
}

/**
 * Parse result from language parsers
 */
export interface ParseResult {
  components: IComponent[];
  relationships: IRelationship[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

/**
 * Context generation options
 */
export interface ContextGenerationOptions {
  targetTokenSize?: number;
  maxDepth?: number;
  includeSourceCode?: boolean;
  includeDocumentation?: boolean;
  includeRelationships?: boolean;
  priorityComponents?: string[];
  excludePatterns?: string[];
  compressionRatio?: number;
  query?: string;
  format?: 'markdown' | 'json';
}

/**
 * Component search criteria
 */
export interface ComponentSearchCriteria {
  type?: string | string[];
  name?: string;
  language?: string | string[];
  filePath?: string;
  query?: string;
  entity_type?: string;
  entity_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Relationship search criteria
 */
export interface RelationshipSearchCriteria {
  type?: string | string[];
  sourceId?: string;
  targetId?: string;
  language?: string | string[];
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
