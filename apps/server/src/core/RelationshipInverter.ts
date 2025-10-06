/**
 * RelationshipInverter - Re-export from knowledge-graph library for backward compatibility
 */

import { 
  RelationshipInverter as GenericRelationshipInverter,
  createFelixRelationshipConfig,
  filterRelationshipsByDirection as genericFilterRelationshipsByDirection,
  getRelationshipsWithInverses as genericGetRelationshipsWithInverses
} from '@felix/code-intelligence';
import { IRelationship, RelationshipType } from '@felix/code-intelligence';

// Create the pre-configured inverter for Felix
const felixInverter = new GenericRelationshipInverter<IRelationship>(
  createFelixRelationshipConfig()
);

/**
 * Felix specific RelationshipInverter that maintains the exact same API
 */
export class RelationshipInverter {
  /**
   * Generate inverse relationship if applicable
   */
  static generateInverse(relationship: IRelationship): IRelationship | null {
    return felixInverter.generateInverse(relationship);
  }
  
  /**
   * Generate all inverse relationships for a set of relationships
   */
  static generateInverses(relationships: IRelationship[]): IRelationship[] {
    return felixInverter.generateInverses(relationships);
  }
  
  /**
   * Check if a relationship is an inverse
   */
  static isInverse(relationship: IRelationship): boolean {
    return felixInverter.isInverse(relationship);
  }
  
  /**
   * Get the inverse type for a relationship type
   */
  static getInverseType(type: RelationshipType): RelationshipType | null {
    return felixInverter.getInverseType(type) as RelationshipType | null;
  }
  
  /**
   * Check if a relationship type has an inverse
   */
  static hasInverse(type: RelationshipType): boolean {
    return felixInverter.hasInverse(type);
  }
}

/**
 * Utility function to filter relationships by direction
 */
export function filterRelationshipsByDirection(
  relationships: IRelationship[],
  includeOriginal = true,
  includeInverse = true
): IRelationship[] {
  return genericFilterRelationshipsByDirection(relationships, includeOriginal, includeInverse);
}

/**
 * Get relationships of a specific type including inverses
 */
export function getRelationshipsWithInverses(
  relationships: IRelationship[],
  type: RelationshipType
): IRelationship[] {
  return genericGetRelationshipsWithInverses(relationships, type, felixInverter);
}