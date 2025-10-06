import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { IndexingService, type IndexingOptions } from '../services/IndexingService.js';
import type { IndexingResult } from '../services/FileIndexingService.js';
import type { ParseResult } from '@felix/code-intelligence';

export class IndexingCoordinator {
  constructor(
    private readonly dbManager: DatabaseManager,
    private readonly indexingService: IndexingService
  ) {}

  async initialize(): Promise<void> {
    await this.dbManager.initialize();
  }

  async indexDirectory(directoryPath: string, options: IndexingOptions = {}): Promise<IndexingResult> {
    return this.indexingService.indexDirectory(directoryPath, options);
  }

  async indexFile(filePath: string): Promise<ParseResult> {
    return this.indexingService.indexFile(filePath);
  }

  async updateFile(filePath: string): Promise<ParseResult> {
    return this.indexingService.updateFile(filePath);
  }

  async regenerateEmbeddingsForFile(filePath: string): Promise<void> {
    await this.indexingService.regenerateEmbeddingsForFile(filePath);
  }

  async removeFile(filePath: string): Promise<void> {
    await this.indexingService.removeFile(filePath);
  }

  async reconcileFilesystemChanges(options?: { since?: number; batchLimit?: number }): Promise<{ scanned: number; reindexed: number; since: number; now: number }> {
    return this.indexingService.reconcileFilesystemChanges(options);
  }

  async clearIndex(): Promise<void> {
    await this.indexingService.clearIndex();
  }

  async generateAllEmbeddings(entityTypes: string[] = ['component', 'task', 'note', 'rule']): Promise<any> {
    return this.indexingService.generateAllEmbeddings(entityTypes);
  }
}
