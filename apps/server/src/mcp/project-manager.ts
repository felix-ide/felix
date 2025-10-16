/**
 * Simple Project Manager - No Sessions, Just Project Registry
 */

import { CodeIndexer } from '../features/indexing/api/CodeIndexer.js';
import { DatabaseManager } from '../features/storage/DatabaseManager.js';
import { DEFAULT_CONFIG, DATABASE_PREFIX } from '../cli/helpers.js';
import path from 'path';
import chokidar from 'chokidar';
import { IgnorePatterns } from '../utils/IgnorePatterns.js';
import { logger } from '../shared/logger.js';
import { appConfig } from '../shared/config.js';
import { DegradationScheduler } from '../features/metadata/services/DegradationScheduler.js';

export interface ProjectInfo {
  name: string;          // Short name for easy reference
  fullPath: string;      // Full absolute path
  dbManager: DatabaseManager;
  codeIndexer: CodeIndexer;
  watcher: any;         // chokidar watcher
  degradationScheduler?: any; // DegradationScheduler instance
  createdAt: Date;
  lastAccessed: Date;
  reconcileTimer?: NodeJS.Timeout;
  watcherStats?: {
    ready: boolean;
    add: number;
    change: number;
    unlink: number;
    lastEvent?: { type: 'add'|'change'|'unlink'|'ready'|'error'; filePath?: string; at: string; message?: string } | null;
    options?: Record<string, any>;
  };
}

export class ProjectManager {
  private projects = new Map<string, ProjectInfo>(); // name -> ProjectInfo
  private creatingProjects = new Map<string, Promise<ProjectInfo>>(); // path -> creation promise

  /**
   * List all available projects
   */
  getProjects(): Array<{ name: string; path: string; lastAccessed: Date }> {
    return Array.from(this.projects.values()).map(project => ({
      name: project.name,
      path: project.fullPath,
      lastAccessed: project.lastAccessed
    }));
  }


  /**
   * Get project by name or path - auto-loads if not in memory
   */
  async getProject(nameOrPath: string): Promise<ProjectInfo | null> {
    // First try by name
    let project = this.projects.get(nameOrPath);
    if (project) {
      project.lastAccessed = new Date();
      return project;
    }

    // Try by full path
    const absolutePath = path.resolve(nameOrPath);
    for (const [name, proj] of this.projects.entries()) {
      if (proj.fullPath === absolutePath) {
        proj.lastAccessed = new Date();
        return proj;
      }
    }

    // Project not loaded - check if it exists on disk or create it
    try {
      const fs = await import('fs/promises');

      // Check if the directory exists
      try {
        const stat = await fs.stat(absolutePath);
        if (!stat.isDirectory()) {
          return null; // Path exists but isn't a directory
        }
      } catch {
        return null; // Path doesn't exist at all
      }

      // Directory exists - check if already indexed
      const newDbPath = path.join(absolutePath, DATABASE_PREFIX + '.index.db');
      const legacyDbPath = path.join(absolutePath, '.code-indexer.index.db');

      let hasDatabase = false;
      try {
        await fs.access(newDbPath);
        hasDatabase = true;
      } catch {
        try {
          await fs.access(legacyDbPath);
          hasDatabase = true;
        } catch {
          // No database exists
        }
      }

      if (hasDatabase) {
        console.log(`📦 Auto-loading indexed project: ${nameOrPath}`);
      } else {
        console.log(`🔧 Auto-connecting to unindexed project: ${nameOrPath}`);
      }

      // Auto-load/create project connection
      return await this.setProject(absolutePath);
    } catch (error) {
      console.error(`Failed to get/create project ${nameOrPath}:`, error);
      return null;
    }
  }

  /**
   * Set/connect to an existing project (without indexing)
   */
  async setProject(projectPath: string): Promise<ProjectInfo> {
    const absolutePath = path.resolve(projectPath);
    let projectName = path.basename(absolutePath);

    // Check if already loaded by exact path
    for (const [name, proj] of this.projects.entries()) {
      if (proj.fullPath === absolutePath) {
        console.log(`♻️  Reusing existing project: ${name} (matched by path)`);
        proj.lastAccessed = new Date();
        return proj;
      }
    }
    
    // Check if already being created (prevent race condition)
    const creatingPromise = this.creatingProjects.get(absolutePath);
    if (creatingPromise) {
      console.log(`⏳ Project ${projectName} is already being created, waiting...`);
      return creatingPromise;
    }
    
    // Handle name collisions - if a project with this name already exists
    // but has a different path, make the name unique by adding parent dir
    const existingByName = this.projects.get(projectName);
    if (existingByName && existingByName.fullPath !== absolutePath) {
      // Name collision! Add parent directory to make it unique
      const parentDir = path.basename(path.dirname(absolutePath));
      projectName = `${projectName} (${parentDir})`;
      
      // If still not unique, add more of the path
      let counter = 1;
      while (this.projects.has(projectName)) {
        projectName = `${path.basename(absolutePath)} (${parentDir}-${counter})`;
        counter++;
      }
      console.log(`⚠️  Name collision detected, using unique name: ${projectName}`);
    }

    // Create the project with race protection
    const createPromise = (async () => {
      console.log(`🔗 Setting project: ${projectName}`);
      console.log(`📁 Path: ${absolutePath}`);

      // Get language-specific ignore patterns from code-parser
      const parserPatterns = (await import('@felix/code-intelligence')).defaultParserFactory.getAllIgnorePatterns();
      
      // Create database manager for THIS specific project
      const dbManager = DatabaseManager.getInstance(absolutePath);
      await dbManager.initialize();
      
      // Create CodeIndexer instance
      const codeIndexer = new CodeIndexer(dbManager);

    await codeIndexer.initialize();

    // Setup file watcher (with option to disable)
    const disableWatcher = process.env.DISABLE_FILE_WATCHER === 'true';
    const watcher = disableWatcher ? null : this.setupFileWatcher(absolutePath, codeIndexer);

    if (disableWatcher) {
      console.log('⚠️ File watcher disabled by DISABLE_FILE_WATCHER environment variable');
    }

    // Setup degradation scheduler
    const degradationScheduler = this.setupDegradationScheduler(dbManager);

    const projectInfo: ProjectInfo = {
      name: projectName,
      fullPath: absolutePath,
      dbManager,
      codeIndexer,
      watcher,
      degradationScheduler,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

      this.projects.set(projectName, projectInfo);
      console.log(`✅ Project ${projectName} connected and ready`);

      // Post-connect tasks (non-blocking): ensure metadata embeddings exist, attach docs
      (async () => {
        try {
          const stats = await codeIndexer.getStats();
          const hasRuleEmbeddings = stats.ruleEmbeddingCount > 0;
          const hasTaskEmbeddings = stats.taskEmbeddingCount > 0;
          const hasNoteEmbeddings = stats.noteEmbeddingCount > 0;
          if ((stats.ruleCount > 0 && !hasRuleEmbeddings) ||
              (stats.taskCount > 0 && !hasTaskEmbeddings) ||
              (stats.noteCount > 0 && !hasNoteEmbeddings)) {
            console.log('🧠 Generating missing embeddings for metadata entities (post-connect)...');
            await codeIndexer.indexAllMetadataEntities();
            console.log('✅ Metadata embeddings ready (post-connect)');
          }
        } catch (err) {
          console.warn('Failed to generate metadata embeddings (post-connect):', err);
        }

        // Auto-attach documentation bundles if package.json exists
        try {
          const packageJsonPath = path.join(absolutePath, 'package.json');
          const { DocumentationService } = await import('../features/metadata/services/DocumentationService.js');
          const embeddingService = (codeIndexer as any).embeddingService;
          const bundleDir = path.join(absolutePath, '.felix', 'doc-bundles');
          const docService = new DocumentationService(bundleDir, embeddingService);
          await docService.initialize();
          (codeIndexer as any).documentationService = docService;
          const attachedBundles = await docService.autoAttachFromPackageJson(packageJsonPath);
          if (attachedBundles.length > 0) {
            console.log(`📚 Auto-attached ${attachedBundles.length} documentation bundle(s)`);
          }
        } catch (error) {
          // Optional
        }
      })().catch(e => console.warn('Post-connect tasks failed:', e));

      return projectInfo;
    })();
    
    // Store the creation promise to prevent races
    this.creatingProjects.set(absolutePath, createPromise);
    
    try {
      const projectInfo = await createPromise;
      return projectInfo;
    } finally {
      // Always clean up the creating promise
      this.creatingProjects.delete(absolutePath);
    }
  }

  /**
   * Index a new project or re-index existing one
   */
  async indexProject(projectPath: string, force: boolean = false, opts: { withEmbeddings?: boolean } = {}): Promise<ProjectInfo> {
    const absolutePath = path.resolve(projectPath);
    let projectName = path.basename(absolutePath);

    // Check if already exists by path
    let existingProject: ProjectInfo | null = null;
    for (const [name, proj] of this.projects.entries()) {
      if (proj.fullPath === absolutePath) {
        existingProject = proj;
        projectName = name; // Use the existing name
        break;
      }
    }
    
    if (existingProject && !force) {
      return existingProject;
    }
    
    // Handle name collisions for new projects
    if (!existingProject) {
      const existingByName = this.projects.get(projectName);
      if (existingByName && existingByName.fullPath !== absolutePath) {
        // Name collision! Add parent directory to make it unique
        const parentDir = path.basename(path.dirname(absolutePath));
        projectName = `${projectName} (${parentDir})`;
        
        // If still not unique, add more of the path
        let counter = 1;
        while (this.projects.has(projectName)) {
          projectName = `${path.basename(absolutePath)} (${parentDir}-${counter})`;
          counter++;
        }
        console.log(`⚠️  Name collision detected, using unique name: ${projectName}`);
      }
    }

    // Clean up existing project if force re-indexing
    if (existingProject && force) {
      await this.cleanupProject(projectName);
    }

    console.log(`🔄 Indexing project: ${projectName}`);
    console.log(`📁 Path: ${absolutePath}`);

    // Get language-specific ignore patterns from code-parser
    const parserPatterns = (await import('@felix/code-intelligence')).defaultParserFactory.getAllIgnorePatterns();
    
    // Create database manager for THIS specific project
    const dbManager = DatabaseManager.getInstance(absolutePath);
    await dbManager.initialize();
    
    // Create CodeIndexer instance
    const codeIndexer = new CodeIndexer(dbManager);
    await codeIndexer.initialize();

    // Index the codebase, then reconcile once at the end
    await codeIndexer.indexDirectory(absolutePath);
    try { await codeIndexer.reconcileFilesystemChanges(); } catch {}

    // Setup file watcher (with option to disable)
    const disableWatcher = process.env.DISABLE_FILE_WATCHER === 'true';
    const watcher = disableWatcher ? null : this.setupFileWatcher(absolutePath, codeIndexer);

    if (disableWatcher) {
      console.log('⚠️ File watcher disabled by DISABLE_FILE_WATCHER environment variable');
    }

    // Setup degradation scheduler
    const degradationScheduler = this.setupDegradationScheduler(dbManager);

    const projectInfo: ProjectInfo = {
      name: projectName,
      fullPath: absolutePath,
      dbManager,
      codeIndexer,
      watcher,
      degradationScheduler,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    this.projects.set(projectName, projectInfo);
    console.log(`✅ Project ${projectName} indexed and ready`);

    // Run post-index tasks asynchronously so MCP call returns immediately.
    (async () => {
      // Auto-index metadata embeddings if they don't exist
      try {
        const stats = await codeIndexer.getStats();
        const hasRuleEmbeddings = stats.ruleEmbeddingCount > 0;
        const hasTaskEmbeddings = stats.taskEmbeddingCount > 0;
        const hasNoteEmbeddings = stats.noteEmbeddingCount > 0;
        if ((stats.ruleCount > 0 && !hasRuleEmbeddings) ||
            (stats.taskCount > 0 && !hasTaskEmbeddings) ||
            (stats.noteCount > 0 && !hasNoteEmbeddings)) {
          console.log(`🧠 Generating missing embeddings for metadata entities (background)...`);
          await codeIndexer.indexAllMetadataEntities();
          console.log(`✅ Generated embeddings for metadata entities (background)`);
        }
      } catch (error) {
        console.warn('Failed to auto-index metadata embeddings (background):', error);
      }

      // Resolve documentation links after code is indexed (non-blocking)
      try {
        await codeIndexer.resolveDocumentationLinks({ limitPerKind: 10000 });
        console.log('📎 Documentation links resolved');
      } catch (error) {
        console.warn('Failed to resolve documentation links:', error);
      }

      // Auto-attach documentation bundles if package.json exists
      try {
        const packageJsonPath = path.join(absolutePath, 'package.json');
        const { DocumentationService } = await import('../features/metadata/services/DocumentationService.js');
        const embeddingService = (codeIndexer as any).embeddingService;
        const bundleDir = path.join(absolutePath, '.felix', 'doc-bundles');
        const docService = new DocumentationService(bundleDir, embeddingService);
        await docService.initialize();
        (codeIndexer as any).documentationService = docService;
        const attachedBundles = await docService.autoAttachFromPackageJson(packageJsonPath);
        if (attachedBundles.length > 0) {
          console.log(`📚 Auto-attached ${attachedBundles.length} documentation bundle(s) (background)`);
        }
      } catch (error) {
        // Ignore errors - auto-attach is optional
      }
    })().catch(err => console.warn('Post-index background task failed:', err));

    return projectInfo;
  }

  /**
   * Get stats for a project
   */
  async getProjectStats(nameOrPath: string): Promise<any> {
    const project = await this.getProject(nameOrPath);
    if (!project) {
      throw new Error(`Project not found: ${nameOrPath}`);
    }

    return await project.codeIndexer.getStats();
  }


  /**
   * Setup degradation scheduler for a project
   */
  private setupDegradationScheduler(dbManager: DatabaseManager): DegradationScheduler | null {
    if (!appConfig.degradation.enabled) {
      return null;
    }

    const scheduler = new DegradationScheduler(
      dbManager,
      {
        enabled: true,
        intervalHours: appConfig.degradation.intervalHours,
        runOnStartup: appConfig.degradation.runOnStartup,
        maxRetries: 3,
        retryDelayMinutes: 60
      }
    );

    scheduler.start().catch(err => {
      logger.warn('Failed to start degradation scheduler:', err);
    });

    logger.info(`🧹 Degradation scheduler started (every ${appConfig.degradation.intervalHours}h)`);
    return scheduler;
  }

  /**
   * Setup file watcher for a project
   */
  private setupFileWatcher(projectPath: string, codeIndexer: CodeIndexer): any {
    const customPatterns = new Set<string>([
      '.felix',
      '**/.felix/**',
      ...DEFAULT_CONFIG.defaultExcludes.flatMap(dir => [dir, `**/${dir}`, `**/${dir}/**`]),
      ...DEFAULT_CONFIG.excludeExtensions.map(ext => `**/*${ext}`)
    ]);

    const ignoreManager = new IgnorePatterns(projectPath, {
      customPatterns: Array.from(customPatterns),
      respectGitignore: true,
      useIndexIgnore: true
    });

    const hardIgnore = (filePath: string) => {
      const lower = filePath.toLowerCase();
      if (
        lower.includes('/.felix') ||
        lower.includes('/.bin/') ||
        lower.endsWith('.db') || lower.endsWith('.db-wal') || lower.endsWith('.db-shm') ||
        lower.endsWith('.sqlite') || lower.endsWith('.sqlite3')
      ) {
        return true;
      }
      return false;
    };

    const shouldIgnore = (filePath: string) => {
      if (!filePath) return false;
      if (hardIgnore(filePath)) return true;
      return ignoreManager.shouldIgnore(filePath);
    };

    const watcherOptions = {
      ignored: (input: string) => shouldIgnore(String(input)),
      ignoreInitial: true,
      persistent: true,
      followSymlinks: false,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 }
    };

    const watcher = chokidar.watch(projectPath, watcherOptions);

    const stats: any = {
      ready: false,
      add: 0,
      change: 0,
      unlink: 0,
      lastEvent: null,
      options: watcherOptions as any
    };

    watcher.on('ready', async () => {
      logger.info('File watcher initialized');
      stats.ready = true;
      stats.lastEvent = { type: 'ready', at: new Date().toISOString() };
      // Single reconcile at the end of initial watcher setup
      try { await codeIndexer.reconcileFilesystemChanges(); } catch {}
    });
    
    watcher.on('error', (error: any) => {
      logger.error('Watcher error:', error.message);
      stats.lastEvent = { type: 'error', at: new Date().toISOString(), message: error?.message };
      watcher.close();
    });

    watcher.on('change', async (filePath: string) => {
      try {
        if (shouldIgnore(filePath)) return;
        logger.debug('File changed', { projectPath, filePath: path.relative(projectPath, filePath) });
        try {
          await codeIndexer.indexFile(filePath);
        } catch (error) {
          stats.lastEvent = { type: 'add', filePath, at: new Date().toISOString(), error: (error as Error).message };
          throw error;
        }
        stats.change++;
        stats.lastEvent = { type: 'change', filePath, at: new Date().toISOString() };
        // Refresh embeddings for updated file to reduce semantic staleness
        await codeIndexer.regenerateEmbeddingsForFile(filePath);
        logger.debug('Incremental index and embeddings update completed');
      } catch (error) {
        logger.warn(`Auto-update failed: ${(error as Error).message}`);
      }
    });

    watcher.on('add', async (filePath: string) => {
      try {
        if (shouldIgnore(filePath)) return;
        logger.debug('File added', { filePath: path.relative(projectPath, filePath) });
        await codeIndexer.indexFile(filePath);
        stats.add++;
        stats.lastEvent = { type: 'add', filePath, at: new Date().toISOString() };
        await codeIndexer.regenerateEmbeddingsForFile(filePath);
        logger.debug('New file indexed and embeddings generated');
      } catch (error) {
        logger.warn(`Failed to index new file: ${(error as Error).message}`);
      }
    });

    watcher.on('unlink', async (filePath: string) => {
      try {
        if (shouldIgnore(filePath)) return;
        logger.debug('File deleted', { filePath: path.relative(projectPath, filePath) });
        await codeIndexer.removeFile(filePath);
        stats.unlink++;
        stats.lastEvent = { type: 'unlink', filePath, at: new Date().toISOString() };
        logger.debug('Deleted file removed from index');
      } catch (error) {
        logger.warn(`Failed to remove deleted file: ${(error as Error).message}`);
      }
    });

    // Attach stats onto watcher instance for quick introspection
    (watcher as any).__stats = stats;

    return watcher;
  }

  /**
   * Cleanup a project
   */
  private async cleanupProject(projectName: string): Promise<void> {
    const project = this.projects.get(projectName);
    if (!project) return;

    try {
      // Stop degradation scheduler
      if (project.degradationScheduler) {
        project.degradationScheduler.stop();
      }

      // Close file watcher
      if (project.watcher) {
        await project.watcher.close();
      }
      // Clear reconcile timer
      try {
        const timer: NodeJS.Timeout | undefined = (project.watcher as any)?.__reconcileTimer || project.reconcileTimer;
        if (timer) clearInterval(timer);
      } catch {}

      // Close CodeIndexer and storage
      await project.codeIndexer.close();
      // Close the project-specific database manager
      await project.dbManager.disconnect();

      this.projects.delete(projectName);
      console.log(`🗑️ Cleaned up project: ${projectName}`);
    } catch (error) {
      console.error(`Error cleaning up project ${projectName}:`, error);
    }
  }

  /**
   * Cleanup all projects on shutdown
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.projects.keys()).map(name => 
      this.cleanupProject(name)
    );
    await Promise.all(cleanupPromises);
  }
}

// Global project manager instance
export const projectManager = new ProjectManager();
