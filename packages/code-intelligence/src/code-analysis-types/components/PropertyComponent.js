/**
 * Property component implementation
 */
import { ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a property in the codebase
 */
export class PropertyComponent extends BaseComponent {
    type = ComponentType.PROPERTY;
    propertyType;
    defaultValue;
    isStatic;
    isReadonly;
    accessModifier;
    decorators;
    documentation;
    constructor(id, name, language, filePath, location, options = {}, metadata = {}) {
        super(id, name, ComponentType.PROPERTY, language, filePath, location, metadata);
        if (options.propertyType !== undefined)
            this.propertyType = options.propertyType;
        if (options.defaultValue !== undefined)
            this.defaultValue = options.defaultValue;
        if (options.isStatic !== undefined)
            this.isStatic = options.isStatic;
        if (options.isReadonly !== undefined)
            this.isReadonly = options.isReadonly;
        this.accessModifier = options.accessModifier || 'public';
        if (options.decorators !== undefined)
            this.decorators = options.decorators;
        if (options.documentation !== undefined)
            this.documentation = options.documentation;
    }
    /**
     * Create a PropertyComponent with automatic ID generation
     */
    static create(name, language, filePath, location, options = {}, metadata = {}) {
        const id = `property_${name}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        return new PropertyComponent(id, name, language, filePath, location, options, metadata);
    }
    /**
     * Check if property is static
     */
    static() {
        return this.isStatic || false;
    }
    /**
     * Check if property is readonly
     */
    readonly() {
        return this.isReadonly || false;
    }
    /**
     * Check if property has a default value
     */
    hasDefaultValue() {
        return this.defaultValue !== undefined;
    }
    /**
     * Check if property has decorators
     */
    hasDecorators() {
        return this.decorators !== undefined && this.decorators.length > 0;
    }
    toJSON() {
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
    getSpecificData() {
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
//# sourceMappingURL=PropertyComponent.js.map