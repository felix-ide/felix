/**
 * RelationshipInverter - Generates inverse relationships for bidirectional tracking
 * 
 * For every relationship A->B, we generate the inverse B->A with appropriate type
 */

import { IGraphRelationship } from '../interfaces/IGraphEntity.js';

/**
 * Configuration for relationship inversion
 */
export interface InverseRelationshipConfig {
  /**
   * Map of relationship types to their inverses
   * e.g., { 'PARENT_OF': 'CHILD_OF', 'OWNS': 'OWNED_BY' }
   */
  inverseMap: Map<string, string>;
  
  /**
   * Set of relationship types that should not have inverses generated
   * e.g., new Set(['CONTAINS', 'COMPOSED_OF'])
   */
  noInverseTypes?: Set<string>;
  
  /**
   * Function to generate inverse relationship ID
   * Default: `${targetId}-${inverseType}-${sourceId}`
   */
  generateInverseId?: (original: IGraphRelationship, inverseType: string) => string;
}

/**
 * Generic relationship inverter that can work with any relationship types
 */
export class RelationshipInverter<TRelationship extends IGraphRelationship = IGraphRelationship> {
  private config: InverseRelationshipConfig;
  
  constructor(config: InverseRelationshipConfig) {
    this.config = {
      noInverseTypes: new Set(),
      generateInverseId: (original, inverseType) => 
        `${original.targetId}-${inverseType}-${original.sourceId}`,
      ...config
    };
  }
  
  /**
   * Generate inverse relationship if applicable
   */
  generateInverse(relationship: TRelationship): TRelationship | null {
    // Check if this relationship type should have an inverse
    if (this.config.noInverseTypes?.has(relationship.type)) {
      return null;
    }
    
    // Get the inverse type
    const inverseType = this.config.inverseMap.get(relationship.type);
    if (!inverseType) {
      return null;
    }
    
    // Create the inverse relationship
    return {
      ...relationship,
      id: this.config.generateInverseId!(relationship, inverseType),
      type: inverseType,
      sourceId: relationship.targetId,
      targetId: relationship.sourceId,
      metadata: {
        ...relationship.metadata,
        isInverse: true,
        originalRelationshipId: relationship.id,
        originalType: relationship.type
      }
    } as TRelationship;
  }
  
  /**
   * Generate all inverse relationships for a set of relationships
   */
  generateInverses(relationships: TRelationship[]): TRelationship[] {
    const inverses: TRelationship[] = [];
    
    for (const relationship of relationships) {
      const inverse = this.generateInverse(relationship);
      if (inverse) {
        inverses.push(inverse);
      }
    }
    
    return inverses;
  }
  
  /**
   * Check if a relationship is an inverse
   */
  isInverse(relationship: TRelationship): boolean {
    return relationship.metadata?.isInverse === true;
  }
  
  /**
   * Get the inverse type for a relationship type
   */
  getInverseType(type: string): string | null {
    return this.config.inverseMap.get(type) || null;
  }
  
  /**
   * Check if a relationship type has an inverse
   */
  hasInverse(type: string): boolean {
    return this.config.inverseMap.has(type) && !this.config.noInverseTypes!.has(type);
  }
  
  /**
   * Add a new inverse mapping
   */
  addInverseMapping(type: string, inverseType: string, bidirectional: boolean = true): void {
    this.config.inverseMap.set(type, inverseType);
    if (bidirectional) {
      this.config.inverseMap.set(inverseType, type);
    }
  }
  
  /**
   * Remove an inverse mapping
   */
  removeInverseMapping(type: string): void {
    const inverseType = this.config.inverseMap.get(type);
    this.config.inverseMap.delete(type);
    if (inverseType) {
      this.config.inverseMap.delete(inverseType);
    }
  }
}

/**
 * Utility function to filter relationships by direction
 */
export function filterRelationshipsByDirection<T extends IGraphRelationship>(
  relationships: T[],
  includeOriginal = true,
  includeInverse = true
): T[] {
  return relationships.filter(rel => {
    const isInverse = rel.metadata?.isInverse === true;
    return (includeOriginal && !isInverse) || (includeInverse && isInverse);
  });
}

/**
 * Get relationships of a specific type including inverses
 */
export function getRelationshipsWithInverses<T extends IGraphRelationship>(
  relationships: T[],
  type: string,
  inverter: RelationshipInverter<T>
): T[] {
  const inverseType = inverter.getInverseType(type);
  
  return relationships.filter(rel => 
    rel.type === type || (inverseType && rel.type === inverseType)
  );
}