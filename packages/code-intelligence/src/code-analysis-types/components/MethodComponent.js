/**
 * Method component implementation
 */
import { ComponentType } from '../entities/index.js';
import { BaseComponent } from './BaseComponent.js';
/**
 * Represents a method in the codebase
 */
export class MethodComponent extends BaseComponent {
    type = ComponentType.METHOD;
    parameters;
    returnType;
    isAsync;
    isGenerator;
    isStatic;
    isAbstract;
    isFinal;
    isConstructor;
    accessModifier;
    decorators;
    documentation;
    constructor(id, name, language, filePath, location, options = {}, metadata = {}) {
        super(id, name, ComponentType.METHOD, language, filePath, location, metadata);
        this.parameters = options.parameters || [];
        if (options.returnType !== undefined)
            this.returnType = options.returnType;
        if (options.isAsync !== undefined)
            this.isAsync = options.isAsync;
        if (options.isGenerator !== undefined)
            this.isGenerator = options.isGenerator;
        if (options.isStatic !== undefined)
            this.isStatic = options.isStatic;
        if (options.isAbstract !== undefined)
            this.isAbstract = options.isAbstract;
        if (options.isFinal !== undefined)
            this.isFinal = options.isFinal;
        if (options.isConstructor !== undefined)
            this.isConstructor = options.isConstructor;
        this.accessModifier = options.accessModifier || 'public';
        if (options.decorators !== undefined)
            this.decorators = options.decorators;
        if (options.documentation !== undefined)
            this.documentation = options.documentation;
    }
    /**
     * Create a MethodComponent with automatic ID generation
     */
    static create(name, language, filePath, location, options = {}, metadata = {}) {
        const id = `method_${name}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
        return new MethodComponent(id, name, language, filePath, location, options, metadata);
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
     * Check if method has a specific parameter
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
     * Check if method is async
     */
    async() {
        return this.isAsync || false;
    }
    /**
     * Check if method is a generator
     */
    generator() {
        return this.isGenerator || false;
    }
    /**
     * Check if method is static
     */
    static() {
        return this.isStatic || false;
    }
    /**
     * Check if method is abstract
     */
    abstract() {
        return this.isAbstract || false;
    }
    /**
     * Check if method is final
     */
    final() {
        return this.isFinal || false;
    }
    /**
     * Check if method is a constructor
     */
    constructor_method() {
        return this.isConstructor || false;
    }
    /**
     * Check if method has decorators
     */
    hasDecorators() {
        return this.decorators !== undefined && this.decorators.length > 0;
    }
    /**
     * Get method signature as string
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
            isStatic: this.isStatic,
            isAbstract: this.isAbstract,
            isFinal: this.isFinal,
            isConstructor: this.isConstructor,
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
            isStatic: this.isStatic,
            isAbstract: this.isAbstract,
            isFinal: this.isFinal,
            isConstructor: this.isConstructor,
            accessModifier: this.accessModifier,
            decorators: this.decorators,
            documentation: this.documentation
        };
    }
}
//# sourceMappingURL=MethodComponent.js.map