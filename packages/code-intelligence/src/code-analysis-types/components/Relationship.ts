/**
 * Relationship implementation for connecting components
 */

import { IRelationship, Location, RelationshipType } from '../entities/index.js';
import { createHash } from 'crypto';

/**
 * Represents a relationship between two components
 */
export class Relationship implements IRelationship {
  public readonly id: string;
  public readonly type: RelationshipType;
  public readonly sourceId: string;
  public readonly targetId: string;
  public readonly location?: Location;
  public readonly metadata: Record<string, any>;

  constructor(
    type: RelationshipType,
    sourceId: string,
    targetId: string,
    location?: Location,
    metadata: Record<string, any> = {}
  ) {
    this.type = type;
    this.sourceId = sourceId;
    this.targetId = targetId;
    if (location !== undefined) this.location = location;
    this.metadata = metadata;
    this.id = this.createId();
  }

  /**
   * Compute a stable relationship ID from parts.
   * Algorithm is the single source of truth used across the system.
   */
  static computeId(
    type: string | RelationshipType,
    sourceId: string,
    targetId: string,
    _location?: Location
  ): string {
    // Decomposable, canonical ID: rel:{type}:{sourceId}:{targetId}
    // Parts are URI-encoded to keep it reversible and safe.
    const enc = (s: string) => encodeURIComponent(String(s));
    return `rel:${enc(String(type))}:${enc(sourceId)}:${enc(targetId)}`;
  }

  /**
   * Create a unique ID for the relationship
   */
  private createId(): string {
    return Relationship.computeId(this.type, this.sourceId, this.targetId, this.location);
  }

  /**
   * Create a relationship with automatic ID generation
   */
  static create(
    type: string | RelationshipType,
    sourceId: string,
    targetId: string,
    location?: Location,
    metadata: Record<string, any> = {}
  ): Relationship {
    return new Relationship(
      type as RelationshipType,
      sourceId,
      targetId,
      location,
      metadata
    );
  }

  /**
   * Create a typed relationship using RelationshipType enum
   */
  static createTyped(
    type: RelationshipType,
    sourceId: string,
    targetId: string,
    location?: Location,
    metadata: Record<string, any> = {}
  ): Relationship {
    return new Relationship(type, sourceId, targetId, location, metadata);
  }

  /**
   * Check if this relationship matches another relationship
   */
  equals(other: Relationship): boolean {
    return (
      this.type === other.type &&
      this.sourceId === other.sourceId &&
      this.targetId === other.targetId &&
      this.locationEquals(other.location)
    );
  }

  /**
   * Check if locations are equal
   */
  private locationEquals(otherLocation?: Location): boolean {
    if (!this.location && !otherLocation) return true;
    if (!this.location || !otherLocation) return false;
    
    return (
      this.location.startLine === otherLocation.startLine &&
      this.location.startColumn === otherLocation.startColumn &&
      this.location.endLine === otherLocation.endLine &&
      this.location.endColumn === otherLocation.endColumn
    );
  }

  /**
   * Check if this is a reverse relationship of another
   */
  isReverse(other: Relationship): boolean {
    return (
      this.sourceId === other.targetId &&
      this.targetId === other.sourceId &&
      this.getOppositeType() === other.type
    );
  }

  /**
   * Get the opposite relationship type (if applicable)
   */
  private getOppositeType(): RelationshipType | null {
    const opposites: Partial<Record<RelationshipType, RelationshipType>> = {
      [RelationshipType.EXTENDS]: RelationshipType.EXTENDS, // Same type, different direction
      [RelationshipType.IMPLEMENTS]: RelationshipType.IMPLEMENTS,
      [RelationshipType.CALLS]: RelationshipType.CALLS,
      [RelationshipType.REFERENCES]: RelationshipType.REFERENCES,
      [RelationshipType.USES]: RelationshipType.USES,
      [RelationshipType.CONTAINS]: RelationshipType.BELONGS_TO,
      [RelationshipType.BELONGS_TO]: RelationshipType.CONTAINS,
      [RelationshipType.IMPORTS]: RelationshipType.EXPORTS,
      [RelationshipType.EXPORTS]: RelationshipType.IMPORTS
    };
    
    return opposites[this.type] || null;
  }

  /**
   * Create the reverse relationship
   */
  createReverse(): Relationship | null {
    const oppositeType = this.getOppositeType();
    if (!oppositeType) return null;
    
    return new Relationship(
      oppositeType,
      this.targetId,
      this.sourceId,
      this.location,
      { ...this.metadata, isReverse: true }
    );
  }

  /**
   * Check if relationship involves a specific component
   */
  involves(componentId: string): boolean {
    return this.sourceId === componentId || this.targetId === componentId;
  }

  /**
   * Get the other component ID in the relationship
   */
  getOther(componentId: string): string | null {
    if (this.sourceId === componentId) return this.targetId;
    if (this.targetId === componentId) return this.sourceId;
    return null;
  }

  /**
   * Check if this is a structural relationship (contains, belongs_to, etc.)
   */
  isStructural(): boolean {
    const structuralTypes = [
      RelationshipType.CONTAINS,
      RelationshipType.BELONGS_TO,
      RelationshipType.BELONGS_TO,
      RelationshipType.HAS_METHOD,
      RelationshipType.HAS_PROPERTY,
      RelationshipType.HAS_PARAMETER,
      RelationshipType.IN_NAMESPACE
    ];
    
    return structuralTypes.includes(this.type as RelationshipType);
  }

  /**
   * Check if this is a behavioral relationship (calls, uses, etc.)
   */
  isBehavioral(): boolean {
    const behavioralTypes = [
      RelationshipType.CALLS,
      RelationshipType.USES,
      RelationshipType.REFERENCES,
      RelationshipType.CREATES,
      RelationshipType.THROWS,
      RelationshipType.CATCHES,
      RelationshipType.YIELDS_TO,
      RelationshipType.SENDS_TO,
      RelationshipType.DEFERS,
      RelationshipType.DELEGATES_TO
    ];
    
    return behavioralTypes.includes(this.type as RelationshipType);
  }

  /**
   * Check if this is an inheritance relationship
   */
  isInheritance(): boolean {
    const inheritanceTypes = [
      RelationshipType.EXTENDS,
      RelationshipType.IMPLEMENTS,
      RelationshipType.INHERITS_MULTIPLE,
      RelationshipType.MIXES_IN,
      RelationshipType.USES_TRAIT,
      RelationshipType.PROTOCOL_CONFORMS,
      RelationshipType.IMPLEMENTS_ABSTRACT
    ];
    
    return inheritanceTypes.includes(this.type as RelationshipType);
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      sourceId: this.sourceId,
      targetId: this.targetId,
      location: this.location,
      metadata: this.metadata
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data: Record<string, any>): Relationship {
    return new Relationship(
      data.type,
      data.sourceId,
      data.targetId,
      data.location,
      data.metadata || {}
    );
  }

  /**
   * Clone the relationship
   */
  clone(): Relationship {
    return new Relationship(
      this.type,
      this.sourceId,
      this.targetId,
      this.location ? { ...this.location } : undefined,
      { ...this.metadata }
    );
  }
}
