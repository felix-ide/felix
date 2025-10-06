/**
 * TypeScript Module Resolver - Builds TypeScript Program and resolves module specifiers
 * Supports Node.js resolution and tsconfig path mapping
 */

import ts from 'typescript';
import { join, dirname, resolve, relative, extname, isAbsolute } from 'path';
import { existsSync, readFileSync } from 'fs';
import { glob } from 'glob';

/**
 * Represents a resolved module with metadata
 */
export interface ResolvedModule {
  /** Absolute path to the resolved file */
  resolvedPath: string;
  /** Whether this is an external module (node_modules, etc.) */
  isExternal: boolean;
  /** The module specifier that was resolved */
  specifier: string;
  /** Original import statement location */
  location?: { line: number; column: number };
  /** Resolution method used */
  resolutionMethod: 'tsconfig-paths' | 'node-resolution' | 'relative' | 'unresolved';
  /** Reason for unresolved modules */
  unresolvedReason?: string;
}

/**
 * TypeScript configuration with path mapping
 */
export interface TSConfig {
  baseUrl?: string;
  paths?: Record<string, string[]>;
  rootDir?: string;
  outDir?: string;
  include?: string[];
  exclude?: string[];
}

/**
 * Cache entry for TypeScript Programs
 */
interface ProgramCacheEntry {
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  configHash: string;
  lastModified: number;
  sourceFiles: Set<string>;
}

/**
 * TypeScript Module Resolver with Program caching and path mapping support
 */
export class TSModuleResolver {
  private programCache = new Map<string, ProgramCacheEntry>();
  private configCache = new Map<string, TSConfig>();
  private resolutionCache = new Map<string, ResolvedModule>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  // FS TTL caches to reduce repeated disk I/O during resolution bursts
  private existsCache = new Map<string, { ok: boolean; t: number }>();
  private dirCache = new Map<string, { isDir: boolean; t: number }>();
  private readonly fsTtlMs = Number(process.env.TS_RESOLVER_FS_TTL_MS || '10000');

  /**
   * Get or create TypeScript Program for a workspace
   */
  public async getProgram(workspaceRoot: string): Promise<{ program: ts.Program; typeChecker: ts.TypeChecker }> {
    const cacheKey = workspaceRoot;
    const cached = this.programCache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      return { program: cached.program, typeChecker: cached.typeChecker };
    }

    const tsConfig = await this.loadTSConfig(workspaceRoot);
    const configHash = this.hashConfig(tsConfig, workspaceRoot);

    // Check if we can reuse existing program with same config
    if (cached && cached.configHash === configHash) {
      cached.lastModified = Date.now();
      return { program: cached.program, typeChecker: cached.typeChecker };
    }

    // Create new program
    const { program, typeChecker } = await this.createProgram(workspaceRoot, tsConfig);

    const sourceFiles = new Set<string>();
    program.getSourceFiles().forEach(sf => {
      if (!sf.fileName.includes('node_modules')) {
        sourceFiles.add(sf.fileName);
      }
    });

    const cacheEntry: ProgramCacheEntry = {
      program,
      typeChecker,
      configHash,
      lastModified: Date.now(),
      sourceFiles
    };

    this.programCache.set(cacheKey, cacheEntry);
    return { program, typeChecker };
  }

  /**
   * Resolve a module specifier to an absolute file path
   */
  public async resolveModule(
    specifier: string,
    fromFile: string,
    workspaceRoot: string
  ): Promise<ResolvedModule> {
    const cacheKey = `${fromFile}:${specifier}`;
    const cached = this.resolutionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const resolved = await this.performResolution(specifier, fromFile, workspaceRoot);
    this.resolutionCache.set(cacheKey, resolved);

    // Clean cache periodically
    if (this.resolutionCache.size > 10000) {
      this.cleanResolutionCache();
    }

    return resolved;
  }

  /**
   * Get all source files in the workspace that are part of the TypeScript program
   */
  public async getSourceFiles(workspaceRoot: string): Promise<string[]> {
    const { program } = await this.getProgram(workspaceRoot);
    return program.getSourceFiles()
      .map(sf => sf.fileName)
      .filter(fileName => !fileName.includes('node_modules') && this.isTypeScriptFile(fileName));
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.programCache.clear();
    this.configCache.clear();
    this.resolutionCache.clear();
    this.existsCache.clear();
    this.dirCache.clear();
  }

  /**
   * Load and parse tsconfig.json
   */
  private async loadTSConfig(workspaceRoot: string): Promise<TSConfig> {
    const cached = this.configCache.get(workspaceRoot);
    if (cached) {
      return cached;
    }

    const tsconfigPath = this.findTSConfig(workspaceRoot);
    let config: TSConfig = {};

    if (tsconfigPath && existsSync(tsconfigPath)) {
      try {
        const configContent = readFileSync(tsconfigPath, 'utf8');
        const parsedConfig = ts.parseConfigFileTextToJson(tsconfigPath, configContent);

        if (parsedConfig.config && parsedConfig.config.compilerOptions) {
          const compilerOptions = parsedConfig.config.compilerOptions;
          config = {
            baseUrl: compilerOptions.baseUrl,
            paths: compilerOptions.paths,
            rootDir: compilerOptions.rootDir,
            outDir: compilerOptions.outDir
          };

          // Resolve baseUrl relative to tsconfig location
          if (config.baseUrl) {
            config.baseUrl = resolve(dirname(tsconfigPath), config.baseUrl);
          }
        }

        if (parsedConfig.config.include) {
          config.include = parsedConfig.config.include;
        }
        if (parsedConfig.config.exclude) {
          config.exclude = parsedConfig.config.exclude;
        }
      } catch (error) {
        console.warn(`Failed to parse tsconfig.json at ${tsconfigPath}:`, error);
      }
    }

    this.configCache.set(workspaceRoot, config);
    return config;
  }

  /**
   * Find tsconfig.json in workspace
   */
  private findTSConfig(workspaceRoot: string): string | null {
    const candidates = [
      join(workspaceRoot, 'tsconfig.json'),
      join(workspaceRoot, 'jsconfig.json')
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Create TypeScript Program
   */
  private async createProgram(workspaceRoot: string, tsConfig: TSConfig): Promise<{ program: ts.Program; typeChecker: ts.TypeChecker }> {
    // Find all TypeScript/JavaScript files
    const filePatterns = [
      join(workspaceRoot, '**/*.ts'),
      join(workspaceRoot, '**/*.tsx'),
      join(workspaceRoot, '**/*.js'),
      join(workspaceRoot, '**/*.jsx')
    ];

    const excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      ...(tsConfig.exclude || [])
    ];

    let files: string[] = [];
    for (const pattern of filePatterns) {
      const matches = await glob(pattern, {
        ignore: excludePatterns,
        absolute: true
      });
      files.push(...matches);
    }

    // Remove duplicates
    files = [...new Set(files)];

    // Compile options with path mapping support
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false, // Don't enforce strict checking for parsing
      noEmit: true, // We're only doing analysis
      baseUrl: tsConfig.baseUrl,
      paths: tsConfig.paths,
      rootDir: tsConfig.rootDir || workspaceRoot
    };

    // Create program
    const program = ts.createProgram(files, compilerOptions);
    const typeChecker = program.getTypeChecker();

    return { program, typeChecker };
  }

  /**
   * Perform module resolution
   */
  private async performResolution(specifier: string, fromFile: string, workspaceRoot: string): Promise<ResolvedModule> {
    const tsConfig = await this.loadTSConfig(workspaceRoot);

    // Try tsconfig path mapping first
    if (tsConfig.baseUrl && tsConfig.paths) {
      const tsconfigResolved = this.resolveTSConfigPaths(specifier, tsConfig, workspaceRoot);
      if (tsconfigResolved) {
        return {
          resolvedPath: tsconfigResolved,
          isExternal: false,
          specifier,
          resolutionMethod: 'tsconfig-paths'
        };
      }
    }

    // Try relative resolution
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const relativeResolved = this.resolveRelative(specifier, fromFile);
      if (relativeResolved) {
        return {
          resolvedPath: relativeResolved,
          isExternal: false,
          specifier,
          resolutionMethod: 'relative'
        };
      }
    }

    // Try Node.js resolution
    const nodeResolved = this.resolveNodeModule(specifier, fromFile, workspaceRoot);
    if (nodeResolved) {
      return {
        resolvedPath: nodeResolved.path,
        isExternal: nodeResolved.isExternal,
        specifier,
        resolutionMethod: 'node-resolution'
      };
    }

    // Unresolved
    return {
      resolvedPath: '',
      isExternal: true,
      specifier,
      resolutionMethod: 'unresolved',
      unresolvedReason: `Could not resolve module '${specifier}' from '${fromFile}'`
    };
  }

  /**
   * Resolve using tsconfig paths
   */
  private resolveTSConfigPaths(specifier: string, tsConfig: TSConfig, workspaceRoot: string): string | null {
    if (!tsConfig.baseUrl || !tsConfig.paths) {
      return null;
    }

    const baseUrl = tsConfig.baseUrl;

    for (const [pathPattern, pathMappings] of Object.entries(tsConfig.paths)) {
      const regex = new RegExp('^' + pathPattern.replace('*', '(.*)') + '$');
      const match = specifier.match(regex);

      if (match) {
        for (const mapping of pathMappings) {
          const replacement = mapping.replace('*', match[1] || '');
          const fullPath = resolve(baseUrl, replacement);

          const resolved = this.resolveFileWithExtensions(fullPath);
          if (resolved) {
            return resolved;
          }
        }
      }
    }

    return null;
  }

  /**
   * Resolve relative imports
   */
  private resolveRelative(specifier: string, fromFile: string): string | null {
    const fromDir = dirname(fromFile);
    const fullPath = resolve(fromDir, specifier);
    return this.resolveFileWithExtensions(fullPath);
  }

  /**
   * Resolve Node.js module
   */
  private resolveNodeModule(specifier: string, fromFile: string, workspaceRoot: string): { path: string; isExternal: boolean } | null {
    let currentDir = dirname(fromFile);

    while (currentDir !== dirname(currentDir)) {
      const nodeModulesPath = join(currentDir, 'node_modules', specifier);

      // Try package.json main field
      const packageJsonPath = join(nodeModulesPath, 'package.json');
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          const main = packageJson.main || packageJson.module || 'index.js';
          const mainPath = join(nodeModulesPath, main);
          const resolved = this.resolveFileWithExtensions(mainPath);
          if (resolved) {
            const isNodeModules = /[\\/]node_modules[\\/]/.test(resolved);
            return {
              path: resolved,
              isExternal: isNodeModules || !resolved.startsWith(workspaceRoot)
            };
          }
        } catch {
          // Ignore package.json parse errors
        }
      }

      // Try index files
      const indexPath = join(nodeModulesPath, 'index');
      const resolved = this.resolveFileWithExtensions(indexPath);
      if (resolved) {
        const isNodeModules = /[\\/]node_modules[\\/]/.test(resolved);
        return {
          path: resolved,
          isExternal: isNodeModules || !resolved.startsWith(workspaceRoot)
        };
      }

      // Try direct file
      const directResolved = this.resolveFileWithExtensions(nodeModulesPath);
      if (directResolved) {
        const isNodeModules = /[\\/]node_modules[\\/]/.test(directResolved);
        return {
          path: directResolved,
          isExternal: isNodeModules || !directResolved.startsWith(workspaceRoot)
        };
      }

      currentDir = dirname(currentDir);
    }

    return null;
  }

  /**
   * Resolve file with common extensions
   */
  private resolveFileWithExtensions(basePath: string): string | null {
    // If already has extension and exists
    if (extname(basePath) && this.cachedExists(basePath)) {
      return basePath;
    }

    // Try common extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];

    for (const ext of extensions) {
      const withExt = basePath + ext;
      if (this.cachedExists(withExt)) {
        return withExt;
      }
    }

    // Try index files in directory
    if (this.cachedExists(basePath) && this.cachedIsDirectory(basePath)) {
      for (const ext of extensions) {
        const indexFile = join(basePath, 'index' + ext);
        if (this.cachedExists(indexFile)) {
          return indexFile;
        }
      }
    }

    return null;
  }

  private cachedExists(p: string): boolean {
    const now = Date.now();
    const cached = this.existsCache.get(p);
    if (cached && now - cached.t < this.fsTtlMs) return cached.ok;
    const ok = existsSync(p);
    this.existsCache.set(p, { ok, t: now });
    return ok;
  }

  private cachedIsDirectory(p: string): boolean {
    const now = Date.now();
    const cached = this.dirCache.get(p);
    if (cached && now - cached.t < this.fsTtlMs) return cached.isDir;
    let isDir = false;
    try {
      isDir = require('fs').statSync(p).isDirectory();
    } catch {}
    this.dirCache.set(p, { isDir, t: now });
    return isDir;
  }

  /**
   * Check if file is a TypeScript/JavaScript file
   */
  private isTypeScriptFile(fileName: string): boolean {
    const ext = extname(fileName).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: ProgramCacheEntry): boolean {
    return Date.now() - entry.lastModified < this.cacheTimeout;
  }

  /**
   * Generate hash for configuration
   */
  private hashConfig(config: TSConfig, workspaceRoot: string): string {
    const str = JSON.stringify({ config, workspaceRoot });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Clean resolution cache to prevent memory leaks
   */
  private cleanResolutionCache(): void {
    const entries = Array.from(this.resolutionCache.entries());
    const toKeep = entries.slice(-5000); // Keep last 5000 entries
    this.resolutionCache.clear();
    toKeep.forEach(([key, value]) => this.resolutionCache.set(key, value));
  }
}
