/**
 * Core type definitions for code analysis systems
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
  DIRECTORY = 'directory',
  CLASS = 'class',
  ABSTRACT_CLASS = 'abstract_class',
  FUNCTION = 'function',
  METHOD = 'method',
  ABSTRACT_METHOD = 'abstract_method',
  STATIC_METHOD = 'static_method',
  PRIVATE_METHOD = 'private_method',
  PROTECTED_METHOD = 'protected_method',
  PUBLIC_METHOD = 'public_method',
  PROPERTY = 'property',
  STATIC_PROPERTY = 'static_property',
  PRIVATE_PROPERTY = 'private_property',
  PROTECTED_PROPERTY = 'protected_property',
  PUBLIC_PROPERTY = 'public_property',
  READONLY_PROPERTY = 'readonly_property',
  OPTIONAL_PROPERTY = 'optional_property',
  FIELD = 'field',
  VARIABLE = 'variable',
  MODULE = 'module',
  NAMESPACE = 'namespace',
  PACKAGE = 'package',
  INTERFACE = 'interface',
  ENUM = 'enum',
  TYPE = 'type',
  CONSTRUCTOR = 'constructor',
  ACCESSOR = 'accessor',
  GETTER = 'getter',
  SETTER = 'setter',
  DECORATOR = 'decorator',
  ANNOTATION = 'annotation',
  STRUCT = 'struct',
  UNION = 'union',
  UNION_TYPE = 'union_type',
  INTERSECTION_TYPE = 'intersection_type',
  TUPLE_TYPE = 'tuple_type',
  ARRAY_TYPE = 'array_type',
  PROMISE_TYPE = 'promise_type',
  LITERAL_TYPE = 'literal_type',
  CONDITIONAL_TYPE = 'conditional_type',
  MAPPED_TYPE = 'mapped_type',
  TEMPLATE_LITERAL_TYPE = 'template_literal_type',
  PROTOCOL = 'protocol',
  MIXIN = 'mixin',
  GENERIC = 'generic',
  LAMBDA = 'lambda',
  CLOSURE = 'closure',
  CALLBACK = 'callback',
  ARROW_FUNCTION = 'arrow_function',
  ASYNC_FUNCTION = 'async_function',
  GENERATOR_FUNCTION = 'generator_function',
  PARAMETER = 'parameter',
  TYPEDEF = 'typedef',
  TEMPLATE = 'template',
  RETURN = 'return',
  MACRO = 'macro',
  
  // PHP-specific
  TRAIT = 'trait',
  
  // Documentation/Markdown-specific
  SECTION = 'section',
  COMMENT = 'comment',
  CONSTANT = 'constant',
  IMPORT = 'import',
  EXPORT = 'export',
  INDEX_ENTRY = 'index_entry',
  BRACKET_REFERENCE = 'bracket_reference',
  DOC_SECTION = 'doc_section',
  
  // Architectural components
  SYSTEM = 'system',              // Logical grouping of related components
  PIPELINE = 'pipeline',          // Execution flow through components
  ARCHITECTURE = 'architecture',  // High-level architectural concept
  CONTEXT_LINK = 'context_link',  // Cross-reference between concepts
  PATTERN = 'pattern',            // Design pattern instance
  LAYER = 'layer',                // Architectural layer (e.g., presentation, business, data)
  SERVICE = 'service',            // Service/microservice component
  BOUNDARY = 'boundary',          // System boundary marker
  
  // Tracking components
  USAGE = 'usage',                // Usage/reference of another component
  EVENT = 'event',                // Event type
  
  // Mixed-language components
  UNKNOWN = 'unknown',                    // Unknown type
  EMBEDDED_SCRIPT = 'embedded_script',    // Script tag in HTML
  EMBEDDED_STYLE = 'embedded_style',      // Style tag in HTML
  EMBEDDED_TEMPLATE = 'embedded_template', // Template code (Twig, Jinja, etc)
  EMBEDDED_CODE = 'embedded_code'         // Generic embedded code
  ,
  // External/stdlib endpoints (graph boundary)
  EXTERNAL_MODULE = 'external_module',    // e.g., npm:react, composer:monolog/monolog, pypi:numpy
  STDLIB_SYMBOL = 'stdlib_symbol'         // e.g., node:fs, php:JsonSerializable, python:asyncio
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
  DEFINES = 'defines',
  
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
  COMPOSED_OF = 'composed_of', // Inverse of COMPOSES
  INHERITS_MULTIPLE = 'inherits_multiple', // Python, C++
  
  // Architectural relationships
  BELONGS_TO_SYSTEM = 'belongs_to_system',
  PART_OF_PIPELINE = 'part_of_pipeline',
  IMPLEMENTS_PATTERN = 'implements_pattern',
  ARCHITECTURAL_DEPENDENCY = 'architectural_dependency',
  DOCUMENTED_BY = 'documented_by',
  ANNOTATED_BY = 'annotated_by',  // From notes system
  FLOWS_TO = 'flows_to',           // Data/control flow
  COMMUNICATES_WITH = 'communicates_with', // Service communication
  PUBLISHES = 'publishes', // Simple publish
  PUBLISHES_TO = 'publishes_to',   // Event/message publishing
  SUBSCRIBES_TO = 'subscribes_to', // Event/message subscription
  EMITS = 'emits', // Event emission
  AGGREGATES = 'aggregates',       // DDD aggregate relationship
  BOUNDED_CONTEXT = 'bounded_context', // DDD bounded context
  CONSUMES = 'consumes', // Service consumption
  PRODUCES = 'produces', // Data production
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
  OBSERVES = 'observes', // Observer pattern
  INCLUDES = 'includes', // C/C++ includes
  DELEGATES_TO = 'delegates_to', // Delegation pattern
  FACTORY_FOR = 'factory_for', // Factory pattern
  CONFIGURES = 'configures', // Configuration relationship
  VALIDATES = 'validates', // Validation relationship
  TRANSFORMS = 'transforms', // Data transformation
  SERIALIZES = 'serializes', // Object serialization
  DESERIALIZES = 'deserializes', // Object deserialization
  ENCRYPTS = 'encrypts', // Data encryption
  DECRYPTS = 'decrypts', // Data decryption
  COMPRESSES = 'compresses', // Data compression
  DECOMPRESSES = 'decompresses', // Data decompression
  
  // PHP-specific relationships
  USES_TRAIT = 'uses_trait', // PHP trait usage
  IN_NAMESPACE = 'in_namespace', // PHP namespace membership
  
  // Additional relationships
  ASSOCIATES = 'associates', // General association
  INSTANTIATES = 'instantiates', // Class instantiation
  WRAPS = 'wraps', // Wrapper pattern
  INHERITS = 'inherits', // Inheritance (synonym for EXTENDS)
  INHERITS_FROM = 'inherits_from', // Inverse of INHERITS
  READS = 'reads', // File/resource reading
  WRITES = 'writes', // File/resource writing
  
  // Inverse relationships
  EXTENDED_BY = 'extended_by', // Inverse of EXTENDS
  IMPLEMENTED_BY = 'implemented_by', // Inverse of IMPLEMENTS
  IMPORTED_BY = 'imported_by', // Inverse of IMPORTS
  EXPORTED_BY = 'exported_by', // Inverse of EXPORTS
  INSTANTIATED_BY = 'instantiated_by', // Inverse of INSTANTIATES
  CALLED_BY = 'called_by', // Inverse of CALLS
  USED_BY = 'used_by', // Inverse of USES
  DECORATED_BY = 'decorated_by', // Inverse of DECORATES
  REFERENCED_BY = 'referenced_by', // Inverse of REFERENCES
  TRAIT_USED_BY = 'trait_used_by', // Inverse of USES_TRAIT
  NAMESPACE_CONTAINS = 'namespace_contains', // Inverse of IN_NAMESPACE
  
  // Language boundary relationships
  LANGUAGE_BOUNDARY = 'language_boundary',        // Marks transition between languages
  EMBEDDED_IN_SCOPE = 'embedded_in_scope',       // JS embedded in specific PHP function
  
  // Cross-language reference relationships  
  CROSS_LANGUAGE_REF = 'cross_language_ref',     // PHP var used in embedded JS
  TEMPLATE_VAR_USAGE = 'template_var_usage',     // Twig {{ var }} from PHP
  STRING_EMBEDDED_LANG = 'string_embedded_lang', // SQL in Python string
  
  // Template relationships
  TEMPLATE_EXTENDS = 'template_extends',         // Twig extends base.twig
  TEMPLATE_INCLUDES = 'template_includes',       // Twig includes partial.twig
  TEMPLATE_BLOCK_OVERRIDE = 'template_block_override', // Child overrides parent block
  
  // Mixed-file relationships
  RENDERS_TEMPLATE = 'renders_template',         // PHP function renders Twig file
  SCRIPT_IN_CONTEXT = 'script_in_context',       // Script tag knows its PHP context
  
  // Unknown relationship
  UNKNOWN = 'unknown',                            // Unknown relationship type

  // Semantic data flow relationships
  USES_FIELD = 'uses_field',                     // Component uses/accesses a field
  TRANSFORMS_DATA = 'transforms_data',           // Data transformation (map, filter, etc.)
  PASSES_TO = 'passes_to',                       // Parameter passing to function
  RETURNS_FROM = 'returns_from',                 // Return value from function
  READS_FROM = 'reads_from',                     // Reads data from source
  WRITES_TO = 'writes_to',                       // Writes data to target
  DERIVES_FROM = 'derives_from',                 // Computed/derived value
  AWAITS = 'awaits',                             // Async await relationship
  YIELDS = 'yields',                             // Generator yield relationship
  OBSERVES_PATTERN = 'observes_pattern'          // Observer pattern relationship
}

/**
 * Scope context for mixed-language components
 */
export interface ScopeContext {
  scope: string;
  languageStack: string[];
  componentChain: Array<{
    id: string;
    name: string;
    type: ComponentType;
    language: string;
  }>;
  crossLanguageParent?: {
    id: string;
    name: string;
    language: string;
  };
  boundary?: {
    startMarker: string;
    endMarker: string;
    isStringEmbedded: boolean;
  };
}
