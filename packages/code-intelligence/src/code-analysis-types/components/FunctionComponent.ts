/**
 * Function component implementation
 */

import { IFunctionComponent, Location, Parameter, ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';

/**
 * Represents a function in the codebase
 */
export class FunctionComponent extends BaseComponent implements IFunctionComponent {
  public readonly type = ComponentType.FUNCTION;
  public readonly parameters: Parameter[];
  public readonly returnType?: string;
  public readonly isAsync?: boolean;
  public readonly isGenerator?: boolean;
  public readonly isArrow?: boolean;
  public readonly accessModifier?: 'public' | 'private' | 'protected' | 'package';
  public readonly decorators?: string[];
  public readonly documentation?: string;

  constructor(
    id: string,
    name: string,
    language: string,
    filePath: string,
    location: Location,
    options: {
      parameters?: Parameter[];
      returnType?: string;
      isAsync?: boolean;
      isGenerator?: boolean;
      isArrow?: boolean;
      accessModifier?: 'public' | 'private' | 'protected' | 'package';
      decorators?: string[];
      documentation?: string;
    } = {},
    metadata: Record<string, any> = {}
  ) {
    super(id, name, ComponentType.FUNCTION, language, filePath, location, metadata);
    this.parameters = options.parameters || [];
    if (options.returnType !== undefined) this.returnType = options.returnType;
    if (options.isAsync !== undefined) this.isAsync = options.isAsync;
    if (options.isGenerator !== undefined) this.isGenerator = options.isGenerator;
    if (options.isArrow !== undefined) this.isArrow = options.isArrow;
    if (options.accessModifier !== undefined) this.accessModifier = options.accessModifier;
    if (options.decorators !== undefined) this.decorators = options.decorators;
    if (options.documentation !== undefined) this.documentation = options.documentation;
  }

  /**
   * Create a FunctionComponent with automatic ID generation
   */
  static create(
    name: string,
    language: string,
    filePath: string,
    location: Location,
    options: {
      parameters?: Parameter[];
      returnType?: string;
      isAsync?: boolean;
      isGenerator?: boolean;
      isArrow?: boolean;
      accessModifier?: 'public' | 'private' | 'protected' | 'package';
      decorators?: string[];
      documentation?: string;
    } = {},
    metadata: Record<string, any> = {}
  ): FunctionComponent {
    const id = `function_${name}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    
    return new FunctionComponent(
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
   * Get parameter by name
   */
  getParameter(name: string): Parameter | undefined {
    return this.parameters.find(param => param.name === name);
  }

  /**
   * Get parameter count
   */
  getParameterCount(): number {
    return this.parameters.length;
  }

  /**
   * Check if function has a specific parameter
   */
  hasParameter(name: string): boolean {
    return this.parameters.some(param => param.name === name);
  }

  /**
   * Get required parameters (not optional)
   */
  getRequiredParameters(): Parameter[] {
    return this.parameters.filter(param => !param.isOptional);
  }

  /**
   * Get optional parameters
   */
  getOptionalParameters(): Parameter[] {
    return this.parameters.filter(param => param.isOptional);
  }

  /**
   * Check if function is async
   */
  async(): boolean {
    return this.isAsync || false;
  }

  /**
   * Check if function is a generator
   */
  generator(): boolean {
    return this.isGenerator || false;
  }

  /**
   * Check if function is an arrow function
   */
  arrow(): boolean {
    return this.isArrow || false;
  }

  /**
   * Check if function has decorators
   */
  hasDecorators(): boolean {
    return this.decorators !== undefined && this.decorators.length > 0;
  }

  /**
   * Get function signature as string
   */
  getSignature(): string {
    const params = this.parameters.map(param => {
      let sig = param.name;
      if (param.type) sig += `: ${param.type}`;
      if (param.isOptional) sig += '?';
      if (param.defaultValue) sig += ` = ${param.defaultValue}`;
      return sig;
    }).join(', ');
    
    let signature = `${this.name}(${params})`;
    if (this.returnType) signature += `: ${this.returnType}`;
    
    return signature;
  }

  override toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      parameters: this.parameters,
      returnType: this.returnType,
      isAsync: this.isAsync,
      isGenerator: this.isGenerator,
      isArrow: this.isArrow,
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
      parameters: this.parameters,
      returnType: this.returnType,
      isAsync: this.isAsync,
      isGenerator: this.isGenerator,
      isArrow: this.isArrow,
      accessModifier: this.accessModifier,
      decorators: this.decorators,
      documentation: this.documentation
    };
  }
}