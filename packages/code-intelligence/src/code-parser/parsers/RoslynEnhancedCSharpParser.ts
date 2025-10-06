/**
 * Roslyn-Enhanced C# Parser
 * Integrates Roslyn sidecar for advanced semantic analysis while maintaining fallback to Tree-sitter
 */

import { TreeSitterCSharpParser } from './tree-sitter/TreeSitterCSharpParser.js';
import { RoslynSidecarService, CodeSymbol, SemanticAnalysisResult, DiagnosticInfo } from '../services/RoslynSidecarService.js';
import { IComponent, IRelationship, ComponentType, RelationshipType, Location } from '../types.js';
import { ParseResult, ParseError, ParserOptions } from '../interfaces/ILanguageParser.js';
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Configuration for the Roslyn-enhanced parser
 */
export interface RoslynParserConfig {
  /** Enable Roslyn sidecar (falls back to Tree-sitter if disabled or unavailable) */
  enableRoslyn?: boolean;
  /** Sidecar service configuration */
  sidecarConfig?: any;
  /** Timeout for sidecar operations in milliseconds */
  sidecarTimeout?: number;
  /** Enable fallback to Tree-sitter on Roslyn failure */
  enableFallback?: boolean;
  /** Cache sidecar results */
  enableCaching?: boolean;
  /** Maximum cache size */
  maxCacheSize?: number;
}

/**
 * Cache entry for sidecar results
 */
interface CacheEntry {
  result: ParseResult;
  timestamp: number;
  contentHash: string;
}

/**
 * Enhanced C# parser using Roslyn sidecar with Tree-sitter fallback
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class RoslynEnhancedCSharpParser extends TreeSitterCSharpParser {
  private sidecarService: RoslynSidecarService | null = null;
  private config: Required<RoslynParserConfig>;
  private resultCache = new Map<string, CacheEntry>();
  private sidecarAvailable: boolean | null = null;

  constructor(config: RoslynParserConfig = {}) {
    super();

    this.config = {
      enableRoslyn: true,
      sidecarConfig: {},
      sidecarTimeout: 15000,
      enableFallback: true,
      enableCaching: true,
      maxCacheSize: 100,
      ...config
    };

    // Override capabilities to include Roslyn features
    (this as any).capabilities = {
      ...this.getCapabilities(),
      symbols: true,
      relationships: true,
      ranges: true,
      types: true,
      controlFlow: true,
      incremental: true
    };

    if (this.config.enableRoslyn) {
      if (!this.isSidecarExecutableAvailable()) {
        console.warn('Roslyn sidecar requirements not met (dotnet/build missing). Falling back to Tree-sitter.');
        this.config = { ...this.config, enableRoslyn: false };
        this.sidecarAvailable = false;
      } else {
        void this.initializeSidecar();
      }
    }
  }

  /**
   * Initialize the Roslyn sidecar service
   */
  private async initializeSidecar(): Promise<void> {
    try {
      this.sidecarService = new RoslynSidecarService(this.config.sidecarConfig);

      // Set up event handlers
      this.sidecarService.on('error', (error) => {
        console.warn('Roslyn sidecar error:', error);
        this.sidecarAvailable = false;
      });

      this.sidecarService.on('exit', (code, signal) => {
        console.warn(`Roslyn sidecar exited with code ${code}, signal ${signal}`);
        this.sidecarAvailable = false;
      });

      this.sidecarService.on('started', () => {
        this.sidecarAvailable = true;
      });

      // Check availability
      this.sidecarAvailable = await this.sidecarService.isAvailable();
    } catch (error) {
      console.warn('Failed to initialize Roslyn sidecar:', error);
      this.sidecarAvailable = false;
    }
  }

  private isSidecarExecutableAvailable(): boolean {
    const configuredPath = (this.config.sidecarConfig as any)?.executablePath as string | undefined;
    const candidates = configuredPath ? [configuredPath] : this.getDefaultExecutableCandidates();

    for (const candidate of candidates) {
      if (candidate === 'dotnet') {
        const check = spawnSync('dotnet', ['--version'], { stdio: 'ignore' });
        if (check.status === 0) {
          return true;
        }
        continue;
      }

      if (existsSync(candidate)) {
        return true;
      }
    }

    return false;
  }

  private getDefaultExecutableCandidates(): string[] {
    const sidecarDir = join(__dirname, '..', 'sidecars', 'roslyn');
    return [
      join(sidecarDir, 'bin', 'Release', 'net8.0', 'RoslynSidecar.exe'),
      join(sidecarDir, 'bin', 'Debug', 'net8.0', 'RoslynSidecar.exe'),
      join(sidecarDir, 'bin', 'Release', 'net8.0', 'RoslynSidecar'),
      join(sidecarDir, 'bin', 'Debug', 'net8.0', 'RoslynSidecar'),
      'dotnet'
    ];
  }

  /**
   * Override parseFile to use Roslyn sidecar when available
   */
  async parseFile(filePath: string, options?: ParserOptions): Promise<ParseResult> {
    const ext = extname(filePath);
    if (!this.getSupportedExtensions().includes(ext)) {
      throw new Error(`Unsupported file extension: ${ext}`);
    }

    try {
      // Try Roslyn sidecar first if enabled and available
      if (this.config.enableRoslyn && this.shouldUseRoslyn(filePath, options)) {
        const result = await this.parseWithRoslyn(filePath, options);
        if (result) {
          return result;
        }
      }

      // Fallback to Tree-sitter
      if (this.config.enableFallback) {
        console.log(`Using Tree-sitter fallback for ${filePath}`);
        return await super.parseFile(filePath, options);
      }

      throw new Error('No parser available for C# file');
    } catch (error) {
      if (this.config.enableFallback) {
        console.warn(`Roslyn parsing failed for ${filePath}, falling back to Tree-sitter:`, error);
        return await super.parseFile(filePath, options);
      }
      throw error;
    }
  }

  /**
   * Override parseContent to use Roslyn sidecar when available
   */
  async parseContent(content: string, filePath: string, options?: ParserOptions): Promise<ParseResult> {
    try {
      // Try Roslyn sidecar first if enabled and available
      if (this.config.enableRoslyn && this.shouldUseRoslyn(filePath, options)) {
        const result = await this.parseContentWithRoslyn(content, filePath, options);
        if (result) {
          return result;
        }
      }

      // Fallback to Tree-sitter
      if (this.config.enableFallback) {
        return await super.parseContent(content, filePath, options);
      }

      throw new Error('No parser available for C# content');
    } catch (error) {
      if (this.config.enableFallback) {
        console.warn(`Roslyn content parsing failed for ${filePath}, falling back to Tree-sitter:`, error);
        return await super.parseContent(content, filePath, options);
      }
      throw error;
    }
  }

  /**
   * Determine if we should use Roslyn for this file
   */
  private shouldUseRoslyn(filePath: string, options?: ParserOptions): boolean {
    // Don't use Roslyn if it's not available
    if (this.sidecarAvailable === false) {
      return false;
    }

    // Don't use Roslyn for very large files (Tree-sitter is faster)
    if (existsSync(filePath)) {
      const stats = require('fs').statSync(filePath);
      if (stats.size > 500000) { // 500KB threshold
        return false;
      }
    }

    // Use Roslyn if specifically requested or for project files
    if (options?.preferSemanticAnalysis || options?.workspaceRoot) {
      return true;
    }

    // Default to using Roslyn for most cases
    return true;
  }

  /**
   * Parse file using Roslyn sidecar
   */
  private async parseWithRoslyn(filePath: string, options?: ParserOptions): Promise<ParseResult | null> {
    if (!this.sidecarService) {
      return null;
    }

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cached = this.getCachedResult(filePath);
        if (cached) {
          return cached;
        }
      }

      // Load workspace if provided
      if (options?.workspaceRoot && existsSync(options.workspaceRoot)) {
        await this.sidecarService.loadWorkspace(options.workspaceRoot);
      }

      // Analyze the file
      const semanticResult = await this.sidecarService.analyzeFile(filePath);
      const parseResult = this.convertSemanticToParseResult(semanticResult, filePath);

      // Cache the result
      if (this.config.enableCaching) {
        this.cacheResult(filePath, parseResult);
      }

      return parseResult;
    } catch (error) {
      console.warn(`Roslyn analysis failed for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse content using Roslyn sidecar
   */
  private async parseContentWithRoslyn(content: string, filePath: string, options?: ParserOptions): Promise<ParseResult | null> {
    if (!this.sidecarService) {
      return null;
    }

    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const contentHash = this.computeContentHash(content);
        const cacheKey = `${filePath}#${contentHash}`;
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Load workspace if provided
      if (options?.workspaceRoot && existsSync(options.workspaceRoot)) {
        await this.sidecarService.loadWorkspace(options.workspaceRoot);
      }

      // Analyze the content
      const semanticResult = await this.sidecarService.analyzeFile(filePath, content);
      const parseResult = this.convertSemanticToParseResult(semanticResult, filePath);

      // Cache the result
      if (this.config.enableCaching) {
        const contentHash = this.computeContentHash(content);
        const cacheKey = `${filePath}#${contentHash}`;
        this.cacheResult(cacheKey, parseResult);
      }

      return parseResult;
    } catch (error) {
      console.warn(`Roslyn content analysis failed for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Convert Roslyn semantic analysis result to parse result
   */
  private convertSemanticToParseResult(semanticResult: SemanticAnalysisResult, filePath: string): ParseResult {
    const components = semanticResult.symbols.map(symbol => this.convertSymbolToComponent(symbol, filePath));
    const relationships = this.extractRelationshipsFromSymbols(components, semanticResult);
    const errors = semanticResult.diagnostics
      .filter(d => d.severity === 'Error')
      .map(d => this.convertDiagnosticToError(d));
    const warnings = semanticResult.diagnostics
      .filter(d => d.severity === 'Warning')
      .map(d => this.convertDiagnosticToError(d));

    return {
      components,
      relationships,
      errors,
      warnings,
      metadata: {
        filePath,
        language: 'csharp',
        parseTime: semanticResult.processingTimeMs,
        componentCount: components.length,
        relationshipCount: relationships.length,
        parsingLevel: 'semantic' as const,
        backend: 'hybrid' as const,
        parser: 'roslyn-enhanced',
        processingTimeMs: semanticResult.processingTimeMs,
        symbolCount: semanticResult.symbols.length,
        diagnosticCount: semanticResult.diagnostics.length,
        hasControlFlow: semanticResult.controlFlowGraph.length > 0,
        hasDataFlow: semanticResult.dataFlow !== null,
        hasTypeHierarchy: semanticResult.typeHierarchies.length > 0
      }
    };
  }

  /**
   * Convert Roslyn code symbol to IComponent
   */
  private convertSymbolToComponent(symbol: CodeSymbol, filePath: string): IComponent {
    const componentType = this.mapSymbolKindToComponentType(symbol.kind);
    const location = symbol.location ? this.convertCodeLocationToLocation(symbol.location) : {
      startLine: 1, endLine: 1, startColumn: 1, endColumn: 1
    };

    return {
      id: symbol.id,
      name: symbol.name,
      type: componentType,
      language: 'csharp',
      filePath,
      location,
      metadata: {
        ...symbol.metadata,
        roslynKind: symbol.kind,
        symbolType: symbol.type,
        accessibility: symbol.accessibility,
        isStatic: symbol.isStatic,
        isAbstract: symbol.isAbstract,
        isVirtual: symbol.isVirtual,
        isOverride: symbol.isOverride,
        isSealed: symbol.isSealed,
        isPartial: symbol.isPartial,
        isAsync: symbol.isAsync,
        isGeneric: symbol.isGeneric,
        genericParameters: symbol.genericParameters,
        parameters: symbol.parameters,
        returnType: symbol.returnType,
        namespace: symbol.namespace,
        containingType: symbol.containingType,
        documentation: symbol.documentation,
        attributes: symbol.attributes,
        parser: 'roslyn'
      }
    };
  }

  /**
   * Map Roslyn symbol kind to ComponentType
   */
  private mapSymbolKindToComponentType(kind: string): ComponentType {
    switch (kind.toLowerCase()) {
      case 'namedtype':
      case 'class': return ComponentType.CLASS;
      case 'interface': return ComponentType.INTERFACE;
      case 'struct': return ComponentType.STRUCT;
      case 'enum': return ComponentType.ENUM;
      case 'method': return ComponentType.METHOD;
      case 'property': return ComponentType.PROPERTY;
      case 'field': return ComponentType.FIELD;
      case 'event': return ComponentType.EVENT;
      case 'namespace': return ComponentType.NAMESPACE;
      case 'parameter': return ComponentType.VARIABLE;
      case 'local': return ComponentType.VARIABLE;
      case 'typeParameter': return ComponentType.GENERIC;
      default: return ComponentType.UNKNOWN;
    }
  }

  /**
   * Convert Roslyn CodeLocation to Location
   */
  private convertCodeLocationToLocation(codeLocation: any): Location {
    return {
      startLine: codeLocation.startLine,
      endLine: codeLocation.endLine,
      startColumn: codeLocation.startColumn,
      endColumn: codeLocation.endColumn
    };
  }

  /**
   * Extract relationships from semantic analysis
   */
  private extractRelationshipsFromSymbols(components: IComponent[], semanticResult: SemanticAnalysisResult): IRelationship[] {
    const relationships: IRelationship[] = [];

    // Add type hierarchy relationships
    for (const hierarchy of semanticResult.typeHierarchies) {
      const sourceComponent = components.find(c => c.id === hierarchy.symbolId);
      if (!sourceComponent) continue;

      // Base type relationship
      if (hierarchy.baseType) {
        const targetComponent = components.find(c => c.name === hierarchy.baseType);
        if (targetComponent) {
          relationships.push({
            id: `${sourceComponent.id}-extends-${targetComponent.id}`,
            sourceId: sourceComponent.id,
            targetId: targetComponent.id,
            type: RelationshipType.EXTENDS,
            metadata: {
              relationshipType: 'inheritance',
              source: 'roslyn'
            }
          });
        }
      }

      // Interface implementation relationships
      for (const interfaceName of hierarchy.interfaces) {
        const interfaceComponent = components.find(c => c.name === interfaceName);
        if (interfaceComponent) {
          relationships.push({
            id: `${sourceComponent.id}-implements-${interfaceComponent.id}`,
            sourceId: sourceComponent.id,
            targetId: interfaceComponent.id,
            type: RelationshipType.IMPLEMENTS,
            metadata: {
              relationshipType: 'interface_implementation',
              source: 'roslyn'
            }
          });
        }
      }

      // Member containment relationships
      for (const memberName of hierarchy.members) {
        const memberComponent = components.find(c => c.name === memberName && c.metadata.containingType === sourceComponent.name);
        if (memberComponent) {
          relationships.push({
            id: `${sourceComponent.id}-contains-${memberComponent.id}`,
            sourceId: sourceComponent.id,
            targetId: memberComponent.id,
            type: RelationshipType.CONTAINS,
            metadata: {
              relationshipType: 'containment',
              source: 'roslyn'
            }
          });
        }
      }
    }

    // Add control flow relationships
    for (const node of semanticResult.controlFlowGraph) {
      for (const successorId of node.successors) {
        relationships.push({
          id: `${node.id}-flows-to-${successorId}`,
          sourceId: node.id,
          targetId: successorId,
          type: 'flows_to' as any,
          metadata: {
            relationshipType: 'control_flow',
            source: 'roslyn'
          }
        });
      }
    }

    return relationships;
  }

  /**
   * Convert diagnostic to parse error
   */
  private convertDiagnosticToError(diagnostic: DiagnosticInfo): ParseError {
    return {
      message: diagnostic.message,
      severity: diagnostic.severity.toLowerCase() as 'error' | 'warning',
      source: 'roslyn',
      location: diagnostic.location ? this.convertCodeLocationToLocation(diagnostic.location) : undefined,
      code: diagnostic.id
    };
  }

  /**
   * Caching methods
   */
  private getCachedResult(key: string): ParseResult | null {
    const entry = this.resultCache.get(key);
    if (!entry) return null;

    // Check if cache is still valid (1 hour)
    const maxAge = 60 * 60 * 1000;
    if (Date.now() - entry.timestamp > maxAge) {
      this.resultCache.delete(key);
      return null;
    }

    return entry.result;
  }

  private cacheResult(key: string, result: ParseResult): void {
    // Clean up cache if it's getting too large
    if (this.resultCache.size >= this.config.maxCacheSize) {
      const oldestKey = this.resultCache.keys().next().value as string | undefined;
      if (oldestKey !== undefined) {
        this.resultCache.delete(oldestKey);
      }
    }

    this.resultCache.set(key, {
      result,
      timestamp: Date.now(),
      contentHash: ''
    });
  }

  private computeContentHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Enhanced methods using Roslyn capabilities
   */

  /**
   * Get advanced semantic information for a file
   */
  async getSemanticAnalysis(filePath: string, content?: string): Promise<SemanticAnalysisResult | null> {
    if (!this.sidecarService || this.sidecarAvailable === false) {
      return null;
    }

    try {
      return await this.sidecarService.analyzeFile(filePath, content);
    } catch (error) {
      console.warn(`Failed to get semantic analysis for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get control flow graph for a file
   */
  async getControlFlowGraph(filePath: string): Promise<any[]> {
    if (!this.sidecarService || this.sidecarAvailable === false) {
      return [];
    }

    try {
      return await this.sidecarService.getControlFlow(filePath);
    } catch (error) {
      console.warn(`Failed to get control flow for ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Get data flow analysis for a file
   */
  async getDataFlowAnalysis(filePath: string): Promise<any | null> {
    if (!this.sidecarService || this.sidecarAvailable === false) {
      return null;
    }

    try {
      return await this.sidecarService.getDataFlow(filePath || '');
    } catch (error) {
      console.warn(`Failed to get data flow for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get type hierarchy for a file
   */
  async getTypeHierarchy(filePath: string): Promise<any[]> {
    if (!this.sidecarService || this.sidecarAvailable === false) {
      return [];
    }

    try {
      return await this.sidecarService.getTypeHierarchy(filePath);
    } catch (error) {
      console.warn(`Failed to get type hierarchy for ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Load a workspace for enhanced analysis
   */
  async loadWorkspace(workspacePath: string): Promise<boolean> {
    if (!this.sidecarService) {
      return false;
    }

    try {
      const info = await this.sidecarService.loadWorkspace(workspacePath);
      return info.isLoaded;
    } catch (error) {
      console.warn(`Failed to load workspace ${workspacePath}:`, error);
      return false;
    }
  }

  /**
   * Check if Roslyn sidecar is available
   */
  isRoslynAvailable(): boolean {
    return this.sidecarAvailable === true;
  }

  /**
   * Get parser status
   */
  getStatus(): { roslyn: boolean; treeSitter: boolean; fallback: boolean } {
    return {
      roslyn: this.sidecarAvailable === true,
      treeSitter: true, // Tree-sitter is always available as base class
      fallback: this.config.enableFallback
    };
  }

  /**
   * Override detectRelationships to add semantic data flow analysis (PRIMARY PARSER)
   */
  async detectRelationships(components: IComponent[], content: string): Promise<IRelationship[]> {
    // Get base Tree-sitter relationships first
    const baseRelationships = await super.detectRelationships(components, content);

    // Add semantic data flow analysis
    try {
      const { DataFlowAnalyzer } = await import('../../analysis/DataFlowAnalyzer.js');
      const analyzer = new DataFlowAnalyzer();
      const semanticRelationships: IRelationship[] = [];

      for (const component of components) {
        const type = String(component.type).toLowerCase();

        if (type.includes('function') || type.includes('method')) {
          analyzer.startContext(component.id);

          // Track parameters
          const params = component.metadata?.parameters;
          if (Array.isArray(params)) {
            params.forEach((param: any, index: number) => {
              analyzer.trackParameter(param.name, index, component.id);
            });
          }

          analyzer.endContext();
          const flowRels = analyzer.getRelationships();
          semanticRelationships.push(...flowRels);
          analyzer.clear();
        }
      }

      return [...baseRelationships, ...semanticRelationships];
    } catch (error) {
      console.warn('DataFlowAnalyzer failed for C#:', error);
      return baseRelationships;
    }
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.sidecarService) {
      await this.sidecarService.stop();
      this.sidecarService = null;
    }

    this.resultCache.clear();
    this.sidecarAvailable = null;
  }
}
