/**
 * Relationship implementation for connecting components
 */
import { RelationshipType } from '../entities/index.js';
import { createHash } from 'crypto';
/**
 * Represents a relationship between two components
 */
export class Relationship {
    id;
    type;
    sourceId;
    targetId;
    location;
    metadata;
    constructor(type, sourceId, targetId, location, metadata = {}) {
        this.type = type;
        this.sourceId = sourceId;
        this.targetId = targetId;
        if (location !== undefined)
            this.location = location;
        this.metadata = metadata;
        this.id = this.createId();
    }
    /**
     * Create a unique ID for the relationship
     */
    createId() {
        const hash = createHash('sha256');
        hash.update(`${this.type}:${this.sourceId}:${this.targetId}`);
        if (this.location) {
            hash.update(`:${this.location.startLine}:${this.location.startColumn}`);
        }
        return hash.digest('hex').substring(0, 16);
    }
    /**
     * Create a relationship with automatic ID generation
     */
    static create(type, sourceId, targetId, location, metadata = {}) {
        return new Relationship(type, sourceId, targetId, location, metadata);
    }
    /**
     * Create a typed relationship using RelationshipType enum
     */
    static createTyped(type, sourceId, targetId, location, metadata = {}) {
        return new Relationship(type, sourceId, targetId, location, metadata);
    }
    /**
     * Check if this relationship matches another relationship
     */
    equals(other) {
        return (this.type === other.type &&
            this.sourceId === other.sourceId &&
            this.targetId === other.targetId &&
            this.locationEquals(other.location));
    }
    /**
     * Check if locations are equal
     */
    locationEquals(otherLocation) {
        if (!this.location && !otherLocation)
            return true;
        if (!this.location || !otherLocation)
            return false;
        return (this.location.startLine === otherLocation.startLine &&
            this.location.startColumn === otherLocation.startColumn &&
            this.location.endLine === otherLocation.endLine &&
            this.location.endColumn === otherLocation.endColumn);
    }
    /**
     * Check if this is a reverse relationship of another
     */
    isReverse(other) {
        return (this.sourceId === other.targetId &&
            this.targetId === other.sourceId &&
            this.getOppositeType() === other.type);
    }
    /**
     * Get the opposite relationship type (if applicable)
     */
    getOppositeType() {
        const opposites = {
            [RelationshipType.EXTENDS]: RelationshipType.EXTENDS, // Same type, different direction
            [RelationshipType.IMPLEMENTS]: RelationshipType.IMPLEMENTS,
            [RelationshipType.CALLS]: RelationshipType.CALLS,
            [RelationshipType.REFERENCES]: RelationshipType.REFERENCES,
            [RelationshipType.USES]: RelationshipType.USES,
            [RelationshipType.CONTAINS]: RelationshipType.BELONGS_TO,
            [RelationshipType.BELONGS_TO]: RelationshipType.CONTAINS,
            [RelationshipType.IMPORTS]: RelationshipType.EXPORTS,
            [RelationshipType.EXPORTS]: RelationshipType.IMPORTS
        };
        return opposites[this.type] || null;
    }
    /**
     * Create the reverse relationship
     */
    createReverse() {
        const oppositeType = this.getOppositeType();
        if (!oppositeType)
            return null;
        return new Relationship(oppositeType, this.targetId, this.sourceId, this.location, { ...this.metadata, isReverse: true });
    }
    /**
     * Check if relationship involves a specific component
     */
    involves(componentId) {
        return this.sourceId === componentId || this.targetId === componentId;
    }
    /**
     * Get the other component ID in the relationship
     */
    getOther(componentId) {
        if (this.sourceId === componentId)
            return this.targetId;
        if (this.targetId === componentId)
            return this.sourceId;
        return null;
    }
    /**
     * Check if this is a structural relationship (contains, belongs_to, etc.)
     */
    isStructural() {
        const structuralTypes = [
            RelationshipType.CONTAINS,
            RelationshipType.BELONGS_TO,
            RelationshipType.BELONGS_TO,
            RelationshipType.HAS_METHOD,
            RelationshipType.HAS_PROPERTY,
            RelationshipType.HAS_PARAMETER,
            RelationshipType.IN_NAMESPACE
        ];
        return structuralTypes.includes(this.type);
    }
    /**
     * Check if this is a behavioral relationship (calls, uses, etc.)
     */
    isBehavioral() {
        const behavioralTypes = [
            RelationshipType.CALLS,
            RelationshipType.USES,
            RelationshipType.REFERENCES,
            RelationshipType.CREATES,
            RelationshipType.THROWS,
            RelationshipType.CATCHES,
            RelationshipType.YIELDS_TO,
            RelationshipType.SENDS_TO,
            RelationshipType.DEFERS,
            RelationshipType.DELEGATES_TO
        ];
        return behavioralTypes.includes(this.type);
    }
    /**
     * Check if this is an inheritance relationship
     */
    isInheritance() {
        const inheritanceTypes = [
            RelationshipType.EXTENDS,
            RelationshipType.IMPLEMENTS,
            RelationshipType.INHERITS_MULTIPLE,
            RelationshipType.MIXES_IN,
            RelationshipType.USES_TRAIT,
            RelationshipType.PROTOCOL_CONFORMS,
            RelationshipType.IMPLEMENTS_ABSTRACT
        ];
        return inheritanceTypes.includes(this.type);
    }
    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            sourceId: this.sourceId,
            targetId: this.targetId,
            location: this.location,
            metadata: this.metadata
        };
    }
    /**
     * Create from JSON
     */
    static fromJSON(data) {
        return new Relationship(data.type, data.sourceId, data.targetId, data.location, data.metadata || {});
    }
    /**
     * Clone the relationship
     */
    clone() {
        return new Relationship(this.type, this.sourceId, this.targetId, this.location ? { ...this.location } : undefined, { ...this.metadata });
    }
}
//# sourceMappingURL=Relationship.js.map