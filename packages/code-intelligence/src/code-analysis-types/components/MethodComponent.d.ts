/**
 * Method component implementation
 */
import { IMethodComponent, Location, Parameter, ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a method in the codebase
 */
export declare class MethodComponent extends BaseComponent implements IMethodComponent {
    readonly type = ComponentType.METHOD;
    readonly parameters: Parameter[];
    readonly returnType?: string;
    readonly isAsync?: boolean;
    readonly isGenerator?: boolean;
    readonly isStatic?: boolean;
    readonly isAbstract?: boolean;
    readonly isFinal?: boolean;
    readonly isConstructor?: boolean;
    readonly accessModifier: 'public' | 'private' | 'protected' | 'package';
    readonly decorators?: string[];
    readonly documentation?: string;
    constructor(id: string, name: string, language: string, filePath: string, location: Location, options?: {
        parameters?: Parameter[];
        returnType?: string;
        isAsync?: boolean;
        isGenerator?: boolean;
        isStatic?: boolean;
        isAbstract?: boolean;
        isFinal?: boolean;
        isConstructor?: boolean;
        accessModifier?: 'public' | 'private' | 'protected' | 'package';
        decorators?: string[];
        documentation?: string;
    }, metadata?: Record<string, any>);
    /**
     * Create a MethodComponent with automatic ID generation
     */
    static create(name: string, language: string, filePath: string, location: Location, options?: {
        parameters?: Parameter[];
        returnType?: string;
        isAsync?: boolean;
        isGenerator?: boolean;
        isStatic?: boolean;
        isAbstract?: boolean;
        isFinal?: boolean;
        isConstructor?: boolean;
        accessModifier?: 'public' | 'private' | 'protected' | 'package';
        decorators?: string[];
        documentation?: string;
    }, metadata?: Record<string, any>): MethodComponent;
    /**
     * Get parameter by name
     */
    getParameter(name: string): Parameter | undefined;
    /**
     * Get parameter count
     */
    getParameterCount(): number;
    /**
     * Check if method has a specific parameter
     */
    hasParameter(name: string): boolean;
    /**
     * Get required parameters (not optional)
     */
    getRequiredParameters(): Parameter[];
    /**
     * Get optional parameters
     */
    getOptionalParameters(): Parameter[];
    /**
     * Check if method is async
     */
    async(): boolean;
    /**
     * Check if method is a generator
     */
    generator(): boolean;
    /**
     * Check if method is static
     */
    static(): boolean;
    /**
     * Check if method is abstract
     */
    abstract(): boolean;
    /**
     * Check if method is final
     */
    final(): boolean;
    /**
     * Check if method is a constructor
     */
    constructor_method(): boolean;
    /**
     * Check if method has decorators
     */
    hasDecorators(): boolean;
    /**
     * Get method signature as string
     */
    getSignature(): string;
    toJSON(): Record<string, any>;
    /**
     * Get component-specific data
     */
    getSpecificData(): Record<string, any>;
}
//# sourceMappingURL=MethodComponent.d.ts.map