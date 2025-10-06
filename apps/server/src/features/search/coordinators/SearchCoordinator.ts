import type { IComponent, IRelationship } from '@felix/code-intelligence';
import type { SearchResult } from '../../../types/storage.js';
import { SearchFacade } from '../api/SearchFacade.js';
import { ComponentSearchService } from '../services/ComponentSearchService.js';
import type { KnowledgeGraph } from '../../../core/KnowledgeGraph.js';

export class SearchCoordinator {
  constructor(
    private readonly searchFacade: SearchFacade,
    private readonly componentSearchService: ComponentSearchService,
    private readonly statsProvider: () => Promise<any>
  ) {}

  async searchComponents(options: any): Promise<SearchResult<IComponent>> {
    return this.searchFacade.searchComponents(options);
  }

  async getAllComponents(limit?: number, offset?: number): Promise<SearchResult<IComponent>> {
    return this.componentSearchService.getAllComponents(limit, offset);
  }

  async searchComponentsBySimilarity(query: string, limit?: number): Promise<Array<{ component: IComponent; similarity: number }>> {
    return this.searchFacade.searchComponentsBySimilarity(query, limit);
  }

  async searchBySimilarity(query: string, limit?: number): Promise<Array<{ component: IComponent; similarity: number }>> {
    return this.searchFacade.searchBySimilarity(query, limit);
  }

  async searchSemanticUniversal(query: string, options?: any): Promise<any> {
    return this.searchFacade.searchSemanticUniversal(query, options);
  }

  async searchDiscover(options: any): Promise<any> {
    return this.searchFacade.searchDiscover(options);
  }

  async findSimilarEntities(queryEmbedding: number[], limit?: number, entityTypes?: ('component' | 'task' | 'note' | 'rule')[]): Promise<Array<{ entity: any; entityType: string; similarity: number }>> {
    return this.searchFacade.findSimilarEntities(queryEmbedding, limit, entityTypes);
  }

  async executeBatch(operations: any[]): Promise<any> {
    return this.searchFacade.executeBatch(operations);
  }

  async exportToJSON(): Promise<{ components: IComponent[]; relationships: IRelationship[]; metadata: any }> {
    const stats = await this.statsProvider();
    return this.searchFacade.exportToJSON(stats);
  }

  async importFromJSON(data: { components: IComponent[]; relationships: IRelationship[] }): Promise<any> {
    return this.searchFacade.importFromJSON(data);
  }

  async optimize(): Promise<any> {
    return this.searchFacade.optimize();
  }

  async validate(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    return this.searchFacade.validate();
  }

  async getComponent(id: string): Promise<IComponent | null> {
    return this.searchFacade.getComponent(id);
  }

  async getComponentsByFile(filePath: string): Promise<IComponent[]> {
    return this.searchFacade.getComponentsByFile(filePath);
  }

  async getComponentsInFile(filePath: string): Promise<IComponent[]> {
    return this.searchFacade.getComponentsInFile(filePath);
  }

  async getComponentRelationships(componentId: string): Promise<{ outgoing: IRelationship[]; incoming: IRelationship[] }> {
    return this.searchFacade.getComponentRelationships(componentId);
  }

  async searchRelationships(options: any): Promise<any> {
    return this.searchFacade.searchRelationships(options);
  }

  async getAllRelationships(): Promise<IRelationship[]> {
    return this.searchFacade.getAllRelationships();
  }

  async findCircularDependencies(): Promise<string[][]> {
    return this.searchFacade.findCircularDependencies();
  }

  async getNeighbors(componentId: string): Promise<string[]> {
    return this.searchFacade.getNeighbors(componentId);
  }

  async getNotesForComponent(componentId: string): Promise<any[]> {
    return this.searchFacade.getNotesForComponent(componentId);
  }

  async getRulesForComponent(componentId: string, includeInactive = false): Promise<any[]> {
    return this.searchFacade.getRulesForComponent(componentId, includeInactive);
  }

  getKnowledgeGraphInstance(): KnowledgeGraph {
    return this.searchFacade.getKnowledgeGraphInstance();
  }

  async getKnowledgeGraph(options: { depth?: number; componentId?: string } = {}): Promise<any> {
    return this.searchFacade.getKnowledgeGraph(options);
  }

  async findSimilarComponents(componentId: string, limit: number = 10): Promise<any[]> {
    return this.searchFacade.findSimilarComponents(componentId, limit);
  }

  async getComponentGraph(componentId: string, depth: number = 2): Promise<any> {
    return this.searchFacade.getComponentGraph(componentId, depth);
  }

  async buildDependencyGraph(): Promise<any> {
    return this.searchFacade.buildDependencyGraph();
  }

  async getComponentsByEntity(entityType: string, entityId: string): Promise<string[]> {
    return this.searchFacade.getComponentsByEntity(entityType, entityId);
  }

  getSupportedLanguages(): string[] {
    return this.searchFacade.getSupportedLanguages();
  }

  getSupportedExtensions(): string[] {
    return this.searchFacade.getSupportedExtensions();
  }

  async getEmbedding(entityType: string, entityId: string): Promise<any> {
    return this.searchFacade.getEmbedding(entityType, entityId);
  }

  async getEmbeddingStats(): Promise<any> {
    return this.searchFacade.getEmbeddingStats();
  }
}
