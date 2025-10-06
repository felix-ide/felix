import { IndexingCoordinator } from '../../indexing/coordinators/IndexingCoordinator.js';
import { MetadataCoordinator } from '../../metadata/coordinators/MetadataCoordinator.js';
import { SearchCoordinator } from '../../search/coordinators/SearchCoordinator.js';
import { WorkflowCoordinator } from '../../workflows/coordinators/WorkflowCoordinator.js';
import { CodeIndexerDependencies } from './dependencies.js';

export interface CodeIndexerCoordinators {
  indexingCoordinator: IndexingCoordinator;
  metadataCoordinator: MetadataCoordinator;
  searchCoordinator: SearchCoordinator;
  workflowCoordinator: WorkflowCoordinator;
}

export function createCoordinators(deps: CodeIndexerDependencies): CodeIndexerCoordinators {
  const indexingCoordinator = new IndexingCoordinator(deps.dbManager, deps.indexingService);

  const metadataCoordinator = new MetadataCoordinator(
    deps.metadataFacade,
    deps.fileIndexingService,
    deps.componentSearchService,
    deps.relationshipService,
    deps.taskManagementService,
    deps.noteManagementService,
    deps.ruleManagementService
  );

  const searchCoordinator = new SearchCoordinator(
    deps.searchFacade,
    deps.componentSearchService,
    () => metadataCoordinator.getStats()
  );

  const workflowCoordinator = new WorkflowCoordinator(deps.dbManager);

  return {
    indexingCoordinator,
    metadataCoordinator,
    searchCoordinator,
    workflowCoordinator
  };
}
