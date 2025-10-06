/**
 * Pre-configured relationship inverter for code analysis domain
 * This provides the default mappings used by Felix
 */

import { RelationshipType } from '../../code-analysis-types/index.js';
import { InverseRelationshipConfig } from './RelationshipInverter.js';

/**
 * Create the default Felix relationship configuration
 */
export function createFelixRelationshipConfig(): InverseRelationshipConfig {
  const inverseMap = new Map<string, string>([
    [RelationshipType.EXTENDS, RelationshipType.EXTENDED_BY],
    [RelationshipType.IMPLEMENTS, RelationshipType.IMPLEMENTED_BY],
    [RelationshipType.IMPORTS, RelationshipType.IMPORTED_BY],
    [RelationshipType.EXPORTS, RelationshipType.EXPORTED_BY],
    [RelationshipType.INSTANTIATES, RelationshipType.INSTANTIATED_BY],
    [RelationshipType.CALLS, RelationshipType.CALLED_BY],
    [RelationshipType.USES, RelationshipType.USED_BY],
    [RelationshipType.DECORATES, RelationshipType.DECORATED_BY],
    [RelationshipType.REFERENCES, RelationshipType.REFERENCED_BY],
    [RelationshipType.USES_TRAIT, RelationshipType.TRAIT_USED_BY],
    [RelationshipType.IN_NAMESPACE, RelationshipType.NAMESPACE_CONTAINS],
    
    // Bidirectional inverse mapping
    [RelationshipType.EXTENDED_BY, RelationshipType.EXTENDS],
    [RelationshipType.IMPLEMENTED_BY, RelationshipType.IMPLEMENTS],
    [RelationshipType.IMPORTED_BY, RelationshipType.IMPORTS],
    [RelationshipType.EXPORTED_BY, RelationshipType.EXPORTS],
    [RelationshipType.INSTANTIATED_BY, RelationshipType.INSTANTIATES],
    [RelationshipType.CALLED_BY, RelationshipType.CALLS],
    [RelationshipType.USED_BY, RelationshipType.USES],
    [RelationshipType.DECORATED_BY, RelationshipType.DECORATES],
    [RelationshipType.REFERENCED_BY, RelationshipType.REFERENCES],
    [RelationshipType.TRAIT_USED_BY, RelationshipType.USES_TRAIT],
    [RelationshipType.NAMESPACE_CONTAINS, RelationshipType.IN_NAMESPACE],
  ]);
  
  const noInverseTypes = new Set<string>([
    RelationshipType.CONTAINS, // Already has BELONGS_TO as natural inverse
    RelationshipType.BELONGS_TO, // Already inverse of CONTAINS
    RelationshipType.COMPOSES, // Composition is directional
    RelationshipType.WRAPS, // Wrapping is directional
    RelationshipType.INHERITS, // Same as EXTENDS
    RelationshipType.OVERRIDES, // Override is directional
    RelationshipType.THROWS, // Exception throwing is directional
    RelationshipType.CATCHES, // Exception catching is directional
    RelationshipType.READS, // Reading is directional
    RelationshipType.WRITES, // Writing is directional
    RelationshipType.SENDS_TO, // Channel sending is directional
    RelationshipType.DEFERS, // Defer is directional
    RelationshipType.LISTENS_TO, // Event listening has its own patterns
    RelationshipType.ACCESSES, // Access is directional
    RelationshipType.MODIFIES, // Modification is directional
    RelationshipType.INCLUDES, // Include is directional
    RelationshipType.DELEGATES_TO, // Delegation is directional
    RelationshipType.FACTORY_FOR, // Factory pattern is directional
  ]);
  
  return {
    inverseMap,
    noInverseTypes
  };
}