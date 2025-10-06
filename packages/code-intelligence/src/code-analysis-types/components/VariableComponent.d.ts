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
export declare class VariableComponent extends BaseComponent implements IVariableComponent {
    readonly type = ComponentType.VARIABLE;
    readonly variableType?: string;
    readonly defaultValue?: string;
    readonly scope: 'global' | 'local' | 'parameter' | 'closure';
    readonly isConst?: boolean;
    readonly documentation?: string;
    constructor(id: string, name: string, language: string, filePath: string, location: Location, options?: {
        variableType?: string;
        defaultValue?: string;
        scope?: 'global' | 'local' | 'parameter' | 'closure';
        isConst?: boolean;
        documentation?: string;
    }, metadata?: Record<string, any>);
    /**
     * Create a VariableComponent with automatic ID generation
     */
    static create(name: string, language: string, filePath: string, location: Location, options?: {
        variableType?: string;
        defaultValue?: string;
        scope?: 'global' | 'local' | 'parameter' | 'closure';
        isConst?: boolean;
        documentation?: string;
    }, metadata?: Record<string, any>): VariableComponent;
    /**
     * Check if variable is const
     */
    const(): boolean;
    /**
     * Check if variable has a default value
     */
    hasDefaultValue(): boolean;
    /**
     * Check if variable is global scope
     */
    isGlobal(): boolean;
    /**
     * Check if variable is local scope
     */
    isLocal(): boolean;
    /**
     * Check if variable is parameter scope
     */
    isParameter(): boolean;
    /**
     * Check if variable is closure scope
     */
    isClosure(): boolean;
    toJSON(): Record<string, any>;
    /**
     * Get component-specific data
     */
    getSpecificData(): Record<string, any>;
}
export {};
//# sourceMappingURL=VariableComponent.d.ts.map