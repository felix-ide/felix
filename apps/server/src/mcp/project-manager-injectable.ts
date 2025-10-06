/**
 * Injectable Project Manager - Supports external storage providers
 * 
 * This version allows integration with existing database connections
 * from parent applications using the utility-belt ecosystem.
 */

import { CodeIndexer } from '../features/indexing/api/CodeIndexer.js';
import { DatabaseManager } from '../features/storage/DatabaseManager.js';
import { DEFAULT_CONFIG, getChokidarIgnorePatterns, DATABASE_PREFIX } from '../cli/helpers.js';
import path from 'path';
import chokidar from 'chokidar';

export interface ProjectInfo {
  name: string;          // Short name for easy reference
  fullPath: string;      // Full absolute path
  dbManager: DatabaseManager;
  codeIndexer: CodeIndexer;
  watcher: any;         // chokidar watcher
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

export interface InjectableProjectManagerOptions {
  /**
   * External database manager to use for all projects
   * If not provided, creates separate database instances per project
   */
  databaseManager?: DatabaseManager;
  
  /**
   * Database factory function that creates database for a project
   * Receives project path and should return a database manager
   */
  databaseFactory?: (projectPath: string) => Promise<DatabaseManager>;
  
  /**
   * Disable file watching for all projects
   */
  disableFileWatcher?: boolean;
  
  /**
   * Disable auto-documentation attachment
   */
  disableAutoDocumentation?: boolean;
}

export class InjectableProjectManager {
  private projects = new Map<string, ProjectInfo>(); // name -> ProjectInfo
  private options: InjectableProjectManagerOptions;
  
  constructor(options: InjectableProjectManagerOptions = {}) {
    this.options = {
      disableFileWatcher: process.env.DISABLE_FILE_WATCHER === 'true',
      disableAutoDocumentation: false,
      ...options
    };
  }
  
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
   * Get project by name or path
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

    return null;
  }

  /**
   * Create database for a project using configured strategy
   */
  private async createProjectDatabase(projectPath: string): Promise<DatabaseManager> {
    // If a single database manager is configured, use it for all projects
    if (this.options.databaseManager) {
      console.log(`🔗 Using shared database manager for project`);
      return this.options.databaseManager;
    }
    
    // If a custom factory is provided, use it
    if (this.options.databaseFactory) {
      console.log(`🏭 Using custom database factory for project`);
      return await this.options.databaseFactory(projectPath);
    }
    
    // Otherwise create default, per-project database (matches pre-refactor behavior)
    console.log(`📦 Creating default database for project`);
    const dbManager = DatabaseManager.getInstance(projectPath);
    await dbManager.initialize();
    return dbManager;
  }

  /**
   * Set/connect to an existing project (with optional indexing)
   */
  async setProject(projectPath: string, options: { forceReindex?: boolean; skipIndex?: boolean } = {}): Promise<ProjectInfo> {
    const absolutePath = path.resolve(projectPath);
    const projectName = path.basename(absolutePath);

    // Check if already loaded by name or path
    const existingByName = this.projects.get(projectName);
    if (existingByName && existingByName.fullPath === absolutePath) {
      console.log(`♻️  Reusing existing project: ${projectName}`);
      existingByName.lastAccessed = new Date();
      if (options.forceReindex) {
        await existingByName.codeIndexer.clearIndex();
        await existingByName.codeIndexer.indexDirectory(absolutePath);
      }
      return existingByName;
    }
    
    // Check if already loaded by exact path
    for (const [name, proj] of this.projects.entries()) {
      if (proj.fullPath === absolutePath) {
        console.log(`♻️  Reusing existing project: ${name} (matched by path)`);
        proj.lastAccessed = new Date();
        if (options.forceReindex) {
          await proj.codeIndexer.clearIndex();
          await proj.codeIndexer.indexDirectory(absolutePath);
        }
        return proj;
      }
    }

    console.log(`🔗 Setting project: ${projectName}`);
    console.log(`📁 Path: ${absolutePath}`);

    // Get language-specific ignore patterns from code-parser
    const parserPatterns = (await import('@felix/code-intelligence')).defaultParserFactory.getAllIgnorePatterns();
    
    // Create database using configured strategy
    const dbManager = await this.createProjectDatabase(absolutePath);
    
    // Create CodeIndexer instance with database manager
    const codeIndexer = new CodeIndexer(dbManager);

    // Initialize the code indexer
    await codeIndexer.initialize();

    // Index the codebase if not skipped, then reconcile once at the end
    if (!options.skipIndex) {
      await codeIndexer.indexDirectory(absolutePath);
      try { await codeIndexer.reconcileFilesystemChanges(); } catch {}
    }

    // Setup file watcher (with option to disable)
    const watcher = this.options.disableFileWatcher ? null : this.setupFileWatcher(absolutePath, codeIndexer);
    
    if (this.options.disableFileWatcher) {
      console.log('⚠️ File watcher disabled');
    }

    const projectInfo: ProjectInfo = {
      name: projectName,
      fullPath: absolutePath,
      dbManager,
      codeIndexer,
      watcher,
      createdAt: new Date(),
      lastAccessed: new Date()
    };

    this.projects.set(projectName, projectInfo);
    console.log(`✅ Project ${projectName} ready`);

    // Auto-attach documentation bundles if not disabled
    if (!this.options.disableAutoDocumentation) {
      await this.attachDocumentation(absolutePath, codeIndexer);
    }

    return projectInfo;
  }

  /**
   * Auto-attach documentation bundles
   */
  private async attachDocumentation(projectPath: string, codeIndexer: CodeIndexer): Promise<void> {
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const { DocumentationService } = await import('../features/metadata/services/DocumentationService.js');
      const embeddingService = (codeIndexer as any).embeddingService;
      const bundleDir = path.join(projectPath, '.felix', 'doc-bundles');
      const docService = new DocumentationService(bundleDir, embeddingService);
      await docService.initialize();
      (codeIndexer as any).documentationService = docService;
      
      // Try auto-attach
      const attachedBundles = await docService.autoAttachFromPackageJson(packageJsonPath);
      if (attachedBundles.length > 0) {
        console.log(`📚 Auto-attached ${attachedBundles.length} documentation bundle(s)`);
      }
    } catch (error) {
      // Ignore errors - auto-attach is optional
    }
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
   * Clear all projects and optionally close storage connections
   */
  async clear(closeStorage: boolean = false): Promise<void> {
    for (const project of this.projects.values()) {
      // Close watcher if exists
      if (project.watcher) {
        try { project.watcher.close(); } catch {}
        try {
          const timer: NodeJS.Timeout | undefined = (project.watcher as any)?.__reconcileTimer || project.reconcileTimer;
          if (timer) clearInterval(timer);
        } catch {}
      }
      
      // Close database if requested and not using shared provider
      if (closeStorage && !this.options.databaseManager) {
        // Database manager is a singleton, don't close it
      }
    }
    
    this.projects.clear();
  }

  /**
   * Setup file watcher for a project
   */
  private setupFileWatcher(projectPath: string, codeIndexer: CodeIndexer): any {
    const ignorePatterns = getChokidarIgnorePatterns();

    console.log(`Creating watcher for: ${projectPath}`);
    console.log(`Ignore patterns: ${ignorePatterns.length} patterns`);
    
    const isIgnored = (p: string) => {
      const lower = p.toLowerCase();
      if (
        lower.includes('/.felix') ||
        lower.endsWith('.db') || lower.endsWith('.db-wal') || lower.endsWith('.db-shm') ||
        lower.endsWith('.sqlite') || lower.endsWith('.sqlite3')
      ) { return true; }
      return false;
    };

    const watcherOptions = {
      ignored: [
        ...ignorePatterns,
        isIgnored
      ],
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

    watcher.on('ready', () => {
      console.log('🔍 File watcher initialized');
      stats.ready = true;
      stats.lastEvent = { type: 'ready', at: new Date().toISOString() };
    });
    
    watcher.on('error', (error: any) => {
      console.error('❌ Watcher error:', error.message);
      stats.lastEvent = { type: 'error', at: new Date().toISOString(), message: error?.message };
      watcher.close();
    });

    watcher.on('change', async (filePath: string) => {
      try {
        if (isIgnored(filePath)) return;
        console.log(`📝 File changed: ${path.relative(projectPath, filePath)}`);
        await codeIndexer.indexFile(filePath);
        stats.change++;
        stats.lastEvent = { type: 'change', filePath, at: new Date().toISOString() };
        await codeIndexer.regenerateEmbeddingsForFile(filePath);
        console.log(`✅ Incremental index + embeddings update completed`);
      } catch (error) {
        console.error(`⚠️ Warning: Auto-update failed:`, error);
      }
    });

    watcher.on('add', async (filePath: string) => {
      try {
        if (isIgnored(filePath)) return;
        console.log(`➕ File added: ${path.relative(projectPath, filePath)}`);
        await codeIndexer.indexFile(filePath);
        stats.add++;
        stats.lastEvent = { type: 'add', filePath, at: new Date().toISOString() };
        await codeIndexer.regenerateEmbeddingsForFile(filePath);
        console.log(`✅ File indexed + embeddings generated`);
      } catch (error) {
        console.error(`⚠️ Warning: Failed to index new file:`, error);
      }
    });

    watcher.on('unlink', async (filePath: string) => {
      try {
        if (isIgnored(filePath)) return;
        console.log(`➖ File deleted: ${path.relative(projectPath, filePath)}`);
        await codeIndexer.removeFile(filePath);
        stats.unlink++;
        stats.lastEvent = { type: 'unlink', filePath, at: new Date().toISOString() };
        console.log(`✅ File removed from index`);
      } catch (error) {
        console.error(`⚠️ Warning: Failed to remove file from index:`, error);
      }
    });

    (watcher as any).__stats = stats;
    return watcher;
  }
}

// Export singleton instance for backward compatibility
export const injectableProjectManager = new InjectableProjectManager();

// Helper functions for backward compatibility
export async function getProjectIndexer(projectPath: string): Promise<CodeIndexer> {
  const project = await injectableProjectManager.setProject(projectPath);
  return project.codeIndexer;
}

// Current project management (global state)
let currentProjectPath: string | null = null;

export function getCurrentProject(): string | null {
  return currentProjectPath;
}

export function setCurrentProject(projectPath: string | null): void {
  currentProjectPath = projectPath;
}

// Remove ProjectData export - not needed
