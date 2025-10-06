/**
 * Base entity class providing common functionality for all code analysis entities
 */
import { v4 as uuidv4 } from 'uuid';
/**
 * Abstract base entity class with common functionality
 */
export class BaseEntity {
    id;
    metadata;
    constructor(id, metadata = {}) {
        this.id = id || this.generateId();
        this.metadata = {
            createdAt: new Date().toISOString(),
            version: '1.0.0',
            ...metadata,
        };
    }
    /**
     * Generate a unique ID for the entity
     */
    generateId() {
        return uuidv4();
    }
    /**
     * Update the entity's metadata
     */
    updateMetadata(updates) {
        this.metadata = {
            ...this.metadata,
            ...updates,
            updatedAt: new Date().toISOString(),
        };
    }
    /**
     * Get a metadata value by key
     */
    getMetadata(key) {
        return this.metadata[key];
    }
    /**
     * Set a metadata value by key
     */
    setMetadata(key, value) {
        this.metadata[key] = value;
        this.metadata.updatedAt = new Date().toISOString();
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            id: this.id,
            metadata: this.metadata,
            ...this.getSerializableFields(),
        };
    }
    /**
     * Create from JSON (static factory method - override in subclasses)
     */
    static fromJSON(data) {
        throw new Error('fromJSON must be implemented in subclasses');
    }
    /**
     * Clone the entity with a new ID
     */
    clone() {
        const cloned = Object.create(Object.getPrototypeOf(this));
        Object.assign(cloned, this);
        cloned.id = this.generateId();
        cloned.metadata = {
            ...this.metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        return cloned;
    }
    /**
     * Check if this entity equals another entity
     */
    equals(other) {
        return this.id === other.id && this.getType() === other.getType();
    }
    /**
     * Get a hash code for the entity
     */
    hashCode() {
        return `${this.getType()}:${this.id}`;
    }
}
//# sourceMappingURL=base-entity.js.map