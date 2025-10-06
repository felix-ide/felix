/**
 * Utilities for handling ignore patterns from .gitignore, .indexignore, and custom patterns
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';
import ignore from 'ignore';

export interface IgnoreConfig {
  /** Custom patterns to ignore */
  customPatterns?: string[];
  /** Whether to respect .gitignore files (default: true) */
  respectGitignore?: boolean;
  /** Whether to look for .indexignore files (default: true) */
  useIndexIgnore?: boolean;
  /** Additional ignore files to check */
  additionalIgnoreFiles?: string[];
  /** Whether to respect the user's global gitignore (~/.config/git/ignore etc.). Default: true, can be overridden by ORAICLE_RESPECT_GLOBAL_GITIGNORE=off */
  respectGlobalGitignore?: boolean;
}

export class IgnorePatterns {
  private ig: ReturnType<typeof ignore>;
  private projectRoot: string;

  constructor(projectRoot: string, config: IgnoreConfig = {}) {
    this.projectRoot = resolve(projectRoot);
    this.ig = ignore();
    
    // Add default database file patterns to prevent indexing database files
    this.ig.add([
      '*.db',
      '*.db-wal',
      '*.db-shm',
      '*.db-journal',
      '*.sqlite',
      '*.sqlite3',
      '.felix.index.db',
      '.felix.index.db-*',
      '.felix.metadata.db',
      '.felix.metadata.db-*',
      'index.db',
      'metadata.db',
      '**/*.db',
      '**/*.db-wal',
      '**/*.db-shm',
      '**/*.db-journal',
      '**/*.sqlite',
      '**/*.sqlite3',
      '**/.felix.index.db',
      '**/.felix.index.db-*',
      '**/.felix.metadata.db',
      '**/.felix.metadata.db-*'
    ]);
    
    // Add custom patterns
    if (config.customPatterns?.length) {
      this.ig.add(config.customPatterns);
    }

    // Load .gitignore files if enabled
    if (config.respectGitignore !== false) {
      this.loadGitignoreFiles(config.respectGlobalGitignore);
    }

    // Load .indexignore files if enabled
    if (config.useIndexIgnore !== false) {
      this.loadIndexIgnoreFiles();
    }

    // Load additional ignore files
    if (config.additionalIgnoreFiles?.length) {
      config.additionalIgnoreFiles.forEach(file => {
        this.loadIgnoreFile(file);
      });
    }
  }

  /**
   * Check if a file path should be ignored
   */
  shouldIgnore(filePath: string): boolean {
    const relativePath = relative(this.projectRoot, resolve(filePath));
    
    // Don't ignore paths outside the project root
    if (!relativePath || relativePath.startsWith('..')) {
      return false;
    }

    return this.ig.ignores(relativePath);
  }

  /**
   * Filter an array of file paths, removing ignored ones
   */
  filterPaths(paths: string[]): string[] {
    return paths.filter(path => !this.shouldIgnore(path));
  }

  /**
   * Load .gitignore files from project root and parent directories
   */
  private loadGitignoreFiles(respectGlobalGitignore?: boolean): void {
    let currentDir = this.projectRoot;
    const visited = new Set<string>();

    // Walk up the directory tree looking for .gitignore files
    while (currentDir !== '/' && !visited.has(currentDir)) {
      visited.add(currentDir);
      
      const gitignorePath = join(currentDir, '.gitignore');
      if (existsSync(gitignorePath)) {
        this.loadIgnoreFile(gitignorePath);
      }

      // Stop at git repository root (if .git directory exists)
      if (existsSync(join(currentDir, '.git'))) {
        break;
      }

      const parentDir = resolve(currentDir, '..');
      if (parentDir === currentDir) break; // Reached root
      currentDir = parentDir;
    }

    // Also check for global gitignore (opt-in via config or env)
    const env = (process.env.ORAICLE_RESPECT_GLOBAL_GITIGNORE || '').toLowerCase();
    // Default OFF: only enable global gitignore if explicitly requested via config or env
    const allowGlobal = typeof respectGlobalGitignore === 'boolean'
      ? respectGlobalGitignore
      : (env === 'on' || env === 'true' || env === '1');
    if (allowGlobal) {
      this.loadGlobalGitignore();
    }
  }

  /**
   * Load global gitignore file
   */
  private loadGlobalGitignore(): void {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) return;

    const globalGitignorePaths = [
      join(homeDir, '.gitignore_global'),
      join(homeDir, '.config', 'git', 'ignore'),
      join(homeDir, '.gitignore')
    ];

    for (const path of globalGitignorePaths) {
      if (existsSync(path)) {
        this.loadIgnoreFile(path);
        break;
      }
    }
  }

  /**
   * Load .indexignore files from project root and subdirectories
   */
  private loadIndexIgnoreFiles(): void {
    const indexIgnorePath = join(this.projectRoot, '.indexignore');
    if (existsSync(indexIgnorePath)) {
      this.loadIgnoreFile(indexIgnorePath);
    }
  }

  /**
   * Load ignore patterns from a specific file
   */
  private loadIgnoreFile(filePath: string): void {
    try {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf8');
        const patterns = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
        
        if (patterns.length > 0) {
          this.ig.add(patterns);
          console.error(`📋 Loaded ${patterns.length} ignore patterns from ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`⚠️  Failed to load ignore file ${filePath}:`, error);
    }
  }

  /**
   * Get all loaded patterns for debugging
   */
  getPatterns(): string[] {
    // The ignore library doesn't expose patterns directly, so we return a placeholder
    return ['(patterns loaded from ignore files)'];
  }

  /**
   * Create a default .indexignore file for a project
   */
  static createDefaultIndexIgnore(projectRoot: string, additionalPatterns: string[] = []): void {
    const indexIgnorePath = join(projectRoot, '.indexignore');
    
    const defaultPatterns = [
      '# The Felix ignore file',
      '# Patterns here will be ignored during indexing',
      '',
      '# Test directories (uncomment if you want to index tests)',
      '# test/',
      '# tests/',
      '# __tests__/',
      '# spec/',
      '# e2e/',
      '',
      '# Documentation that changes frequently',
      '# docs/api/',
      '# docs/generated/',
      '',
      '# Large data files',
      '*.json',
      '*.csv',
      '*.xml',
      '',
      '# Specific files to ignore',
      '# config/secrets.js',
      '',
      ...additionalPatterns
    ];

    try {
      const content = defaultPatterns.join('\n') + '\n';
      require('fs').writeFileSync(indexIgnorePath, content);
      console.error(`📝 Created default .indexignore file at ${indexIgnorePath}`);
    } catch (error) {
      console.error(`❌ Failed to create .indexignore file:`, error);
    }
  }
}

/**
 * Common ignore patterns for different project types
 */
export const COMMON_IGNORE_PATTERNS = {
  node: [
    'node_modules/**',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    '.npm',
    '.eslintcache',
    '.nyc_output',
    'coverage/',
    'dist/',
    'build/',
    '*.tgz',
    '*.tar.gz'
  ],
  
  python: [
    '__pycache__/',
    '*.py[cod]',
    '*$py.class',
    '*.so',
    '.Python',
    'build/',
    'develop-eggs/',
    'dist/',
    'downloads/',
    'eggs/',
    '.eggs/',
    'lib/',
    'lib64/',
    'parts/',
    'sdist/',
    'var/',
    'wheels/',
    '*.egg-info/',
    '.installed.cfg',
    '*.egg',
    'venv/',
    'env/',
    '.venv/',
    '.env/',
    '.pytest_cache/',
    '.coverage',
    'htmlcov/'
  ],
  
  java: [
    '*.class',
    '*.log',
    '*.ctxt',
    '.mtj.tmp/',
    '*.jar',
    '*.war',
    '*.nar',
    '*.ear',
    '*.zip',
    '*.tar.gz',
    '*.rar',
    'hs_err_pid*',
    'target/',
    'build/',
    '.gradle/',
    'gradle-app.setting',
    '!gradle-wrapper.jar',
    '.gradletasknamecache'
  ],
  
  web: [
    'node_modules/',
    'bower_components/',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    '.sass-cache/',
    '.tmp/',
    'dist/',
    'build/',
    '.next/',
    '.nuxt/',
    'out/',
    '.cache/',
    '*.min.js',
    '*.min.css',
    '*.map'
  ]
};
