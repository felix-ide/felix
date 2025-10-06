/**
 * TypeScript Export Index - Indexes exports from TypeScript/JavaScript files
 * Supports default, named, namespace exports and re-export chains
 */

import ts from 'typescript';
import { extname } from 'path';
import { createHash } from 'crypto';

/**
 * Represents an exported symbol
 */
export interface ExportedSymbol {
  /** Name of the exported symbol */
  name: string;
  /** Local name in the file (may differ from exported name) */
  localName: string;
  /** Type of export */
  type: 'default' | 'named' | 'namespace' | 're-export';
  /** Component ID if this export corresponds to a component */
  componentId?: string;
  /** Location in source file */
  location: {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  };
  /** Original file this export comes from (for re-exports) */
  originalFile?: string;
  /** Type information from TypeChecker */
  typeInfo?: {
    kind: string;
    signature?: string;
    documentation?: string;
  };
}

/**
 * Represents all exports from a single file
 */
export interface FileExports {
  /** Absolute file path */
  filePath: string;
  /** Default export if any */
  defaultExport?: ExportedSymbol;
  /** Named exports */
  namedExports: Map<string, ExportedSymbol>;
  /** Namespace exports (export * as name) */
  namespaceExports: Map<string, ExportedSymbol>;
  /** Re-exports from other modules */
  reExports: Array<{
    /** Module specifier being re-exported */
    from: string;
    /** Names being re-exported (empty for export *) */
    names: string[];
    /** Whether this is export * */
    isWildcard: boolean;
    /** Target file path if resolved */
    resolvedFrom?: string;
  }>;
  /** Hash of file content for cache invalidation */
  contentHash: string;
  /** Last modified timestamp */
  lastModified: number;
}

/**
 * Cache entry for export index
 */
interface ExportCacheEntry {
  exports: FileExports;
  lastAccess: number;
}

/**
 * TypeScript Export Index with caching and re-export chain resolution
 */
export class TSExportIndex {
  private exportCache = new Map<string, ExportCacheEntry>();
  private readonly cacheTimeout = 10 * 60 * 1000; // 10 minutes
  private readonly maxCacheSize = 5000;
  private resolutionStack = new Set<string>(); // For circular dependency detection

  /**
   * Index exports from a TypeScript source file
   */
  public async indexFile(
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker | undefined,
    content: string,
    componentIdMap?: Map<string, string>
  ): Promise<FileExports> {
    const filePath = sourceFile.fileName;
    const contentHash = this.hashContent(content);

    // Check cache
    const cached = this.exportCache.get(filePath);
    if (cached && cached.exports.contentHash === contentHash) {
      cached.lastAccess = Date.now();
      return cached.exports;
    }

    // Create new export index
    const fileExports: FileExports = {
      filePath,
      namedExports: new Map(),
      namespaceExports: new Map(),
      reExports: [],
      contentHash,
      lastModified: Date.now()
    };

    // Process each statement in the file
    for (const statement of sourceFile.statements) {
      await this.processStatement(statement, fileExports, typeChecker, componentIdMap);
    }

    // Cache the result
    this.cacheExports(filePath, fileExports);

    return fileExports;
  }

  /**
   * Get exports for a file, using cache if available
   */
  public getFileExports(filePath: string): FileExports | null {
    const cached = this.exportCache.get(filePath);
    if (cached && this.isCacheValid(cached)) {
      cached.lastAccess = Date.now();
      return cached.exports;
    }
    return null;
  }

  /**
   * Resolve a specific export from a file, following re-export chains
   */
  public async resolveExport(
    filePath: string,
    exportName: string,
    moduleResolver: (specifier: string, fromFile: string) => Promise<string | null>,
    getExportsForFile: (file: string) => Promise<FileExports | null>
  ): Promise<ExportedSymbol | null> {
    // Prevent circular dependencies
    const key = `${filePath}:${exportName}`;
    if (this.resolutionStack.has(key)) {
      return null;
    }

    this.resolutionStack.add(key);

    try {
      const fileExports = await getExportsForFile(filePath);
      if (!fileExports) {
        return null;
      }

      // Check direct exports first
      if (exportName === 'default' && fileExports.defaultExport) {
        return fileExports.defaultExport;
      }

      if (fileExports.namedExports.has(exportName)) {
        return fileExports.namedExports.get(exportName)!;
      }

      if (fileExports.namespaceExports.has(exportName)) {
        return fileExports.namespaceExports.get(exportName)!;
      }

      // Check re-exports
      for (const reExport of fileExports.reExports) {
        if (reExport.isWildcard || reExport.names.includes(exportName)) {
          const targetFile = reExport.resolvedFrom ||
            await moduleResolver(reExport.from, filePath);

          if (targetFile) {
            const resolved = await this.resolveExport(
              targetFile,
              exportName,
              moduleResolver,
              getExportsForFile
            );

            if (resolved) {
              // Mark as re-export and update original file reference
              return {
                ...resolved,
                type: 're-export',
                originalFile: targetFile
              };
            }
          }
        }
      }

      return null;
    } finally {
      this.resolutionStack.delete(key);
    }
  }

  /**
   * Get all symbols that would be available when importing * from a file
   */
  public async getNamespaceExports(
    filePath: string,
    moduleResolver: (specifier: string, fromFile: string) => Promise<string | null>,
    getExportsForFile: (file: string) => Promise<FileExports | null>
  ): Promise<Map<string, ExportedSymbol>> {
    const result = new Map<string, ExportedSymbol>();
    const fileExports = await getExportsForFile(filePath);

    if (!fileExports) {
      return result;
    }

    // Add all named exports
    for (const [name, symbol] of fileExports.namedExports) {
      result.set(name, symbol);
    }

    // Add namespace exports
    for (const [name, symbol] of fileExports.namespaceExports) {
      result.set(name, symbol);
    }

    // Process re-exports
    for (const reExport of fileExports.reExports) {
      if (reExport.isWildcard) {
        const targetFile = reExport.resolvedFrom ||
          await moduleResolver(reExport.from, filePath);

        if (targetFile && !this.resolutionStack.has(`${targetFile}:*`)) {
          this.resolutionStack.add(`${targetFile}:*`);
          try {
            const targetExports = await this.getNamespaceExports(
              targetFile,
              moduleResolver,
              getExportsForFile
            );

            for (const [name, symbol] of targetExports) {
              if (!result.has(name)) { // Don't override local exports
                result.set(name, {
                  ...symbol,
                  type: 're-export',
                  originalFile: targetFile
                });
              }
            }
          } finally {
            this.resolutionStack.delete(`${targetFile}:*`);
          }
        }
      } else {
        // Named re-exports
        for (const name of reExport.names) {
          if (!result.has(name)) {
            const resolved = await this.resolveExport(
              filePath,
              name,
              moduleResolver,
              getExportsForFile
            );
            if (resolved) {
              result.set(name, resolved);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.exportCache.clear();
    this.resolutionStack.clear();
  }

  /**
   * Clean expired cache entries
   */
  public cleanCache(): void {
    const now = Date.now();
    const entries = Array.from(this.exportCache.entries());

    for (const [filePath, entry] of entries) {
      if (now - entry.lastAccess > this.cacheTimeout) {
        this.exportCache.delete(filePath);
      }
    }

    // If still too large, remove oldest entries
    if (this.exportCache.size > this.maxCacheSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
        .slice(0, this.exportCache.size - this.maxCacheSize);

      for (const [filePath] of sortedEntries) {
        this.exportCache.delete(filePath);
      }
    }
  }

  /**
   * Process a TypeScript statement for exports
   */
  private async processStatement(
    statement: ts.Statement,
    fileExports: FileExports,
    typeChecker: ts.TypeChecker | undefined,
    componentIdMap?: Map<string, string>
  ): Promise<void> {
    switch (statement.kind) {
      case ts.SyntaxKind.ExportDeclaration:
        await this.processExportDeclaration(statement as ts.ExportDeclaration, fileExports, typeChecker);
        break;

      case ts.SyntaxKind.ExportAssignment:
        this.processExportAssignment(statement as ts.ExportAssignment, fileExports, typeChecker, componentIdMap);
        break;

      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
      case ts.SyntaxKind.EnumDeclaration:
      case ts.SyntaxKind.VariableStatement:
        this.processExportableDeclaration(statement, fileExports, typeChecker, componentIdMap);
        break;
    }
  }

  /**
   * Process export declaration (export { ... })
   */
  private async processExportDeclaration(
    exportDecl: ts.ExportDeclaration,
    fileExports: FileExports,
    typeChecker: ts.TypeChecker | undefined
  ): Promise<void> {
    if (exportDecl.moduleSpecifier) {
      // Re-export from another module
      const moduleSpecifier = exportDecl.moduleSpecifier.getText().slice(1, -1); // Remove quotes

      if (exportDecl.exportClause) {
        if (ts.isNamedExports(exportDecl.exportClause)) {
          // export { a, b } from './module'
          const names = exportDecl.exportClause.elements.map(el =>
            (el.propertyName || el.name).text
          );

          fileExports.reExports.push({
            from: moduleSpecifier,
            names,
            isWildcard: false
          });
        } else if (ts.isNamespaceExport(exportDecl.exportClause)) {
          // export * as name from './module'
          const namespaceName = exportDecl.exportClause.name.text;
          const location = this.getLocation(exportDecl, fileExports.filePath);

          fileExports.namespaceExports.set(namespaceName, {
            name: namespaceName,
            localName: namespaceName,
            type: 'namespace',
            location
          });
        }
      } else {
        // export * from './module'
        fileExports.reExports.push({
          from: moduleSpecifier,
          names: [],
          isWildcard: true
        });
      }
    } else if (exportDecl.exportClause && ts.isNamedExports(exportDecl.exportClause)) {
      // export { a, b }
      for (const element of exportDecl.exportClause.elements) {
        const exportedName = element.name.text;
        const localName = element.propertyName ? element.propertyName.text : exportedName;
        const location = this.getLocation(element, fileExports.filePath);

        fileExports.namedExports.set(exportedName, {
          name: exportedName,
          localName,
          type: 'named',
          location,
          typeInfo: this.getTypeInfo(element, typeChecker)
        });
      }
    }
  }

  /**
   * Process export assignment (export = something)
   */
  private processExportAssignment(
    exportAssign: ts.ExportAssignment,
    fileExports: FileExports,
    typeChecker: ts.TypeChecker | undefined,
    componentIdMap?: Map<string, string>
  ): void {
    if (exportAssign.isExportEquals) {
      // export = something (CommonJS style)
      const location = this.getLocation(exportAssign, fileExports.filePath);
      const expression = exportAssign.expression;
      let localName = 'module.exports';

      if (ts.isIdentifier(expression)) {
        localName = expression.text;
      }

      fileExports.defaultExport = {
        name: 'default',
        localName,
        type: 'default',
        location,
        componentId: componentIdMap?.get(localName),
        typeInfo: this.getTypeInfo(exportAssign, typeChecker)
      };
    } else {
      // export default something
      const location = this.getLocation(exportAssign, fileExports.filePath);
      const expression = exportAssign.expression;
      let localName = 'default';

      if (ts.isIdentifier(expression)) {
        localName = expression.text;
      }

      fileExports.defaultExport = {
        name: 'default',
        localName,
        type: 'default',
        location,
        componentId: componentIdMap?.get(localName),
        typeInfo: this.getTypeInfo(exportAssign, typeChecker)
      };
    }
  }

  /**
   * Process declarations that may be exported
   */
  private processExportableDeclaration(
    statement: ts.Statement,
    fileExports: FileExports,
    typeChecker: ts.TypeChecker | undefined,
    componentIdMap?: Map<string, string>
  ): void {
    const hasExportModifier = this.hasExportModifier(statement);
    const hasDefaultModifier = this.hasDefaultModifier(statement);

    if (!hasExportModifier) {
      return;
    }

    let name: string | undefined;

    if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) {
      name = statement.name?.text;
    } else if (ts.isVariableStatement(statement)) {
      // Handle variable declarations
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          name = declaration.name.text;
          break;
        }
      }
    }

    if (name) {
      const location = this.getLocation(statement, fileExports.filePath);
      const exportedSymbol: ExportedSymbol = {
        name: hasDefaultModifier ? 'default' : name,
        localName: name,
        type: hasDefaultModifier ? 'default' : 'named',
        location,
        componentId: componentIdMap?.get(name),
        typeInfo: this.getTypeInfo(statement, typeChecker)
      };

      if (hasDefaultModifier) {
        fileExports.defaultExport = exportedSymbol;
      } else {
        fileExports.namedExports.set(name, exportedSymbol);
      }
    }
  }

  /**
   * Check if statement has export modifier
   */
  private hasExportModifier(statement: ts.Statement): boolean {
    return (statement as any).modifiers?.some((mod: ts.Modifier) => mod.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }

  /**
   * Check if statement has default modifier
   */
  private hasDefaultModifier(statement: ts.Statement): boolean {
    return (statement as any).modifiers?.some((mod: ts.Modifier) => mod.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
  }

  /**
   * Get location information for a node
   */
  private getLocation(node: ts.Node, filePath: string): ExportedSymbol['location'] {
    const sourceFile = node.getSourceFile();
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return {
      line: start.line + 1,
      column: start.character,
      endLine: end.line + 1,
      endColumn: end.character
    };
  }

  /**
   * Get type information from TypeChecker
   */
  private getTypeInfo(node: ts.Node, typeChecker: ts.TypeChecker | undefined): ExportedSymbol['typeInfo'] {
    try {
      if (!typeChecker) {
        return { kind: ts.SyntaxKind[node.kind] };
      }
      const symbol = typeChecker.getSymbolAtLocation(node);
      if (symbol) {
        const type = typeChecker.getTypeOfSymbolAtLocation(symbol, node);
        const signature = typeChecker.typeToString(type);
        const documentation = ts.displayPartsToString(symbol.getDocumentationComment(typeChecker));

        return {
          kind: ts.SyntaxKind[node.kind],
          signature,
          documentation: documentation || undefined
        };
      }
    } catch (error) {
      // Ignore TypeChecker errors for robustness
    }

    return { kind: ts.SyntaxKind[node.kind] };
  }

  /**
   * Cache exports for a file
   */
  private cacheExports(filePath: string, exports: FileExports): void {
    this.exportCache.set(filePath, {
      exports,
      lastAccess: Date.now()
    });

    // Clean cache if it gets too large
    if (this.exportCache.size > this.maxCacheSize) {
      this.cleanCache();
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: ExportCacheEntry): boolean {
    return Date.now() - entry.lastAccess < this.cacheTimeout;
  }

  /**
   * Hash file content for cache invalidation
   */
  private hashContent(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }
}
