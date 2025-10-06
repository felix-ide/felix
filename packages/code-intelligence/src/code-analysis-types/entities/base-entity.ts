/**
 * Base entity class providing common functionality for all code analysis entities
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Base metadata interface that all entities can extend
 */
export interface BaseMetadata {
  createdAt?: string;
  updatedAt?: string;
  version?: string;
  [key: string]: any;
}

/**
 * Abstract base entity class with common functionality
 */
export abstract class BaseEntity {
  public readonly id: string;
  public metadata: BaseMetadata;

  constructor(id?: string, metadata: BaseMetadata = {}) {
    this.id = id || this.generateId();
    this.metadata = {
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      ...metadata,
    };
  }

  /**
   * Generate a unique ID for the entity
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Update the entity's metadata
   */
  public updateMetadata(updates: Partial<BaseMetadata>): void {
    this.metadata = {
      ...this.metadata,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get a metadata value by key
   */
  public getMetadata<T = any>(key: string): T | undefined {
    return this.metadata[key] as T;
  }

  /**
   * Set a metadata value by key
   */
  public setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
    this.metadata.updatedAt = new Date().toISOString();
  }

  /**
   * Validate the entity (override in subclasses)
   */
  public abstract validate(): { isValid: boolean; errors: string[] };

  /**
   * Serialize to JSON
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      metadata: this.metadata,
      ...this.getSerializableFields(),
    };
  }

  /**
   * Get fields to include in serialization (override in subclasses)
   */
  protected abstract getSerializableFields(): Record<string, any>;

  /**
   * Create from JSON (static factory method - override in subclasses)
   */
  public static fromJSON(data: Record<string, any>): BaseEntity {
    throw new Error('fromJSON must be implemented in subclasses');
  }

  /**
   * Get the entity type (override in subclasses)
   */
  public abstract getType(): string;

  /**
   * Get a human-readable name for the entity (override in subclasses)
   */
  public abstract getName(): string;

  /**
   * Clone the entity with a new ID
   */
  public clone(): BaseEntity {
    const cloned = Object.create(Object.getPrototypeOf(this));
    Object.assign(cloned, this);
    cloned.id = this.generateId();
    cloned.metadata = {
      ...this.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return cloned;
  }

  /**
   * Check if this entity equals another entity
   */
  public equals(other: BaseEntity): boolean {
    return this.id === other.id && this.getType() === other.getType();
  }

  /**
   * Get a hash code for the entity
   */
  public hashCode(): string {
    return `${this.getType()}:${this.id}`;
  }
}