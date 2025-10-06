/**
 * Base class for all component types
 */

import { ComponentType, Location } from '../entities/core-types.js';

export abstract class BaseComponent {
  public readonly id: string;
  public readonly name: string;
  public readonly type: ComponentType;
  public readonly language: string;
  public readonly filePath: string;
  public readonly location: Location;
  public readonly metadata: Record<string, any>;

  constructor(
    id: string,
    name: string,
    type: ComponentType,
    language: string,
    filePath: string,
    location: Location,
    metadata: Record<string, any> = {}
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.language = language;
    this.filePath = filePath;
    this.location = location;
    this.metadata = metadata;
  }

  /**
   * Clone the component with optional overrides
   */
  public clone(overrides?: Partial<BaseComponent>): BaseComponent {
    const ComponentConstructor = this.constructor as new (
      id: string,
      name: string,
      filePath: string,
      location: Location,
      language: string,
      metadata: Record<string, any>
    ) => BaseComponent;

    return new ComponentConstructor(
      overrides?.id || this.id,
      overrides?.name || this.name,
      overrides?.filePath || this.filePath,
      overrides?.location || this.location,
      overrides?.language || this.language,
      overrides?.metadata || this.metadata
    );
  }

  /**
   * Get component-specific data (to be implemented by subclasses)
   */
  public abstract getSpecificData(): Record<string, any>;

  /**
   * Convert to plain object
   */
  public toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      language: this.language,
      filePath: this.filePath,
      location: this.location,
      metadata: this.metadata,
      ...this.getSpecificData()
    };
  }

  /**
   * Convert to string representation
   */
  public toString(): string {
    return `${this.type}:${this.name} (${this.filePath}:${this.location.startLine})`;
  }
}