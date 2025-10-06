/**
 * Default weights for all ComponentType values
 * Used for relevance scoring and prioritization
 */

import { ComponentType } from './core-types.js';

/**
 * Default type weights for component importance
 * Higher values indicate more important components
 */
export const DEFAULT_TYPE_WEIGHTS: Record<ComponentType, number> = {
  // Core architectural components
  [ComponentType.SYSTEM]: 12.0,
  [ComponentType.PIPELINE]: 11.0,
  [ComponentType.ARCHITECTURE]: 11.0,
  [ComponentType.SERVICE]: 10.0,
  [ComponentType.LAYER]: 10.0,
  [ComponentType.BOUNDARY]: 9.0,
  
  // Primary code structures
  [ComponentType.CLASS]: 10.0,
  [ComponentType.ABSTRACT_CLASS]: 10.0,
  [ComponentType.INTERFACE]: 9.0,
  [ComponentType.MODULE]: 9.0,
  [ComponentType.PACKAGE]: 9.0,
  [ComponentType.NAMESPACE]: 8.0,
  
  // Functions and methods
  [ComponentType.FUNCTION]: 8.0,
  [ComponentType.METHOD]: 8.0,
  [ComponentType.ABSTRACT_METHOD]: 8.0,
  [ComponentType.STATIC_METHOD]: 8.0,
  [ComponentType.PUBLIC_METHOD]: 8.0,
  [ComponentType.PROTECTED_METHOD]: 7.0,
  [ComponentType.PRIVATE_METHOD]: 6.0,
  [ComponentType.ASYNC_FUNCTION]: 8.0,
  [ComponentType.GENERATOR_FUNCTION]: 8.0,
  [ComponentType.ARROW_FUNCTION]: 7.0,
  [ComponentType.LAMBDA]: 7.0,
  [ComponentType.CLOSURE]: 7.0,
  [ComponentType.CALLBACK]: 6.0,
  
  // Type definitions
  [ComponentType.ENUM]: 7.0,
  [ComponentType.TYPE]: 7.0,
  [ComponentType.TYPEDEF]: 7.0,
  [ComponentType.STRUCT]: 7.0,
  [ComponentType.UNION]: 7.0,
  [ComponentType.PROTOCOL]: 7.0,
  [ComponentType.MIXIN]: 7.0,
  [ComponentType.TRAIT]: 7.0,
  
  // Properties and fields
  [ComponentType.PROPERTY]: 5.0,
  [ComponentType.STATIC_PROPERTY]: 5.0,
  [ComponentType.PUBLIC_PROPERTY]: 5.0,
  [ComponentType.PROTECTED_PROPERTY]: 4.0,
  [ComponentType.PRIVATE_PROPERTY]: 4.0,
  [ComponentType.READONLY_PROPERTY]: 5.0,
  [ComponentType.OPTIONAL_PROPERTY]: 4.0,
  [ComponentType.FIELD]: 5.0,
  [ComponentType.VARIABLE]: 6.0,
  [ComponentType.CONSTANT]: 6.0,
  [ComponentType.PARAMETER]: 3.0,
  
  // Type system components
  [ComponentType.UNION_TYPE]: 5.0,
  [ComponentType.INTERSECTION_TYPE]: 5.0,
  [ComponentType.TUPLE_TYPE]: 5.0,
  [ComponentType.ARRAY_TYPE]: 5.0,
  [ComponentType.PROMISE_TYPE]: 5.0,
  [ComponentType.LITERAL_TYPE]: 4.0,
  [ComponentType.CONDITIONAL_TYPE]: 5.0,
  [ComponentType.MAPPED_TYPE]: 5.0,
  [ComponentType.TEMPLATE_LITERAL_TYPE]: 4.0,
  [ComponentType.GENERIC]: 5.0,
  
  // Special methods
  [ComponentType.CONSTRUCTOR]: 7.0,
  [ComponentType.ACCESSOR]: 5.0,
  [ComponentType.GETTER]: 5.0,
  [ComponentType.SETTER]: 5.0,
  
  // Metadata and annotations
  [ComponentType.DECORATOR]: 4.0,
  [ComponentType.ANNOTATION]: 4.0,
  [ComponentType.MACRO]: 4.0,
  
  // Import/Export
  [ComponentType.IMPORT]: 3.0,
  [ComponentType.EXPORT]: 3.0,
  
  // File system
  [ComponentType.FILE]: 4.0,
  [ComponentType.DIRECTORY]: 3.0,
  
  // Documentation
  [ComponentType.SECTION]: 3.0,
  [ComponentType.DOC_SECTION]: 3.0,
  [ComponentType.COMMENT]: 2.0,
  [ComponentType.INDEX_ENTRY]: 2.0,
  [ComponentType.BRACKET_REFERENCE]: 2.0,
  
  // Templates and embedded code
  [ComponentType.TEMPLATE]: 5.0,
  [ComponentType.EMBEDDED_SCRIPT]: 5.0,
  [ComponentType.EMBEDDED_STYLE]: 4.0,
  [ComponentType.EMBEDDED_TEMPLATE]: 5.0,
  [ComponentType.EMBEDDED_CODE]: 4.0,
  
  // Externals / stdlib endpoints (graph boundaries)
  [ComponentType.EXTERNAL_MODULE]: 2.0,
  [ComponentType.STDLIB_SYMBOL]: 2.0,
  
  // Special/tracking
  [ComponentType.PATTERN]: 8.0,
  [ComponentType.CONTEXT_LINK]: 3.0,
  [ComponentType.USAGE]: 3.0,
  [ComponentType.EVENT]: 5.0,
  [ComponentType.RETURN]: 3.0,
  [ComponentType.UNKNOWN]: 1.0
};
