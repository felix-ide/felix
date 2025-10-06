/**
 * Variable component implementation
 */
import { ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a variable in the codebase
 */
export class VariableComponent extends BaseComponent {
    type = ComponentType.VARIABLE;
    variableType;
    defaultValue;
    scope;
    isConst;
    documentation;
    constructor(id, name, language, filePath, location, options = {}, metadata = {}) {
        super(id, name, ComponentType.VARIABLE, language, filePath, location, metadata);
        if (options.variableType !== undefined)
            this.variableType = options.variableType;
        if (options.defaultValue !== undefined)
            this.defaultValue = options.defaultValue;
        this.scope = options.scope || 'local';
        if (options.isConst !== undefined)
            this.isConst = options.isConst;
        if (options.documentation !== undefined)
            this.documentation = options.documentation;
    }
    /**
     * Create a VariableComponent with automatic ID generation
     */
    static create(name, language, filePath, location, options = {}, metadata = {}) {
        const id = `variable_${name}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        return new VariableComponent(id, name, language, filePath, location, options, metadata);
    }
    /**
     * Check if variable is const
     */
    const() {
        return this.isConst || false;
    }
    /**
     * Check if variable has a default value
     */
    hasDefaultValue() {
        return this.defaultValue !== undefined;
    }
    /**
     * Check if variable is global scope
     */
    isGlobal() {
        return this.scope === 'global';
    }
    /**
     * Check if variable is local scope
     */
    isLocal() {
        return this.scope === 'local';
    }
    /**
     * Check if variable is parameter scope
     */
    isParameter() {
        return this.scope === 'parameter';
    }
    /**
     * Check if variable is closure scope
     */
    isClosure() {
        return this.scope === 'closure';
    }
    toJSON() {
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
    getSpecificData() {
        return {
            variableType: this.variableType,
            defaultValue: this.defaultValue,
            scope: this.scope,
            isConst: this.isConst,
            documentation: this.documentation
        };
    }
}
//# sourceMappingURL=VariableComponent.js.map