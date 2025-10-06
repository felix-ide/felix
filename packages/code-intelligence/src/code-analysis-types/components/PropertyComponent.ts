/**
 * Property component implementation
 */

import { Location, IComponent, ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';

/**
 * Property component interface extension
 */
interface IPropertyComponent extends IComponent {
  type: ComponentType.PROPERTY;
  propertyType?: string;
  defaultValue?: string;
  isStatic?: boolean;
  isReadonly?: boolean;
  accessModifier: 'public' | 'private' | 'protected' | 'package';
  decorators?: string[];
  documentation?: string;
}

/**
 * Represents a property in the codebase
 */
export class PropertyComponent extends BaseComponent implements IPropertyComponent {
  public readonly type = ComponentType.PROPERTY;
  public readonly propertyType?: string;
  public readonly defaultValue?: string;
  public readonly isStatic?: boolean;
  public readonly isReadonly?: boolean;
  public readonly accessModifier: 'public' | 'private' | 'protected' | 'package';
  public readonly decorators?: string[];
  public readonly documentation?: string;

  constructor(
    id: string,
    name: string,
    language: string,
    filePath: string,
    location: Location,
    options: {
      propertyType?: string;
      defaultValue?: string;
      isStatic?: boolean;
      isReadonly?: boolean;
      accessModifier?: 'public' | 'private' | 'protected' | 'package';
      decorators?: string[];
      documentation?: string;
    } = {},
    metadata: Record<string, any> = {}
  ) {
    super(id, name, ComponentType.PROPERTY, language, filePath, location, metadata);
    if (options.propertyType !== undefined) this.propertyType = options.propertyType;
    if (options.defaultValue !== undefined) this.defaultValue = options.defaultValue;
    if (options.isStatic !== undefined) this.isStatic = options.isStatic;
    if (options.isReadonly !== undefined) this.isReadonly = options.isReadonly;
    this.accessModifier = options.accessModifier || 'public';
    if (options.decorators !== undefined) this.decorators = options.decorators;
    if (options.documentation !== undefined) this.documentation = options.documentation;
  }

  /**
   * Create a PropertyComponent with automatic ID generation
   */
  static create(
    name: string,
    language: string,
    filePath: string,
    location: Location,
    options: {
      propertyType?: string;
      defaultValue?: string;
      isStatic?: boolean;
      isReadonly?: boolean;
      accessModifier?: 'public' | 'private' | 'protected' | 'package';
      decorators?: string[];
      documentation?: string;
    } = {},
    metadata: Record<string, any> = {}
  ): PropertyComponent {
    const id = `property_${name}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    
    return new PropertyComponent(
      id,
      name,
      language,
      filePath,
      location,
      options,
      metadata
    );
  }

  /**
   * Check if property is static
   */
  static(): boolean {
    return this.isStatic || false;
  }

  /**
   * Check if property is readonly
   */
  readonly(): boolean {
    return this.isReadonly || false;
  }

  /**
   * Check if property has a default value
   */
  hasDefaultValue(): boolean {
    return this.defaultValue !== undefined;
  }

  /**
   * Check if property has decorators
   */
  hasDecorators(): boolean {
    return this.decorators !== undefined && this.decorators.length > 0;
  }

  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      propertyType: this.propertyType,
      defaultValue: this.defaultValue,
      isStatic: this.isStatic,
      isReadonly: this.isReadonly,
      accessModifier: this.accessModifier,
      decorators: this.decorators,
      documentation: this.documentation
    };
  }

  /**
   * Get component-specific data
   */
  public getSpecificData(): Record<string, any> {
    return {
      propertyType: this.propertyType,
      defaultValue: this.defaultValue,
      isStatic: this.isStatic,
      isReadonly: this.isReadonly,
      accessModifier: this.accessModifier,
      decorators: this.decorators,
      documentation: this.documentation
    };
  }
}