/**
 * Python Import Resolver - Resolves Python import statements to actual file paths and component IDs
 * Supports both absolute and relative imports, handles Python's module resolution algorithm
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve, relative, extname, basename, sep } from 'path';
import { ComponentType, RelationshipType, IComponent, IRelationship } from '../types.js';
import { pythonAstBridge, PythonAstProvider } from './PythonAstBridge.js';

/**
 * Represents a resolved Python import with metadata
 */
export interface ResolvedPythonImport {
  /** Absolute path to the resolved file/module */
  resolvedPath: string;
  /** Component ID if the imported item maps to an existing component */
  componentId?: string;
  /** Whether this is an external module (site-packages, stdlib, etc.) */
  isExternal: boolean;
  /** Whether this is a relative import */
  isRelative: boolean;
  /** The module specifier that was resolved */
  specifier: string;
  /** Imported item name (for 'from x import y' statements) */
  itemName?: string;
  /** Alias used in import (for 'import x as y' or 'from x import y as z') */
  alias?: string;
  /** Original import statement location */
  location?: { line: number; column: number };
  /** Resolution method used */
  resolutionMethod: 'relative' | 'absolute' | 'stdlib' | 'site-packages' | 'unresolved';
  /** Reason for unresolved imports */
  unresolvedReason?: string;
  /** Whether this is a star import (from x import *) */
  isStarImport?: boolean;
  /** Import type: module, from_import, or star_import */
  importType: 'module' | 'from_import' | 'star_import';
}

/**
 * Python import statement extracted from AST
 */
export interface PythonImportStatement {
  type: 'Import' | 'ImportFrom';
  line: number;
  column: number;
  module?: string; // For ImportFrom statements
  names: Array<{
    name: string;
    asname?: string;
  }>;
  level?: number; // For relative imports (number of dots)
}

/**
 * Python module information
 */
export interface PythonModule {
  name: string;
  path: string;
  isPackage: boolean;
  initFile?: string;
  components: string[]; // List of component IDs in this module
}

/**
 * Python Import Resolver with module discovery and path resolution
 */
export class PythonImportResolver {
  private moduleCache = new Map<string, PythonModule>();
  private resolutionCache = new Map<string, ResolvedPythonImport>();
  private componentIndex = new Map<string, IComponent>(); // Map of component names to components
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private bridge: PythonAstProvider;

  constructor(bridge: PythonAstProvider = pythonAstBridge) {
    this.bridge = bridge;
  }

  /**
   * Build component index from a list of components
   */
  public buildComponentIndex(components: IComponent[]): void {
    this.componentIndex.clear();

    for (const component of components) {
      // Index by component name
      this.componentIndex.set(component.name, component);

      // For Python components, also index by qualified names
      if (component.language === 'python') {
        if (component.metadata?.className && component.type === ComponentType.METHOD) {
          const qualifiedName = `${component.metadata.className}.${component.name}`;
          this.componentIndex.set(qualifiedName, component);
        }

        // Index file components by module name
        if (component.type === ComponentType.FILE) {
          const moduleName = this.getModuleNameFromPath(component.filePath);
          if (moduleName) {
            this.componentIndex.set(moduleName, component);
          }
        }
      }
    }
  }

  /**
   * Extract imports from Python file using AST
   */
  public async extractImports(filePath: string): Promise<PythonImportStatement[]> {
    try {
      const response = await this.bridge.extractImports(filePath);
      if (response.success && Array.isArray(response.imports)) {
        return response.imports as PythonImportStatement[];
      }
      const message = response.error || response.message || 'unknown error';
      console.warn(`Failed to extract imports from ${filePath}: ${message}`);
      return [];
    } catch (error) {
      console.warn(`Failed to extract Python imports from ${filePath}: ${error}`);
      return [];
    }
  }

  /**
   * Resolve a Python import statement to actual file/component
   */
  public async resolveImport(
    importStmt: PythonImportStatement,
    sourceFilePath: string,
    workspaceRoot: string
  ): Promise<ResolvedPythonImport[]> {
    const results: ResolvedPythonImport[] = [];

    if (importStmt.type === 'Import') {
      // Handle: import module1, module2 as alias
      for (const nameInfo of importStmt.names) {
        const resolved = await this.resolveModuleImport(
          nameInfo.name,
          nameInfo.asname,
          sourceFilePath,
          workspaceRoot,
          importStmt
        );
        results.push(resolved);
      }
    } else if (importStmt.type === 'ImportFrom') {
      // Handle: from module import name1, name2 as alias
      const moduleName = importStmt.module || '';
      const level = importStmt.level || 0;

      for (const nameInfo of importStmt.names) {
        const resolved = await this.resolveFromImport(
          moduleName,
          nameInfo.name,
          nameInfo.asname,
          level,
          sourceFilePath,
          workspaceRoot,
          importStmt
        );
        results.push(resolved);
      }
    }

    return results;
  }

  /**
   * Resolve a module import (import module)
   */
  private async resolveModuleImport(
    moduleName: string,
    alias: string | undefined,
    sourceFilePath: string,
    workspaceRoot: string,
    importStmt: PythonImportStatement
  ): Promise<ResolvedPythonImport> {
    const cacheKey = `module:${moduleName}:${sourceFilePath}`;
    const cached = this.resolutionCache.get(cacheKey);

    if (cached) {
      return { ...cached, alias };
    }

    // Try to resolve the module
    const resolved = await this.resolveModulePath(moduleName, sourceFilePath, workspaceRoot);

    const result: ResolvedPythonImport = {
      resolvedPath: resolved.path,
      isExternal: resolved.isExternal,
      isRelative: false,
      specifier: moduleName,
      alias,
      location: { line: importStmt.line, column: importStmt.column },
      resolutionMethod: resolved.method,
      unresolvedReason: resolved.unresolvedReason,
      importType: 'module',
      componentId: this.findComponentId(resolved.path, moduleName)
    };

    this.resolutionCache.set(cacheKey, result);
    return result;
  }

  /**
   * Resolve a from import (from module import item)
   */
  private async resolveFromImport(
    moduleName: string,
    itemName: string,
    alias: string | undefined,
    level: number,
    sourceFilePath: string,
    workspaceRoot: string,
    importStmt: PythonImportStatement
  ): Promise<ResolvedPythonImport> {
    const cacheKey = `from:${moduleName}:${itemName}:${level}:${sourceFilePath}`;
    const cached = this.resolutionCache.get(cacheKey);

    if (cached) {
      return { ...cached, alias };
    }

    let resolvedModuleName = moduleName;

    // Handle relative imports
    if (level > 0) {
      resolvedModuleName = this.resolveRelativeImport(moduleName, level, sourceFilePath);
    }

    // Resolve the module first
    const resolved = await this.resolveModulePath(resolvedModuleName, sourceFilePath, workspaceRoot);

    // Check for star import
    const isStarImport = itemName === '*';

    const result: ResolvedPythonImport = {
      resolvedPath: resolved.path,
      isExternal: resolved.isExternal,
      isRelative: level > 0,
      specifier: moduleName,
      itemName,
      alias,
      location: { line: importStmt.line, column: importStmt.column },
      resolutionMethod: resolved.method,
      unresolvedReason: resolved.unresolvedReason,
      isStarImport,
      importType: isStarImport ? 'star_import' : 'from_import',
      componentId: this.findComponentId(resolved.path, itemName, resolvedModuleName)
    };

    this.resolutionCache.set(cacheKey, result);
    return result;
  }

  /**
   * Resolve relative import paths
   */
  private resolveRelativeImport(moduleName: string, level: number, sourceFilePath: string): string {
    const sourceDir = dirname(sourceFilePath);
    let targetDir = sourceDir;

    // Go up 'level' number of directories
    for (let i = 0; i < level - 1; i++) {
      targetDir = dirname(targetDir);
    }

    if (moduleName) {
      const modulePath = join(targetDir, moduleName.replace(/\./g, sep));
      return this.getModuleNameFromPath(modulePath) || moduleName;
    } else {
      // from . import something
      return this.getModuleNameFromPath(targetDir) || '';
    }
  }

  /**
   * Resolve module path using Python's module resolution algorithm
   */
  private async resolveModulePath(
    moduleName: string,
    sourceFilePath: string,
    workspaceRoot: string
  ): Promise<{
    path: string;
    isExternal: boolean;
    method: 'relative' | 'absolute' | 'stdlib' | 'site-packages' | 'unresolved';
    unresolvedReason?: string;
  }> {
    // Check if it's a standard library module
    if (this.isStandardLibraryModule(moduleName)) {
      return {
        path: `stdlib:${moduleName}`,
        isExternal: true,
        method: 'stdlib'
      };
    }

    // Try to resolve as local module
    const localPath = await this.resolveLocalModule(moduleName, sourceFilePath, workspaceRoot);
    if (localPath) {
      return {
        path: localPath,
        isExternal: false,
        method: 'absolute'
      };
    }

    // Try to resolve in site-packages (simplified check)
    try {
      const result = await this.bridge.resolveModule(moduleName);
      if (result.success) {
        const resolvedPath = result.resolved_path;
        if (resolvedPath && resolvedPath !== 'builtin' && resolvedPath !== 'None') {
          return {
            path: resolvedPath,
            isExternal: true,
            method: 'site-packages'
          };
        }
        if (resolvedPath === 'builtin') {
          return {
            path: `stdlib:${moduleName}`,
            isExternal: true,
            method: 'stdlib'
          };
        }
      }
    } catch (error) {
      // Module not found or import failed
      void error;
    }

    return {
      path: `UNRESOLVED:${moduleName}`,
      isExternal: false,
      method: 'unresolved',
      unresolvedReason: `Module '${moduleName}' could not be resolved`
    };
  }

  /**
   * Resolve local module within workspace
   */
  private async resolveLocalModule(moduleName: string, sourceFilePath: string, workspaceRoot: string): Promise<string | null> {
    const moduleSegments = moduleName.split('.');

    // Try resolving from the source file directory first
    let searchPaths = [dirname(sourceFilePath)];

    // Add workspace root and its subdirectories
    searchPaths.push(workspaceRoot);

    // Find Python path directories
    const pythonPaths = this.findPythonPaths(workspaceRoot);
    searchPaths.push(...pythonPaths);

    for (const searchPath of searchPaths) {
      const resolved = this.resolveModuleInPath(moduleSegments, searchPath);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  /**
   * Resolve module within a specific path
   */
  private resolveModuleInPath(moduleSegments: string[], basePath: string): string | null {
    let currentPath = basePath;

    // Navigate through module segments
    for (let i = 0; i < moduleSegments.length; i++) {
      const segment = moduleSegments[i];
      const segmentPath = join(currentPath, segment);

      if (i === moduleSegments.length - 1) {
        // Last segment - check for module file
        const pyFile = segmentPath + '.py';
        if (existsSync(pyFile)) {
          return pyFile;
        }

        // Check for package directory with __init__.py
        const initFile = join(segmentPath, '__init__.py');
        if (existsSync(initFile)) {
          return initFile;
        }
      } else {
        // Intermediate segment - must be a package directory
        if (!existsSync(segmentPath) || !statSync(segmentPath).isDirectory()) {
          return null;
        }

        // Check if it's a valid Python package
        const initFile = join(segmentPath, '__init__.py');
        if (!existsSync(initFile)) {
          return null; // Not a valid Python package
        }

        currentPath = segmentPath;
      }
    }

    return null;
  }

  /**
   * Find Python paths in workspace (directories with __init__.py or setup.py)
   */
  private findPythonPaths(workspaceRoot: string): string[] {
    const paths: string[] = [];

    try {
      const entries = readdirSync(workspaceRoot);

      for (const entry of entries) {
        const entryPath = join(workspaceRoot, entry);

        if (statSync(entryPath).isDirectory()) {
          // Check if it's a Python package
          if (existsSync(join(entryPath, '__init__.py'))) {
            paths.push(dirname(entryPath)); // Add parent directory to Python path
          }

          // Check for setup.py or pyproject.toml
          if (existsSync(join(entryPath, 'setup.py')) || existsSync(join(entryPath, 'pyproject.toml'))) {
            paths.push(entryPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan Python paths in ${workspaceRoot}: ${error}`);
    }

    return paths;
  }

  /**
   * Check if a module is part of Python standard library
   */
  private isStandardLibraryModule(moduleName: string): boolean {
    // List of common Python standard library modules
    const stdlibModules = new Set([
      'os', 'sys', 'json', 'csv', 'xml', 'html', 'http', 'urllib', 'pathlib',
      'datetime', 'time', 'calendar', 'collections', 'itertools', 'functools',
      'operator', 'copy', 'pickle', 'shelve', 'marshal', 'dbm', 'sqlite3',
      'zlib', 'gzip', 'bz2', 'lzma', 'tarfile', 'zipfile', 'configparser',
      'hashlib', 'hmac', 'secrets', 'ssl', 'socket', 'email', 'mailbox',
      'mimetypes', 're', 'string', 'textwrap', 'unicodedata', 'binary',
      'struct', 'codecs', 'typing', 'pprint', 'reprlib', 'enum', 'numbers',
      'math', 'cmath', 'decimal', 'fractions', 'random', 'statistics',
      'array', 'weakref', 'types', 'gc', 'inspect', 'site', 'importlib',
      'keyword', 'pkgutil', 'modulefinder', 'runpy', 'parser', 'ast',
      'symtable', 'symbol', 'token', 'tokenize', 'tabnanny', 'pyclbr',
      'py_compile', 'compileall', 'dis', 'pickletools', 'platform',
      'errno', 'ctypes', 'threading', 'multiprocessing', 'concurrent',
      'subprocess', 'sched', 'queue', 'select', 'dummy_threading',
      'trace', 'traceback', 'faulthandler', 'pdb', 'profile', 'pstats',
      'timeit', 'cProfile', 'argparse', 'optparse', 'getopt', 'logging',
      'getpass', 'curses', 'shutil', 'glob', 'fnmatch', 'linecache',
      'tempfile', 'stat', 'filecmp', 'fileinput', 'heapq', 'bisect',
      'warnings', 'contextlib', 'abc', 'atexit', 'tracemalloc', 'resource',
      'sysconfig', 'winreg', 'winsound', 'posix', 'pwd', 'spwd', 'grp',
      'crypt', 'termios', 'tty', 'pty', 'fcntl', 'pipes', 'resource',
      'nis', 'syslog', 'xdrlib', 'plistlib', 'msilib', 'msvcrt'
    ]);

    const rootModule = moduleName.split('.')[0];
    return stdlibModules.has(rootModule || '');
  }

  /**
   * Get module name from file path
   */
  private getModuleNameFromPath(filePath: string): string | null {
    if (filePath.endsWith('.py')) {
      const baseName = basename(filePath, '.py');
      if (baseName === '__init__') {
        return basename(dirname(filePath));
      }
      return baseName;
    }
    return null;
  }

  /**
   * Find component ID for an imported item
   */
  private findComponentId(resolvedPath: string, itemName: string, moduleName?: string): string | undefined {
    // Direct component lookup
    let component = this.componentIndex.get(itemName);
    if (component && component.filePath === resolvedPath) {
      return component.id;
    }

    // Try qualified name lookup
    if (moduleName) {
      const qualifiedName = `${moduleName}.${itemName}`;
      component = this.componentIndex.get(qualifiedName);
      if (component) {
        return component.id;
      }
    }

    // File component lookup
    if (resolvedPath && !resolvedPath.startsWith('UNRESOLVED:') && !resolvedPath.startsWith('stdlib:')) {
      component = this.componentIndex.get(basename(resolvedPath));
      if (component && component.filePath === resolvedPath) {
        return component.id;
      }
    }

    return undefined;
  }

  /**
   * Create import relationships from resolved imports
   */
  public createImportRelationships(
    resolvedImports: ResolvedPythonImport[],
    sourceComponent: IComponent
  ): IRelationship[] {
    const relationships: IRelationship[] = [];

    for (const resolvedImport of resolvedImports) {
      let targetId: string;

      if (resolvedImport.componentId) {
        targetId = resolvedImport.componentId;
      } else if (resolvedImport.isExternal) {
        targetId = `EXTERNAL:${resolvedImport.specifier}`;
      } else {
        targetId = `UNRESOLVED:${resolvedImport.specifier}`;
      }

      const relationshipId = `${sourceComponent.id}-imports-${targetId}-${resolvedImport.location?.line || 0}`;

      const relationship: IRelationship = {
        id: relationshipId,
        type: RelationshipType.IMPORTS_FROM,
        sourceId: sourceComponent.id,
        targetId: targetId,
        metadata: {
          importType: resolvedImport.importType,
          specifier: resolvedImport.specifier,
          itemName: resolvedImport.itemName,
          alias: resolvedImport.alias,
          isRelative: resolvedImport.isRelative,
          isExternal: resolvedImport.isExternal,
          isStarImport: resolvedImport.isStarImport,
          resolutionMethod: resolvedImport.resolutionMethod,
          line: resolvedImport.location?.line,
          column: resolvedImport.location?.column,
          resolvedPath: resolvedImport.resolvedPath,
          ...(resolvedImport.unresolvedReason && {
            isUnresolved: true,
            unresolvedReason: resolvedImport.unresolvedReason
          })
        }
      };

      relationships.push(relationship);
    }

    return relationships;
  }

  /**
   * Clear caches
   */
  public clearCache(): void {
    this.moduleCache.clear();
    this.resolutionCache.clear();
  }

}
