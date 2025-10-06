/**
 * CodeIndexer - facade orchestrating Felix server subsystems.
 * Delegates responsibilities to domain coordinators so the public API stays thin.
 */

import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { EmbeddingService } from '../../../nlp/EmbeddingServiceAdapter.js';
import { ParserFactory } from '@felix/code-intelligence';
import { FileIndexingService } from '../services/FileIndexingService.js';
import { ComponentSearchService } from '../../search/services/ComponentSearchService.js';
import { RelationshipService } from '../../relationships/services/RelationshipService.js';
import { TaskManagementService } from '../../metadata/services/TaskManagementService.js';
import { NoteManagementService } from '../../metadata/services/NoteManagementService.js';
import { RuleManagementService } from '../../metadata/services/RuleManagementService.js';
import { KnowledgeGraph } from '../../../core/KnowledgeGraph.js';
import { DocumentationResolverService } from '../services/DocumentationResolverService.js';
import { SearchService } from '../../search/domain/services/SearchService.js';
import { IndexingService, type IndexingOptions } from '../services/IndexingService.js';
import { MetadataFacade } from '../../metadata/api/MetadataFacade.js';
import { SearchFacade } from '../../search/api/SearchFacade.js';

import { IndexingCoordinator } from '../coordinators/IndexingCoordinator.js';
import { SearchCoordinator } from '../../search/coordinators/SearchCoordinator.js';
import { MetadataCoordinator } from '../../metadata/coordinators/MetadataCoordinator.js';
import { WorkflowCoordinator } from '../../workflows/coordinators/WorkflowCoordinator.js';
import { createCodeIndexerEnvironment, type CodeIndexerLegacyOptions } from './options.js';
import { buildCodeIndexerDependencies } from './dependencies.js';
import { createCoordinators } from './coordinators.js';
import { attachIndexingApi, type IndexingApi } from './api/indexing.js';
import { attachSearchApi, type SearchApi } from './api/search.js';
import { attachMetadataApi, type MetadataApi } from './api/metadata.js';
import { attachWorkflowApi, type WorkflowApi } from './api/workflow.js';

export type { IndexingResult } from '../services/FileIndexingService.js';
export type { IndexingOptions } from '../services/IndexingService.js';
export type { CodeIndexerLegacyOptions } from './options.js';

export class CodeIndexer {
  private dbManager: DatabaseManager;
  private embeddingService: EmbeddingService;
  private parserFactory: ParserFactory;
  private knowledgeGraph: KnowledgeGraph;
  private searchService: SearchService;

  private fileIndexingService: FileIndexingService;
  private componentSearchService: ComponentSearchService;
  private relationshipService: RelationshipService;
  private taskManagementService: TaskManagementService;
  private noteManagementService: NoteManagementService;
  private ruleManagementService: RuleManagementService;
  private documentationResolver: DocumentationResolverService;
  private indexingService: IndexingService;
  private metadataFacade: MetadataFacade;
  private searchFacade: SearchFacade;

  private readonly indexingCoordinator: IndexingCoordinator;
  private readonly searchCoordinator: SearchCoordinator;
  private readonly metadataCoordinator: MetadataCoordinator;
  private readonly workflowCoordinator: WorkflowCoordinator;

  constructor(
    dbManagerOrOptions?: DatabaseManager | CodeIndexerLegacyOptions,
    embeddingService?: EmbeddingService,
    parserFactory?: ParserFactory
  ) {
    const env = createCodeIndexerEnvironment({ dbManagerOrOptions, embeddingService, parserFactory });

    this.dbManager = env.dbManager;
    this.embeddingService = env.embeddingService;
    this.parserFactory = env.parserFactory;

    const deps = buildCodeIndexerDependencies(env);

    this.knowledgeGraph = deps.knowledgeGraph;
    this.fileIndexingService = deps.fileIndexingService;
    this.componentSearchService = deps.componentSearchService;
    this.relationshipService = deps.relationshipService;
    this.taskManagementService = deps.taskManagementService;
    this.noteManagementService = deps.noteManagementService;
    this.ruleManagementService = deps.ruleManagementService;
    this.documentationResolver = deps.documentationResolver;
    this.metadataFacade = deps.metadataFacade;
    this.indexingService = deps.indexingService;
    this.searchService = deps.searchService;
    this.searchFacade = deps.searchFacade;

    const { indexingCoordinator, metadataCoordinator, searchCoordinator, workflowCoordinator } = createCoordinators(deps);

    this.indexingCoordinator = indexingCoordinator;
    this.metadataCoordinator = metadataCoordinator;
    this.searchCoordinator = searchCoordinator;
    this.workflowCoordinator = workflowCoordinator;

    attachIndexingApi(this, indexingCoordinator);
    attachSearchApi(this, searchCoordinator);
    attachMetadataApi(this, metadataCoordinator);
    attachWorkflowApi(this, workflowCoordinator);
  }


async close(): Promise<void> {
  try {
    await (this.dbManager as any)?.disconnect?.();
  } catch {
    /* ignore */
  }
}
}

export interface CodeIndexer extends IndexingApi, SearchApi, MetadataApi, WorkflowApi {}
