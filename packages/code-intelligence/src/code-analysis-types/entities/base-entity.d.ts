/**
 * Base entity class providing common functionality for all code analysis entities
 */
/**
 * Base metadata interface that all entities can extend
 */
export interface BaseMetadata {
    createdAt?: string;
    updatedAt?: string;
    version?: string;
    [key: string]: any;
}
/**
 * Abstract base entity class with common functionality
 */
export declare abstract class BaseEntity {
    readonly id: string;
    metadata: BaseMetadata;
    constructor(id?: string, metadata?: BaseMetadata);
    /**
     * Generate a unique ID for the entity
     */
    protected generateId(): string;
    /**
     * Update the entity's metadata
     */
    updateMetadata(updates: Partial<BaseMetadata>): void;
    /**
     * Get a metadata value by key
     */
    getMetadata<T = any>(key: string): T | undefined;
    /**
     * Set a metadata value by key
     */
    setMetadata(key: string, value: any): void;
    /**
     * Validate the entity (override in subclasses)
     */
    abstract validate(): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Serialize to JSON
     */
    toJSON(): Record<string, any>;
    /**
     * Get fields to include in serialization (override in subclasses)
     */
    protected abstract getSerializableFields(): Record<string, any>;
    /**
     * Create from JSON (static factory method - override in subclasses)
     */
    static fromJSON(data: Record<string, any>): BaseEntity;
    /**
     * Get the entity type (override in subclasses)
     */
    abstract getType(): string;
    /**
     * Get a human-readable name for the entity (override in subclasses)
     */
    abstract getName(): string;
    /**
     * Clone the entity with a new ID
     */
    clone(): BaseEntity;
    /**
     * Check if this entity equals another entity
     */
    equals(other: BaseEntity): boolean;
    /**
     * Get a hash code for the entity
     */
    hashCode(): string;
}
//# sourceMappingURL=base-entity.d.ts.map