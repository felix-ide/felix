import { KnowledgeGraph } from '../../../core/KnowledgeGraph.js';
import { ComponentSearchService } from '../../search/services/ComponentSearchService.js';
import { DocumentationResolverService } from '../services/DocumentationResolverService.js';
import { FileIndexingService } from '../services/FileIndexingService.js';
import { IndexingService } from '../services/IndexingService.js';
import { MetadataFacade } from '../../metadata/api/MetadataFacade.js';
import { NoteManagementService } from '../../metadata/services/NoteManagementService.js';
import { RelationshipService } from '../../relationships/services/RelationshipService.js';
import { RuleManagementService } from '../../metadata/services/RuleManagementService.js';
import { SearchFacade } from '../../search/api/SearchFacade.js';
import { TaskManagementService } from '../../metadata/services/TaskManagementService.js';
import { SearchService, type EntityGetters, type SearchStorage } from '../../search/domain/services/SearchService.js';
import { RerankingService } from '../../embeddings/domain/services/RerankingService.js';
import { CodeIndexerEnvironment } from './options.js';

export interface CodeIndexerDependencies extends CodeIndexerEnvironment {
  knowledgeGraph: KnowledgeGraph;
  fileIndexingService: FileIndexingService;
  componentSearchService: ComponentSearchService;
  relationshipService: RelationshipService;
  taskManagementService: TaskManagementService;
  noteManagementService: NoteManagementService;
  ruleManagementService: RuleManagementService;
  documentationResolver: DocumentationResolverService;
  metadataFacade: MetadataFacade;
  indexingService: IndexingService;
  searchService: SearchService;
  searchFacade: SearchFacade;
}

export function buildCodeIndexerDependencies(env: CodeIndexerEnvironment): CodeIndexerDependencies {
  const knowledgeGraph = new KnowledgeGraph(env.dbManager);

  const fileIndexingService = new FileIndexingService(
    env.dbManager,
    env.parserFactory,
    env.embeddingService,
    env.serviceOptions,
    env.ignoreConfig
  );

  const componentSearchService = new ComponentSearchService(env.dbManager, env.embeddingService);
  const relationshipService = new RelationshipService(env.dbManager);
  const taskManagementService = new TaskManagementService(env.dbManager, env.embeddingService);
  const noteManagementService = new NoteManagementService(env.dbManager, env.embeddingService);
  const ruleManagementService = new RuleManagementService(env.dbManager, env.embeddingService);
  const documentationResolver = new DocumentationResolverService(env.dbManager);

 const metadataFacade = new MetadataFacade(
    env.dbManager,
    taskManagementService,
    noteManagementService,
    ruleManagementService,
    documentationResolver,
    componentSearchService,
    relationshipService
  );

  const indexingService = new IndexingService(
    env.dbManager,
    fileIndexingService,
    componentSearchService,
    relationshipService,
    taskManagementService,
    noteManagementService,
    ruleManagementService,
    documentationResolver
  );

  let searchFacadeRef: SearchFacade | null = null;
  const storageAdapter: SearchStorage = {
    findSimilarEntities: async (embedding, limit, types) => {
      if (!searchFacadeRef) {
        throw new Error('SearchFacade not initialized');
      }
      const results = await searchFacadeRef.findSimilarEntities(embedding, limit, types);
      return results as Awaited<ReturnType<SearchStorage['findSimilarEntities']>>;
    }
  };

  const entityGetters: EntityGetters = {
    getComponent: (id: string) => componentSearchService.getComponent(id),
    getTask: (id: string) => metadataFacade.getTask(id),
    getNote: (id: string) => metadataFacade.getNote(id),
    getRule: (id: string) => metadataFacade.getRule(id)
  };

  const searchService = SearchService.withCustomReranking(
    env.embeddingService,
    storageAdapter,
    entityGetters,
    RerankingService.forUniversalSearch()
  );

  const searchFacade = new SearchFacade(
    env.dbManager,
    componentSearchService,
    relationshipService,
    searchService,
    knowledgeGraph,
    metadataFacade,
    env.parserFactory
  );

  searchFacadeRef = searchFacade;

  return {
    ...env,
    knowledgeGraph,
    fileIndexingService,
    componentSearchService,
    relationshipService,
    taskManagementService,
    noteManagementService,
    ruleManagementService,
    documentationResolver,
    metadataFacade,
    indexingService,
    searchService,
    searchFacade
  };
}
