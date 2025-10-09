/**
 * Clean Database Manager
 * Manages TypeORM connections with PROJECT-SPECIFIC paths
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { logger } from '../../shared/logger.js';
import path from 'path';
import { access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { WriteQueue } from '../../shared/WriteQueue.js';

// Import entities
import { Component, Relationship, Embedding, IndexMetadata } from './entities/index/index.js';
import { 
  Task, Note, Rule, 
  TaskDependency, TaskCodeLink, TaskMetric,
  RuleRelationship, RuleApplication,
  WorkflowConfiguration, GlobalWorkflowSetting,
  TransitionGate,
  TaskStatus,
  TaskStatusFlow
} from './entities/metadata/index.js';

// Import repositories
import { ComponentRepository } from './repositories/ComponentRepository.js';
import { RelationshipRepository } from './repositories/RelationshipRepository.js';
import { EmbeddingRepository } from './repositories/EmbeddingRepository.js';
import { NotesRepository } from './repositories/NotesRepository.js';
import { TasksRepository } from './repositories/TasksRepository.js';
import { RulesRepository } from './repositories/RulesRepository.js';

export class DatabaseManager {
  private static instances: Map<string, DatabaseManager> = new Map();
  private indexDataSource: DataSource | null = null;
  private metadataDataSource: DataSource | null = null;
  private projectPath: string;
  private writeQueue: WriteQueue = new WriteQueue();
  private writeQueueEnabled: boolean;
  private initializing: Promise<void> | null = null;
  
  // Repository instances
  private componentRepo: ComponentRepository | null = null;
  private relationshipRepo: RelationshipRepository | null = null;
  private embeddingRepo: EmbeddingRepository | null = null;
  private notesRepo: NotesRepository | null = null;
  private tasksRepo: TasksRepository | null = null;
  private rulesRepo: RulesRepository | null = null;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = path.resolve(projectPath);
    const env = (process.env.INDEX_WRITE_QUEUE || 'on').toLowerCase();
    this.writeQueueEnabled = !(env === 'off' || env === 'false' || env === '0');
  }

  /**
   * Get instance for specific project path (NOT a singleton)
   */
  static getInstance(projectPath?: string): DatabaseManager {
    const resolvedPath = path.resolve(projectPath || process.cwd());
    
    // Return existing instance if available for this project
    let instance = DatabaseManager.instances.get(resolvedPath);
    if (!instance) {
      instance = new DatabaseManager(resolvedPath);
      DatabaseManager.instances.set(resolvedPath, instance);
    }
    return instance;
  }

  /**
   * Initialize both databases with PROJECT-SPECIFIC paths
   */
  async initialize(): Promise<void> {
    if (this.indexDataSource?.isInitialized && this.metadataDataSource?.isInitialized) return;
    if (this.initializing) { await this.initializing; return; }
    this.initializing = (async () => {
    try {
      // Build project-specific database paths
      const indexDbPath = await this.resolveDbPath('.felix.index.db', '.code-indexer.index.db');
      const metadataDbPath = await this.resolveDbPath('.felix.metadata.db', '.code-indexer.metadata.db');

      logger.info(`🗄️  Initializing databases for project: ${this.projectPath}`);
      logger.debug(`Index DB: ${indexDbPath}`);
      logger.debug(`Metadata DB: ${metadataDbPath}`);

      // Index database configuration
      const indexConfig: DataSourceOptions = {
        type: 'sqlite',
        database: indexDbPath,
        entities: [Component, Relationship, Embedding, IndexMetadata],
        synchronize: true,
        logging: false
      };

      // Metadata database configuration  
      const metadataConfig: DataSourceOptions = {
        type: 'sqlite',
        database: metadataDbPath,
        entities: [
          Task, Note, Rule, TaskDependency, TaskCodeLink, TaskMetric,
          RuleRelationship, RuleApplication, WorkflowConfiguration, GlobalWorkflowSetting, TransitionGate,
          TaskStatus, TaskStatusFlow
        ],
        synchronize: true,
        logging: false
      };

      // Initialize index database
      this.indexDataSource = new DataSource(indexConfig);
      await this.indexDataSource.initialize();
      logger.info('✅ Index database connected');
      await this.applySqlitePragmas(this.indexDataSource).catch(() => undefined);

      // If not sqlite, default to disabling the queue unless explicitly forced on
      try {
        // @ts-ignore
        const driverType = (this.indexDataSource.options as any)?.type || 'sqlite';
        if (driverType !== 'sqlite') {
          const env = (process.env.INDEX_WRITE_QUEUE || '').toLowerCase();
          if (!(env === 'on' || env === 'true' || env === '1')) {
            this.writeQueueEnabled = false;
            logger.info('✳️  Write queue disabled (non-sqlite driver detected)');
          }
        }
      } catch {}

      // Initialize metadata database
      this.metadataDataSource = new DataSource(metadataConfig);
      await this.metadataDataSource.initialize();
      logger.info('✅ Metadata database connected');
      await this.applySqlitePragmas(this.metadataDataSource).catch(() => undefined);

      // Initialize repositories
      this.initializeRepositories();
    } catch (error) {
      logger.error('Failed to initialize databases:', error);
      throw error;
    } finally {
      this.initializing = null;
    }})();
    await this.initializing;
  }

  private async resolveDbPath(primaryName: string, legacyName: string): Promise<string> {
    const primaryPath = path.join(this.projectPath, primaryName);
    if (await this.pathExists(primaryPath)) {
      return primaryPath;
    }

    const legacyPath = path.join(this.projectPath, legacyName);
    if (await this.pathExists(legacyPath)) {
      logger.info(`Using legacy database path: ${legacyPath}`);
      return legacyPath;
    }

    return primaryPath;
  }

  private async pathExists(candidate: string): Promise<boolean> {
    try {
      await access(candidate, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /** Apply safe SQLite performance pragmas (WAL, NORMAL sync, in-memory temp) */
  private async applySqlitePragmas(ds: DataSource): Promise<void> {
    try {
      // Only for sqlite
      // @ts-ignore
      const driver = (ds.options as any)?.type;
      if (driver !== 'sqlite') return;
      await ds.query('PRAGMA journal_mode=WAL;');
      await ds.query('PRAGMA synchronous=NORMAL;');
      await ds.query('PRAGMA temp_store=MEMORY;');
      await ds.query('PRAGMA journal_size_limit=67108864;');
      await ds.query('PRAGMA cache_size=-20000;'); // ~20k pages in memory (negative means KB)
      logger.info('🛠️  SQLite PRAGMAs applied (WAL, NORMAL, MEMORY temp, tuned cache)');
    } catch (err) {
      logger.debug('SQLite PRAGMAs not applied:', err);
    }
  }

  /**
   * Initialize all repository instances
   */
  private initializeRepositories(): void {
    if (!this.indexDataSource || !this.metadataDataSource) {
      throw new Error('Data sources not initialized');
    }

    // Index repositories
    this.relationshipRepo = new RelationshipRepository(this.indexDataSource);
    this.componentRepo = new ComponentRepository(this.indexDataSource, this.projectPath, this.relationshipRepo);
    this.embeddingRepo = new EmbeddingRepository(this.indexDataSource);

    // Ensure critical indexes (best-effort, async but not awaited here)
    this.componentRepo.ensureIndexes().catch(() => undefined);
    this.relationshipRepo.ensureIndexes().catch(() => undefined);

    // Metadata repositories
    this.notesRepo = new NotesRepository(this.metadataDataSource);
    this.tasksRepo = new TasksRepository(this.metadataDataSource);
    this.rulesRepo = new RulesRepository(this.metadataDataSource);
  }

  /**
   * Close both database connections
   */
  async disconnect(): Promise<void> {
    try {
      if (this.indexDataSource?.isInitialized) {
        await this.indexDataSource.destroy();
        logger.info('Index database disconnected');
      }
      
      if (this.metadataDataSource?.isInitialized) {
        await this.metadataDataSource.destroy();
        logger.info('Metadata database disconnected');
      }
      
      // Remove from instances map
      DatabaseManager.instances.delete(this.projectPath);
    } catch (error) {
      logger.error('Error disconnecting databases:', error);
    }
  }

  /**
   * Clear all cached instances (for cleanup)
   */
  static async clearAllInstances(): Promise<void> {
    for (const [path, instance] of DatabaseManager.instances.entries()) {
      await instance.disconnect();
    }
    DatabaseManager.instances.clear();
  }

  /**
   * Get the project path this manager is configured for
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Get repository instances
   */
  getComponentRepository(): ComponentRepository {
    if (!this.componentRepo) throw new Error('Component repository not initialized');
    return this.componentRepo;
  }

  getRelationshipRepository(): RelationshipRepository {
    if (!this.relationshipRepo) throw new Error('Relationship repository not initialized');
    return this.relationshipRepo;
  }

  getEmbeddingRepository(): EmbeddingRepository {
    if (!this.embeddingRepo) throw new Error('Embedding repository not initialized');
    return this.embeddingRepo;
  }

  getNotesRepository(): NotesRepository {
    if (!this.notesRepo) throw new Error('Notes repository not initialized');
    return this.notesRepo;
  }

  getTasksRepository(): TasksRepository {
    if (!this.tasksRepo) throw new Error('Tasks repository not initialized');
    return this.tasksRepo;
  }

  getRulesRepository(): RulesRepository {
    if (!this.rulesRepo) throw new Error('Rules repository not initialized');
    return this.rulesRepo;
  }

  /** Serialize writes to avoid SQLITE_BUSY under concurrent indexing */
  async runWrite<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.writeQueueEnabled) {
      return fn();
    }
    return this.writeQueue.enqueue(fn);
  }

  isWriteQueueEnabled(): boolean { return this.writeQueueEnabled; }

  /**
   * Get DataSource instances (for direct queries if needed)
   */
  getIndexDataSource(): DataSource {
    if (!this.indexDataSource || !this.indexDataSource.isInitialized) {
      throw new Error('Index database not initialized');
    }
    return this.indexDataSource;
  }

  getMetadataDataSource(): DataSource {
    if (!this.metadataDataSource || !this.metadataDataSource.isInitialized) {
      throw new Error('Metadata database not initialized');
    }
    return this.metadataDataSource;
  }

  /**
   * Check if databases are initialized
   */
  isReady(): boolean {
    return this.indexDataSource?.isInitialized === true && 
           this.metadataDataSource?.isInitialized === true;
  }

  /**
   * Clear all data from both databases (DANGEROUS)
   */
  async clearAllData(): Promise<void> {
    if (this.indexDataSource?.isInitialized) {
      await this.indexDataSource.synchronize(true);
    }
    if (this.metadataDataSource?.isInitialized) {
      await this.metadataDataSource.synchronize(true);
    }
  }

  /**
   * Clear only the index database (components/relationships/embeddings)
   * Safer default for re-index operations; preserves tasks/notes/rules.
   */
  async clearIndexData(): Promise<void> {
    if (this.indexDataSource?.isInitialized) {
      await this.indexDataSource.synchronize(true);
    }
  }
}
