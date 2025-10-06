import { describe, it, expect, beforeEach } from '@jest/globals';
import { KnowledgeGraph } from '../core/KnowledgeGraph.js';
import { IGraphEntity, IGraphRelationship } from '../interfaces/IGraphEntity.js';
import { IGraphStorageAdapter, SearchResult, OperationResult } from '../interfaces/IGraphStorageAdapter.js';

// Mock storage adapter
class MockStorageAdapter implements IGraphStorageAdapter {
  private entities = new Map<string, IGraphEntity>();
  private relationships = new Map<string, IGraphRelationship>();

  async storeEntity(entity: IGraphEntity): Promise<OperationResult> {
    this.entities.set(entity.id, entity);
    return { success: true, affected: 1 };
  }

  async getEntity(id: string): Promise<IGraphEntity | null> {
    return this.entities.get(id) || null;
  }

  async updateEntity(entity: IGraphEntity): Promise<OperationResult> {
    if (!this.entities.has(entity.id)) {
      return { success: false, error: 'Entity not found' };
    }
    this.entities.set(entity.id, entity);
    return { success: true, affected: 1 };
  }

  async deleteEntity(id: string): Promise<OperationResult> {
    const deleted = this.entities.delete(id);
    return { success: deleted, affected: deleted ? 1 : 0 };
  }

  async searchEntities(): Promise<SearchResult<IGraphEntity>> {
    const items = Array.from(this.entities.values());
    return { items, total: items.length, offset: 0, limit: items.length };
  }

  async storeRelationship(relationship: IGraphRelationship): Promise<OperationResult> {
    this.relationships.set(relationship.id, relationship);
    return { success: true, affected: 1 };
  }

  async getRelationship(id: string): Promise<IGraphRelationship | null> {
    return this.relationships.get(id) || null;
  }

  async deleteRelationship(id: string): Promise<OperationResult> {
    const deleted = this.relationships.delete(id);
    return { success: deleted, affected: deleted ? 1 : 0 };
  }

  async searchRelationships(criteria: any): Promise<SearchResult<IGraphRelationship>> {
    let items = Array.from(this.relationships.values());
    
    if (criteria.sourceId) {
      items = items.filter(r => r.sourceId === criteria.sourceId);
    }
    if (criteria.targetId) {
      items = items.filter(r => r.targetId === criteria.targetId);
    }
    
    return { items, total: items.length, offset: 0, limit: items.length };
  }

  async getStats() {
    return { 
      entityCount: this.entities.size, 
      relationshipCount: this.relationships.size 
    };
  }
}

describe('KnowledgeGraph', () => {
  let storage: MockStorageAdapter;
  let graph: KnowledgeGraph;

  beforeEach(() => {
    storage = new MockStorageAdapter();
    graph = new KnowledgeGraph(storage);
  });

  describe('Entity operations', () => {
    it('should add an entity', async () => {
      const entity: IGraphEntity = {
        id: 'entity1',
        type: 'person',
        name: 'John Doe'
      };

      await graph.addEntity(entity);
      const retrieved = await graph.getEntity('entity1');
      
      expect(retrieved).toEqual(entity);
    });

    it('should update an entity', async () => {
      const entity: IGraphEntity = {
        id: 'entity1',
        type: 'person',
        name: 'John Doe'
      };

      await graph.addEntity(entity);
      await graph.updateEntity('entity1', { name: 'Jane Doe' });
      
      const updated = await graph.getEntity('entity1');
      expect(updated?.name).toBe('Jane Doe');
    });

    it('should delete an entity and its relationships', async () => {
      const entity1: IGraphEntity = { id: 'e1', type: 'person' };
      const entity2: IGraphEntity = { id: 'e2', type: 'person' };
      const relationship: IGraphRelationship = {
        id: 'r1',
        type: 'knows',
        sourceId: 'e1',
        targetId: 'e2'
      };

      await graph.addEntity(entity1);
      await graph.addEntity(entity2);
      await graph.addRelationship(relationship);

      await graph.deleteEntity('e1');

      expect(await graph.getEntity('e1')).toBeNull();
      expect(await graph.getRelationship('r1')).toBeNull();
    });
  });

  describe('Relationship operations', () => {
    it('should add a relationship', async () => {
      const entity1: IGraphEntity = { id: 'e1', type: 'person' };
      const entity2: IGraphEntity = { id: 'e2', type: 'person' };
      const relationship: IGraphRelationship = {
        id: 'r1',
        type: 'knows',
        sourceId: 'e1',
        targetId: 'e2'
      };

      await graph.addEntity(entity1);
      await graph.addEntity(entity2);
      await graph.addRelationship(relationship);

      const retrieved = await graph.getRelationship('r1');
      expect(retrieved).toEqual(relationship);
    });

    it('should find relationships for an entity', async () => {
      const entity1: IGraphEntity = { id: 'e1', type: 'person' };
      const entity2: IGraphEntity = { id: 'e2', type: 'person' };
      const entity3: IGraphEntity = { id: 'e3', type: 'person' };
      
      await graph.addEntity(entity1);
      await graph.addEntity(entity2);
      await graph.addEntity(entity3);

      await graph.addRelationship({
        id: 'r1',
        type: 'knows',
        sourceId: 'e1',
        targetId: 'e2'
      });

      await graph.addRelationship({
        id: 'r2',
        type: 'knows',
        sourceId: 'e1',
        targetId: 'e3'
      });

      const outgoing = await graph.getRelationshipsForEntity('e1', { direction: 'out' });
      expect(outgoing).toHaveLength(2);

      const incoming = await graph.getRelationshipsForEntity('e2', { direction: 'in' });
      expect(incoming).toHaveLength(1);
    });
  });

  describe('Graph traversal', () => {
    it('should find path between entities', async () => {
      // Create a simple graph: e1 -> e2 -> e3
      await graph.addEntity({ id: 'e1', type: 'node' });
      await graph.addEntity({ id: 'e2', type: 'node' });
      await graph.addEntity({ id: 'e3', type: 'node' });

      await graph.addRelationship({
        id: 'r1',
        type: 'connects',
        sourceId: 'e1',
        targetId: 'e2'
      });

      await graph.addRelationship({
        id: 'r2',
        type: 'connects',
        sourceId: 'e2',
        targetId: 'e3'
      });

      const path = await graph.findPath('e1', 'e3');
      
      expect(path).not.toBeNull();
      expect(path?.path).toEqual(['e1', 'e2', 'e3']);
      expect(path?.distance).toBe(2);
      expect(path?.relationships).toHaveLength(2);
    });

    it('should find neighbors', async () => {
      // Create a star graph: e1 connected to e2, e3, e4
      await graph.addEntity({ id: 'e1', type: 'center' });
      await graph.addEntity({ id: 'e2', type: 'node' });
      await graph.addEntity({ id: 'e3', type: 'node' });
      await graph.addEntity({ id: 'e4', type: 'node' });

      await graph.addRelationship({ id: 'r1', type: 'connects', sourceId: 'e1', targetId: 'e2' });
      await graph.addRelationship({ id: 'r2', type: 'connects', sourceId: 'e1', targetId: 'e3' });
      await graph.addRelationship({ id: 'r3', type: 'connects', sourceId: 'e1', targetId: 'e4' });

      const neighbors = await graph.getNeighbors('e1');
      
      expect(neighbors).toHaveLength(3);
      expect(neighbors.map(n => n.id).sort()).toEqual(['e2', 'e3', 'e4']);
    });
  });

  describe('Statistics', () => {
    it('should calculate graph statistics', async () => {
      await graph.addEntity({ id: 'e1', type: 'node' });
      await graph.addEntity({ id: 'e2', type: 'node' });
      await graph.addRelationship({
        id: 'r1',
        type: 'connects',
        sourceId: 'e1',
        targetId: 'e2'
      });

      const stats = await graph.getStats();
      
      expect(stats.entityCount).toBe(2);
      expect(stats.relationshipCount).toBe(1);
      expect(stats.avgDegree).toBeGreaterThan(0);
    });
  });
});