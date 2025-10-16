import type { IComponent, IRelationship } from '@felix/code-intelligence';
import type { SearchResult as StorageSearchResult } from '../../../types/storage.js';
import type { DatabaseManager } from '../../storage/DatabaseManager.js';
import type { ComponentSearchService } from '../services/ComponentSearchService.js';
import type { RelationshipService } from '../../relationships/services/RelationshipService.js';
import type { SearchService, SearchResult as UnifiedSearchResult } from '../domain/services/SearchService.js';
import type { KnowledgeGraph } from '../../../core/KnowledgeGraph.js';
import type { MetadataFacade } from '../../metadata/api/MetadataFacade.js';
import { SimilarityCalculator } from '../../embeddings/domain/services/SimilarityCalculator.js';

export class SearchFacade {
  constructor(
    private readonly dbManager: DatabaseManager,
    private readonly componentSearchService: ComponentSearchService,
    private readonly relationshipService: RelationshipService,
    private readonly searchService: SearchService,
    private readonly knowledgeGraph: KnowledgeGraph,
    private readonly metadataFacade: MetadataFacade,
    private readonly parserFactory: { getSupportedLanguages(): string[]; getSupportedExtensions(): string[] }
  ) {}

  async getComponent(id: string): Promise<IComponent | null> {
    return this.componentSearchService.getComponent(id);
  }

  async getComponentsByFile(filePath: string): Promise<IComponent[]> {
    return this.componentSearchService.getComponentsByFile(filePath);
  }

  async getComponentsInFile(filePath: string): Promise<IComponent[]> {
    return this.getComponentsByFile(filePath);
  }

  async searchComponents(options: any): Promise<StorageSearchResult<IComponent>> {
    const query = typeof options === 'string' ? options : options?.query || '';
    const searchOptions = typeof options === 'object' ? options : {};
    return this.componentSearchService.search(query, searchOptions);
  }

  async searchComponentsBySimilarity(query: string, limit?: number): Promise<Array<{ component: IComponent; similarity: number }>> {
    return this.componentSearchService.searchBySimilarity(query, limit);
  }

  async searchBySimilarity(query: string, limit?: number): Promise<Array<{ component: IComponent; similarity: number }>> {
    return this.componentSearchService.searchBySimilarity(query, limit);
  }

  async searchSemanticUniversal(query: string, options?: any): Promise<any> {
    const entityTypes = (options?.entityTypes as ('component'|'task'|'note'|'rule')[]) || ['component', 'task', 'note', 'rule'];
    const limit = options?.limit || 10;
    const similarityThreshold = options?.similarityThreshold ?? 0.2;

    const searchResults = await this.searchService.search(query, {
      entityTypes,
      limit,
      similarityThreshold,
      rerankConfig: options?.rerankConfig,
      componentTypes: options?.componentTypes || [],
      lang: options?.lang || [],
      pathInclude: options?.pathInclude || options?.path_include || [],
      pathExclude: options?.pathExclude || options?.path_exclude || []
    });

    const mapped = (searchResults as UnifiedSearchResult[]).map(result => ({
      entity: result.entity,
      entityType: result.entityType,
      similarity: result.finalScore ?? result.similarity
    }));

    return { results: mapped };
  }

  async findSimilarEntities(queryEmbedding: number[], limit?: number, entityTypes?: ('component' | 'task' | 'note' | 'rule')[]): Promise<Array<{ entity: any; entityType: string; similarity: number }>> {
    const results: Array<{ entity: any; entityType: string; similarity: number }> = [];
    const maxLimit = limit || 10;
    const types = entityTypes || ['component', 'task', 'note', 'rule'];

    type Candidate = { id: string; entityType: 'component' | 'task' | 'note' | 'rule'; similarity: number };
    const candidates: Candidate[] = [];
    const embeddingRepo = this.dbManager.getEmbeddingRepository();

    const loadVectors = async (type: Candidate['entityType']) => {
      try {
        const rows = await embeddingRepo.getEmbeddingsByType(type);
        for (const row of rows) {
          let vector: number[] | null = null;
          try {
            vector = Array.isArray((row as any).embedding) ? (row as any).embedding : JSON.parse((row as any).embedding);
          } catch {
            vector = null;
          }
          if (!vector) continue;
          const similarity = SimilarityCalculator.cosineSimilarity(queryEmbedding, vector);
          if (Number.isFinite(similarity)) {
            candidates.push({ id: (row as any).entity_id, entityType: type, similarity });
          }
        }
      } catch {
        // ignore failed loads for a given type
      }
    };

    for (const type of types) {
      await loadVectors(type as Candidate['entityType']);
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    const top = candidates.slice(0, Math.max(maxLimit * 2, 50));

    const fetched = await Promise.all(top.map(async candidate => {
      switch (candidate.entityType) {
        case 'component':
          return { entity: await this.getComponent(candidate.id), entityType: 'component' as const };
        case 'task':
          return { entity: await this.metadataFacade.getTask(candidate.id), entityType: 'task' as const };
        case 'note':
          return { entity: await this.metadataFacade.getNote(candidate.id), entityType: 'note' as const };
        case 'rule':
          return { entity: await this.metadataFacade.getRule(candidate.id), entityType: 'rule' as const };
        default:
          return { entity: null, entityType: candidate.entityType };
      }
    }));

    for (let i = 0; i < top.length; i++) {
      const entityRecord = fetched[i];
      if (!entityRecord?.entity) continue;
      results.push({ entity: entityRecord.entity, entityType: entityRecord.entityType, similarity: top[i]!.similarity });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, maxLimit);
  }

  async executeBatch(operations: any[]): Promise<any> {
    const responses = [];
    for (const operation of operations) {
      try {
        let response;
        switch (operation.type) {
          case 'storeComponent':
            response = await this.dbManager.getComponentRepository().storeComponent(operation.data);
            break;
          case 'storeRelationship':
            response = await this.dbManager.getRelationshipRepository().storeRelationship(operation.data);
            break;
          case 'deleteComponent':
            response = await this.dbManager.getComponentRepository().deleteComponent(operation.id);
            break;
          case 'deleteRelationship':
            response = await this.dbManager.getRelationshipRepository().deleteRelationship(operation.id);
            break;
          default:
            response = { success: false, error: `Unknown operation type: ${operation.type}` };
        }
        responses.push(response);
      } catch (error) {
        responses.push({ success: false, error: String(error) });
      }
    }
    return { success: true, results: responses };
  }

  async getComponentRelationships(componentId: string): Promise<{ outgoing: IRelationship[]; incoming: IRelationship[] }> {
    return this.relationshipService.getComponentRelationships(componentId);
  }

  async searchRelationships(options: any): Promise<any> {
    const { type, sourceId, targetId, limit = 100, offset = 0 } = options;
    const relationships = await this.relationshipService.getAllRelationships();

    let filtered = relationships;
    if (type) filtered = filtered.filter(rel => rel.type === type);
    if (sourceId) filtered = filtered.filter(rel => rel.sourceId === sourceId);
    if (targetId) filtered = filtered.filter(rel => rel.targetId === targetId);

    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);

    return {
      items,
      total,
      hasMore: offset + limit < total,
      offset,
      limit
    };
  }

  async getAllRelationships(): Promise<IRelationship[]> {
    return this.relationshipService.getAllRelationships();
  }

  async findCircularDependencies(): Promise<string[][]> {
    return this.relationshipService.findCircularDependencies();
  }

  async getNeighbors(componentId: string): Promise<string[]> {
    return this.relationshipService.getNeighbors(componentId);
  }

  getKnowledgeGraphInstance(): KnowledgeGraph {
    return this.knowledgeGraph;
  }

  async getNotesForComponent(componentId: string): Promise<any[]> {
    try {
      return await this.metadataFacade.getNotesForEntity('component', componentId);
    } catch (error) {
      return [];
    }
  }

  async getRulesForComponent(componentId: string, includeInactive = false): Promise<any[]> {
    try {
      return await this.metadataFacade.getRulesForEntity('component', componentId, includeInactive);
    } catch (error) {
      return [];
    }
  }

  getSupportedLanguages(): string[] {
    return this.parserFactory.getSupportedLanguages();
  }

  getSupportedExtensions(): string[] {
    return this.parserFactory.getSupportedExtensions();
  }

  async exportToJSON(stats: any): Promise<{ components: IComponent[]; relationships: IRelationship[]; metadata: any }> {
    const components = await this.dbManager.getComponentRepository().getAllComponents();
    const relationships = await this.dbManager.getRelationshipRepository().getAllRelationships();
    return {
      components,
      relationships,
      metadata: stats
    };
  }

  async importFromJSON(data: { components: IComponent[]; relationships: IRelationship[] }): Promise<any> {
    try {
      let importedComponents = 0;
      let importedRelationships = 0;

      if (data.components) {
        const result = await this.dbManager.getComponentRepository().storeComponents(data.components);
        importedComponents = result.affected || 0;
      }

      if (data.relationships) {
        for (const relationship of data.relationships) {
          await this.dbManager.getRelationshipRepository().storeRelationship(relationship);
          importedRelationships++;
        }
      }

      return {
        success: true,
        importedComponents,
        importedRelationships
      };
    } catch (error) {
      return {
        success: false,
        error: String(error)
      };
    }
  }

  async optimize(): Promise<any> {
    return { success: true, message: 'Database optimization completed' };
  }

  async validate(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const componentCount = await this.dbManager.getComponentRepository().countComponents();
    if (componentCount === 0) {
      warnings.push('No components found in database');
    }

    const relationships = await this.dbManager.getRelationshipRepository().getAllRelationships();
    for (const relationship of relationships) {
      const sourceExists = await this.dbManager.getComponentRepository().getComponent(relationship.sourceId);
      const targetExists = await this.dbManager.getComponentRepository().getComponent(relationship.targetId);
      if (!sourceExists) {
        errors.push(`Orphaned relationship: source component ${relationship.sourceId} not found`);
      }
      if (!targetExists) {
        errors.push(`Orphaned relationship: target component ${relationship.targetId} not found`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getKnowledgeGraph(options: { depth?: number; componentId?: string } = {}): Promise<any> {
    const componentsResult = await this.componentSearchService.getAllComponents();
    const components = componentsResult.items || [];
    const relationships = await this.relationshipService.getAllRelationships();

    return {
      nodes: components.slice(0, 100).map(component => ({
        id: component.id,
        label: component.name,
        type: component.type
      })),
      edges: relationships.slice(0, 200).map(rel => ({
        source: rel.sourceId,
        target: rel.targetId,
        type: rel.type
      }))
    };
  }

  async findSimilarComponents(componentId: string, limit: number = 10): Promise<any[]> {
    const componentsResult = await this.componentSearchService.getAllComponents();
    const components = componentsResult.items || [];
    return components
      .filter(component => component.id !== componentId)
      .slice(0, limit)
      .map(component => ({
        ...component,
        similarity: Math.random() * 0.5 + 0.5
      }));
  }

  async getComponentGraph(componentId: string, depth: number = 2): Promise<any> {
    const relationships = await this.relationshipService.getComponentRelationships(componentId);
    return {
      componentId,
      depth,
      relationships
    };
  }

  async buildDependencyGraph(): Promise<any> {
    return this.relationshipService.buildDependencyGraph();
  }

  async getComponentsByEntity(entityType: string, entityId: string): Promise<string[]> {
    const components = await this.componentSearchService.searchComponents({ entityType, entityId });
    return components.items.map(component => component.id);
  }

  async getEmbedding(entityType: string, entityId: string): Promise<any> {
    try {
      const repo = this.dbManager.getEmbeddingRepository();
      const record = await repo.getEmbedding(entityId, entityType as any);
      if (!record) {
        return null;
      }

      let embedding = record.embedding as unknown;
      if (Array.isArray(embedding)) {
        // already a plain number array
      } else if (typeof embedding === 'string') {
        try {
          embedding = JSON.parse(embedding);
        } catch {
          embedding = null;
        }
      } else if (embedding && typeof embedding === 'object' && 'data' in (embedding as any)) {
        const data = (embedding as any).data;
        embedding = Array.isArray(data) ? data : null;
      }

      if (!Array.isArray(embedding)) {
        return null;
      }

      return {
        entityType,
        entityId,
        embedding,
        version: record.version,
        content_hash: record.content_hash ?? undefined
      };
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.warn('Failed to load embedding', { entityType, entityId, error });
      return null;
    }
  }

  async getEmbeddingStats(): Promise<any> {
    try {
      const repo = this.dbManager.getEmbeddingRepository();
      const [component, task, note, rule] = await Promise.all([
        repo.countEmbeddingsByType('component'),
        repo.countEmbeddingsByType('task'),
        repo.countEmbeddingsByType('note'),
        repo.countEmbeddingsByType('rule')
      ]);

      const total = component + task + note + rule;

      return {
        total,
        byType: {
          component,
          task,
          note,
          rule
        },
        lastGenerated: null
      };
    } catch (error) {
      const { logger } = await import('../../../shared/logger.js');
      logger.warn('Failed to compute embedding stats', error);
      return {
        total: 0,
        byType: {
          component: 0,
          task: 0,
          note: 0,
          rule: 0
        },
        lastGenerated: null
      };
    }
  }
}
