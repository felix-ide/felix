/**
 * Variable component implementation
 */

import { Location, IComponent, ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';

/**
 * Variable component interface extension
 */
interface IVariableComponent extends IComponent {
  type: ComponentType.VARIABLE;
  variableType?: string;
  defaultValue?: string;
  scope: 'global' | 'local' | 'parameter' | 'closure';
  isConst?: boolean;
  documentation?: string;
}

/**
 * Represents a variable in the codebase
 */
export class VariableComponent extends BaseComponent implements IVariableComponent {
  public readonly type = ComponentType.VARIABLE;
  public readonly variableType?: string;
  public readonly defaultValue?: string;
  public readonly scope: 'global' | 'local' | 'parameter' | 'closure';
  public readonly isConst?: boolean;
  public readonly documentation?: string;

  constructor(
    id: string,
    name: string,
    language: string,
    filePath: string,
    location: Location,
    options: {
      variableType?: string;
      defaultValue?: string;
      scope?: 'global' | 'local' | 'parameter' | 'closure';
      isConst?: boolean;
      documentation?: string;
    } = {},
    metadata: Record<string, any> = {}
  ) {
    super(id, name, ComponentType.VARIABLE, language, filePath, location, metadata);
    if (options.variableType !== undefined) this.variableType = options.variableType;
    if (options.defaultValue !== undefined) this.defaultValue = options.defaultValue;
    this.scope = options.scope || 'local';
    if (options.isConst !== undefined) this.isConst = options.isConst;
    if (options.documentation !== undefined) this.documentation = options.documentation;
  }

  /**
   * Create a VariableComponent with automatic ID generation
   */
  static create(
    name: string,
    language: string,
    filePath: string,
    location: Location,
    options: {
      variableType?: string;
      defaultValue?: string;
      scope?: 'global' | 'local' | 'parameter' | 'closure';
      isConst?: boolean;
      documentation?: string;
    } = {},
    metadata: Record<string, any> = {}
  ): VariableComponent {
    const id = `variable_${name}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    
    return new VariableComponent(
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
   * Check if variable is const
   */
  const(): boolean {
    return this.isConst || false;
  }

  /**
   * Check if variable has a default value
   */
  hasDefaultValue(): boolean {
    return this.defaultValue !== undefined;
  }

  /**
   * Check if variable is global scope
   */
  isGlobal(): boolean {
    return this.scope === 'global';
  }

  /**
   * Check if variable is local scope
   */
  isLocal(): boolean {
    return this.scope === 'local';
  }

  /**
   * Check if variable is parameter scope
   */
  isParameter(): boolean {
    return this.scope === 'parameter';
  }

  /**
   * Check if variable is closure scope
   */
  isClosure(): boolean {
    return this.scope === 'closure';
  }

  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      variableType: this.variableType,
      defaultValue: this.defaultValue,
      scope: this.scope,
      isConst: this.isConst,
      documentation: this.documentation
    };
  }

  /**
   * Get component-specific data
   */
  public getSpecificData(): Record<string, any> {
    return {
      variableType: this.variableType,
      defaultValue: this.defaultValue,
      scope: this.scope,
      isConst: this.isConst,
      documentation: this.documentation
    };
  }
}