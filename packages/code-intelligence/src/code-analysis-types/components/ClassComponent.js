/**
 * Class component implementation
 */
import { ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a class in the codebase
 */
export class ClassComponent extends BaseComponent {
    type = ComponentType.CLASS;
    isAbstract;
    isFinal;
    isStatic;
    accessModifier;
    superClass;
    interfaces;
    implementedInterfaces;
    decorators;
    generics;
    documentation;
    constructor(id, name, language, filePath, location, options = {}, metadata = {}) {
        super(id, name, ComponentType.CLASS, language, filePath, location, metadata);
        if (options.isAbstract !== undefined)
            this.isAbstract = options.isAbstract;
        if (options.isFinal !== undefined)
            this.isFinal = options.isFinal;
        if (options.isStatic !== undefined)
            this.isStatic = options.isStatic;
        this.accessModifier = options.accessModifier || 'public';
        if (options.superClass !== undefined)
            this.superClass = options.superClass;
        if (options.interfaces !== undefined)
            this.interfaces = options.interfaces;
        if (options.implementedInterfaces !== undefined)
            this.implementedInterfaces = options.implementedInterfaces;
        if (options.decorators !== undefined)
            this.decorators = options.decorators;
        if (options.generics !== undefined)
            this.generics = options.generics;
        if (options.documentation !== undefined)
            this.documentation = options.documentation;
    }
    /**
     * Create a ClassComponent with automatic ID generation
     */
    static create(name, language, filePath, location, options = {}, metadata = {}) {
        const id = `class_${name}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        return new ClassComponent(id, name, language, filePath, location, options, metadata);
    }
    /**
     * Check if class extends another class
     */
    extends(className) {
        return this.superClass === className;
    }
    /**
     * Check if class implements an interface
     */
    implements(interfaceName) {
        return this.interfaces?.includes(interfaceName) ||
            this.implementedInterfaces?.includes(interfaceName) ||
            false;
    }
    /**
     * Check if class has decorators
     */
    hasDecorators() {
        return this.decorators !== undefined && this.decorators.length > 0;
    }
    /**
     * Check if class is generic
     */
    isGeneric() {
        return this.generics !== undefined && this.generics.length > 0;
    }
    /**
     * Get inheritance hierarchy depth (0 for no parent)
     */
    getInheritanceDepth() {
        return this.superClass ? 1 : 0; // Note: This is simplified, real depth would require traversing the graph
    }
    /**
     * Check if class is a base class (no parent)
     */
    isBaseClass() {
        return !this.superClass;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            isAbstract: this.isAbstract,
            isFinal: this.isFinal,
            isStatic: this.isStatic,
            accessModifier: this.accessModifier,
            superClass: this.superClass,
            interfaces: this.interfaces,
            implementedInterfaces: this.implementedInterfaces,
            decorators: this.decorators,
            generics: this.generics,
            documentation: this.documentation
        };
    }
    /**
     * Get component-specific data
     */
    getSpecificData() {
        return {
            isAbstract: this.isAbstract,
            isFinal: this.isFinal,
            isStatic: this.isStatic,
            accessModifier: this.accessModifier,
            superClass: this.superClass,
            interfaces: this.interfaces,
            implementedInterfaces: this.implementedInterfaces,
            decorators: this.decorators,
            generics: this.generics,
            documentation: this.documentation
        };
    }
}
//# sourceMappingURL=ClassComponent.js.map