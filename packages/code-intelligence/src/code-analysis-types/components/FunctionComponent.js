/**
 * Function component implementation
 */
import { ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a function in the codebase
 */
export class FunctionComponent extends BaseComponent {
    type = ComponentType.FUNCTION;
    parameters;
    returnType;
    isAsync;
    isGenerator;
    isArrow;
    accessModifier;
    decorators;
    documentation;
    constructor(id, name, language, filePath, location, options = {}, metadata = {}) {
        super(id, name, ComponentType.FUNCTION, language, filePath, location, metadata);
        this.parameters = options.parameters || [];
        if (options.returnType !== undefined)
            this.returnType = options.returnType;
        if (options.isAsync !== undefined)
            this.isAsync = options.isAsync;
        if (options.isGenerator !== undefined)
            this.isGenerator = options.isGenerator;
        if (options.isArrow !== undefined)
            this.isArrow = options.isArrow;
        if (options.accessModifier !== undefined)
            this.accessModifier = options.accessModifier;
        if (options.decorators !== undefined)
            this.decorators = options.decorators;
        if (options.documentation !== undefined)
            this.documentation = options.documentation;
    }
    /**
     * Create a FunctionComponent with automatic ID generation
     */
    static create(name, language, filePath, location, options = {}, metadata = {}) {
        const id = `function_${name}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        return new FunctionComponent(id, name, language, filePath, location, options, metadata);
    }
    /**
     * Get parameter by name
     */
    getParameter(name) {
        return this.parameters.find(param => param.name === name);
    }
    /**
     * Get parameter count
     */
    getParameterCount() {
        return this.parameters.length;
    }
    /**
     * Check if function has a specific parameter
     */
    hasParameter(name) {
        return this.parameters.some(param => param.name === name);
    }
    /**
     * Get required parameters (not optional)
     */
    getRequiredParameters() {
        return this.parameters.filter(param => !param.isOptional);
    }
    /**
     * Get optional parameters
     */
    getOptionalParameters() {
        return this.parameters.filter(param => param.isOptional);
    }
    /**
     * Check if function is async
     */
    async() {
        return this.isAsync || false;
    }
    /**
     * Check if function is a generator
     */
    generator() {
        return this.isGenerator || false;
    }
    /**
     * Check if function is an arrow function
     */
    arrow() {
        return this.isArrow || false;
    }
    /**
     * Check if function has decorators
     */
    hasDecorators() {
        return this.decorators !== undefined && this.decorators.length > 0;
    }
    /**
     * Get function signature as string
     */
    getSignature() {
        const params = this.parameters.map(param => {
            let sig = param.name;
            if (param.type)
                sig += `: ${param.type}`;
            if (param.isOptional)
                sig += '?';
            if (param.defaultValue)
                sig += ` = ${param.defaultValue}`;
            return sig;
        }).join(', ');
        let signature = `${this.name}(${params})`;
        if (this.returnType)
            signature += `: ${this.returnType}`;
        return signature;
    }
    toJSON() {
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
    getSpecificData() {
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
//# sourceMappingURL=FunctionComponent.js.map