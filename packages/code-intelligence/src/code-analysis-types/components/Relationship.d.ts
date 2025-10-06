/**
 * Relationship implementation for connecting components
 */
import { IRelationship, Location, RelationshipType } from '../entities/index.js';
/**
 * Represents a relationship between two components
 */
export declare class Relationship implements IRelationship {
    readonly id: string;
    readonly type: RelationshipType;
    readonly sourceId: string;
    readonly targetId: string;
    readonly location?: Location;
    readonly metadata: Record<string, any>;
    constructor(type: RelationshipType, sourceId: string, targetId: string, location?: Location, metadata?: Record<string, any>);
    /**
     * Create a unique ID for the relationship
     */
    private createId;
    /**
     * Create a relationship with automatic ID generation
     */
    static create(type: string | RelationshipType, sourceId: string, targetId: string, location?: Location, metadata?: Record<string, any>): Relationship;
    /**
     * Create a typed relationship using RelationshipType enum
     */
    static createTyped(type: RelationshipType, sourceId: string, targetId: string, location?: Location, metadata?: Record<string, any>): Relationship;
    /**
     * Check if this relationship matches another relationship
     */
    equals(other: Relationship): boolean;
    /**
     * Check if locations are equal
     */
    private locationEquals;
    /**
     * Check if this is a reverse relationship of another
     */
    isReverse(other: Relationship): boolean;
    /**
     * Get the opposite relationship type (if applicable)
     */
    private getOppositeType;
    /**
     * Create the reverse relationship
     */
    createReverse(): Relationship | null;
    /**
     * Check if relationship involves a specific component
     */
    involves(componentId: string): boolean;
    /**
     * Get the other component ID in the relationship
     */
    getOther(componentId: string): string | null;
    /**
     * Check if this is a structural relationship (contains, belongs_to, etc.)
     */
    isStructural(): boolean;
    /**
     * Check if this is a behavioral relationship (calls, uses, etc.)
     */
    isBehavioral(): boolean;
    /**
     * Check if this is an inheritance relationship
     */
    isInheritance(): boolean;
    /**
     * Serialize to JSON
     */
    toJSON(): Record<string, any>;
    /**
     * Create from JSON
     */
    static fromJSON(data: Record<string, any>): Relationship;
    /**
     * Clone the relationship
     */
    clone(): Relationship;
}
//# sourceMappingURL=Relationship.d.ts.map