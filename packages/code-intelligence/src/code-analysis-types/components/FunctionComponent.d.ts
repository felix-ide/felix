/**
 * Function component implementation
 */
import { IFunctionComponent, Location, Parameter, ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a function in the codebase
 */
export declare class FunctionComponent extends BaseComponent implements IFunctionComponent {
    readonly type = ComponentType.FUNCTION;
    readonly parameters: Parameter[];
    readonly returnType?: string;
    readonly isAsync?: boolean;
    readonly isGenerator?: boolean;
    readonly isArrow?: boolean;
    readonly accessModifier?: 'public' | 'private' | 'protected' | 'package';
    readonly decorators?: string[];
    readonly documentation?: string;
    constructor(id: string, name: string, language: string, filePath: string, location: Location, options?: {
        parameters?: Parameter[];
        returnType?: string;
        isAsync?: boolean;
        isGenerator?: boolean;
        isArrow?: boolean;
        accessModifier?: 'public' | 'private' | 'protected' | 'package';
        decorators?: string[];
        documentation?: string;
    }, metadata?: Record<string, any>);
    /**
     * Create a FunctionComponent with automatic ID generation
     */
    static create(name: string, language: string, filePath: string, location: Location, options?: {
        parameters?: Parameter[];
        returnType?: string;
        isAsync?: boolean;
        isGenerator?: boolean;
        isArrow?: boolean;
        accessModifier?: 'public' | 'private' | 'protected' | 'package';
        decorators?: string[];
        documentation?: string;
    }, metadata?: Record<string, any>): FunctionComponent;
    /**
     * Get parameter by name
     */
    getParameter(name: string): Parameter | undefined;
    /**
     * Get parameter count
     */
    getParameterCount(): number;
    /**
     * Check if function has a specific parameter
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
     * Check if function is async
     */
    async(): boolean;
    /**
     * Check if function is a generator
     */
    generator(): boolean;
    /**
     * Check if function is an arrow function
     */
    arrow(): boolean;
    /**
     * Check if function has decorators
     */
    hasDecorators(): boolean;
    /**
     * Get function signature as string
     */
    getSignature(): string;
    toJSON(): Record<string, any>;
    /**
     * Get component-specific data
     */
    getSpecificData(): Record<string, any>;
}
//# sourceMappingURL=FunctionComponent.d.ts.map