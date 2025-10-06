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
export declare class PropertyComponent extends BaseComponent implements IPropertyComponent {
    readonly type = ComponentType.PROPERTY;
    readonly propertyType?: string;
    readonly defaultValue?: string;
    readonly isStatic?: boolean;
    readonly isReadonly?: boolean;
    readonly accessModifier: 'public' | 'private' | 'protected' | 'package';
    readonly decorators?: string[];
    readonly documentation?: string;
    constructor(id: string, name: string, language: string, filePath: string, location: Location, options?: {
        propertyType?: string;
        defaultValue?: string;
        isStatic?: boolean;
        isReadonly?: boolean;
        accessModifier?: 'public' | 'private' | 'protected' | 'package';
        decorators?: string[];
        documentation?: string;
    }, metadata?: Record<string, any>);
    /**
     * Create a PropertyComponent with automatic ID generation
     */
    static create(name: string, language: string, filePath: string, location: Location, options?: {
        propertyType?: string;
        defaultValue?: string;
        isStatic?: boolean;
        isReadonly?: boolean;
        accessModifier?: 'public' | 'private' | 'protected' | 'package';
        decorators?: string[];
        documentation?: string;
    }, metadata?: Record<string, any>): PropertyComponent;
    /**
     * Check if property is static
     */
    static(): boolean;
    /**
     * Check if property is readonly
     */
    readonly(): boolean;
    /**
     * Check if property has a default value
     */
    hasDefaultValue(): boolean;
    /**
     * Check if property has decorators
     */
    hasDecorators(): boolean;
    toJSON(): Record<string, any>;
    /**
     * Get component-specific data
     */
    getSpecificData(): Record<string, any>;
}
export {};
//# sourceMappingURL=PropertyComponent.d.ts.map