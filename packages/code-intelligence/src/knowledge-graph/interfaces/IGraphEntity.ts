/**
 * Base interface for any entity that can be stored in the knowledge graph
 */
export interface IGraphEntity {
  id: string;
  type: string;
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Base interface for relationships between entities
 */
export interface IGraphRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  metadata?: Record<string, any>;
}