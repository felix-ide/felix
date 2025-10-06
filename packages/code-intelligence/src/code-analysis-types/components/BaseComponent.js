/**
 * Base class for all component types
 */
export class BaseComponent {
    id;
    name;
    type;
    language;
    filePath;
    location;
    metadata;
    constructor(id, name, type, language, filePath, location, metadata = {}) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.language = language;
        this.filePath = filePath;
        this.location = location;
        this.metadata = metadata;
    }
    /**
     * Clone the component with optional overrides
     */
    clone(overrides) {
        const ComponentConstructor = this.constructor;
        return new ComponentConstructor(overrides?.id || this.id, overrides?.name || this.name, overrides?.filePath || this.filePath, overrides?.location || this.location, overrides?.language || this.language, overrides?.metadata || this.metadata);
    }
    /**
     * Convert to plain object
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            language: this.language,
            filePath: this.filePath,
            location: this.location,
            metadata: this.metadata,
            ...this.getSpecificData()
        };
    }
    /**
     * Convert to string representation
     */
    toString() {
        return `${this.type}:${this.name} (${this.filePath}:${this.location.startLine})`;
    }
}
//# sourceMappingURL=BaseComponent.js.map