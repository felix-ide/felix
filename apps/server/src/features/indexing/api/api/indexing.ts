import type { IndexingCoordinator } from '../../coordinators/IndexingCoordinator.js';

export interface IndexingApi {
  initialize: IndexingCoordinator['initialize'];
  indexDirectory: IndexingCoordinator['indexDirectory'];
  indexFile: IndexingCoordinator['indexFile'];
  updateFile: IndexingCoordinator['updateFile'];
  regenerateEmbeddingsForFile: IndexingCoordinator['regenerateEmbeddingsForFile'];
  removeFile: IndexingCoordinator['removeFile'];
  reconcileFilesystemChanges: IndexingCoordinator['reconcileFilesystemChanges'];
  clearIndex: IndexingCoordinator['clearIndex'];
  generateAllEmbeddings: IndexingCoordinator['generateAllEmbeddings'];
}

export function attachIndexingApi(target: any, coordinator: IndexingCoordinator): void {
  target.initialize = coordinator.initialize.bind(coordinator);
  target.indexDirectory = coordinator.indexDirectory.bind(coordinator);
  target.indexFile = coordinator.indexFile.bind(coordinator);
  target.updateFile = coordinator.updateFile.bind(coordinator);
  target.regenerateEmbeddingsForFile = coordinator.regenerateEmbeddingsForFile.bind(coordinator);
  target.removeFile = coordinator.removeFile.bind(coordinator);
  target.reconcileFilesystemChanges = coordinator.reconcileFilesystemChanges.bind(coordinator);
  target.clearIndex = coordinator.clearIndex.bind(coordinator);
  target.generateAllEmbeddings = coordinator.generateAllEmbeddings.bind(coordinator);
}
