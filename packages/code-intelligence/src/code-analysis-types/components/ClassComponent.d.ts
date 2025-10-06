/**
 * Class component implementation
 */
import { IClassComponent, Location, ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a class in the codebase
 */
export declare class ClassComponent extends BaseComponent implements IClassComponent {
    readonly type = ComponentType.CLASS;
    readonly isAbstract?: boolean;
    readonly isFinal?: boolean;
    readonly isStatic?: boolean;
    readonly accessModifier: 'public' | 'private' | 'protected' | 'package';
    readonly superClass?: string;
    readonly interfaces?: string[];
    readonly implementedInterfaces?: string[];
    readonly decorators?: string[];
    readonly generics?: string[];
    readonly documentation?: string;
    constructor(id: string, name: string, language: string, filePath: string, location: Location, options?: {
        isAbstract?: boolean;
        isFinal?: boolean;
        isStatic?: boolean;
        accessModifier?: 'public' | 'private' | 'protected' | 'package';
        superClass?: string;
        interfaces?: string[];
        implementedInterfaces?: string[];
        decorators?: string[];
        generics?: string[];
        documentation?: string;
    }, metadata?: Record<string, any>);
    /**
     * Create a ClassComponent with automatic ID generation
     */
    static create(name: string, language: string, filePath: string, location: Location, options?: {
        isAbstract?: boolean;
        isFinal?: boolean;
        isStatic?: boolean;
        accessModifier?: 'public' | 'private' | 'protected' | 'package';
        superClass?: string;
        interfaces?: string[];
        implementedInterfaces?: string[];
        decorators?: string[];
        generics?: string[];
        documentation?: string;
    }, metadata?: Record<string, any>): ClassComponent;
    /**
     * Check if class extends another class
     */
    extends(className: string): boolean;
    /**
     * Check if class implements an interface
     */
    implements(interfaceName: string): boolean;
    /**
     * Check if class has decorators
     */
    hasDecorators(): boolean;
    /**
     * Check if class is generic
     */
    isGeneric(): boolean;
    /**
     * Get inheritance hierarchy depth (0 for no parent)
     */
    getInheritanceDepth(): number;
    /**
     * Check if class is a base class (no parent)
     */
    isBaseClass(): boolean;
    toJSON(): Record<string, any>;
    /**
     * Get component-specific data
     */
    getSpecificData(): Record<string, any>;
}
//# sourceMappingURL=ClassComponent.d.ts.map