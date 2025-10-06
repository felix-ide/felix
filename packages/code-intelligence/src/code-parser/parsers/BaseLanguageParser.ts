/**
 * Base Language Parser - Abstract base class for all language parsers
 */

import { readFileSync, existsSync } from 'fs';
import { extname, basename } from 'path';
import { 
  ILanguageParser, 
  ParseResult, 
  ParseError, 
  ParseWarning, 
  ParserOptions, 
  ProgressCallback,
  LanguageBoundary 
} from '../interfaces/ILanguageParser.js';
import { IComponent, IRelationship, Location, ComponentType, RelationshipType } from '../types.js';

/**
 * Abstract base class providing common parsing functionality
 */
/**
 * Context for tracking hierarchical component relationships during parsing
 */
export interface ParseContext {
  componentStack: IComponent[];  // Stack of parent components
  idPrefix: string[];  // Stack of ID prefixes for hierarchical IDs
}

export abstract class BaseLanguageParser implements ILanguageParser {
  protected readonly _language: string;
  protected readonly _extensions: string[];
  protected delegateParsers: Map<string, ILanguageParser> = new Map();
  protected context: ParseContext = {
    componentStack: [],
    idPrefix: []
  };

  constructor(language: string, extensions: string[]) {
    this._language = language;
    this._extensions = extensions;
  }

  /**
   * Get the language this parser supports
   */
  get language(): string {
    return this._language;
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return [...this._extensions];
  }

  /**
   * Get language-specific ignore patterns for file watching and indexing
   * Override this method in specific parsers to provide custom patterns
   */
  getIgnorePatterns(): string[] {
    return this.getBaseIgnorePatterns();
  }

  /**
   * Get base ignore patterns common to all languages
   */
  protected getBaseIgnorePatterns(): string[] {
    return [
      // Version control
      '**/.git/**',
      '**/.git',
      '**/.gitignore',
      '**/.gitkeep',
      
      // IDE and system files
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/.history/**',
      '**/.history',
      '**/.idea/**',
      '**/.idea',
      '**/.vscode/**',
      '**/.vscode',
      
      // Database files
      '**/*.db',
      '**/*.db-shm',
      '**/*.db-wal',
      '**/*.db-journal',
      '**/*.sqlite',
      '**/*.sqlite3',
      
      // Vector database files
      '**/*.chroma/**',
      '**/*.chroma',
      
      // Archive files
      '**/*.zip',
      '**/*.tar',
      '**/*.gz',
      '**/*.rar',
      '**/*.7z',
      '**/*.bz2',
      '**/*.xz',
      
      // Image files
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.svg',
      '**/*.ico',
      '**/*.webp',
      '**/*.bmp',
      '**/*.tiff',
      
      // Font files
      '**/*.woff',
      '**/*.woff2',
      '**/*.ttf',
      '**/*.eot',
      '**/*.otf',
      
      // Media files
      '**/*.mp3',
      '**/*.mp4',
      '**/*.avi',
      '**/*.mov',
      '**/*.wav',
      '**/*.flac',
      
      // General cache and temp
      '**/.cache/**',
      '**/.cache',
      '**/tmp/**',
      '**/tmp',
      '**/temp/**',
      '**/temp',
      '**/logs/**',
      '**/logs'
    ];
  }

  /**
   * Check if this parser can handle the given file
   */
  canParseFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return this._extensions.includes(ext);
  }

  /**
   * Parse a file and extract components and relationships
   */
  async parseFile(filePath: string, options: ParserOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    
    try {
      // Validate file exists
      if (!existsSync(filePath)) {
        return this.createErrorResult(filePath, `File not found: ${filePath}`);
      }

      // Read file content
      const content = this.readFileContent(filePath);
      
      // Report progress
      this.reportProgress(options.progressCallback, {
        current: 0,
        total: 100,
        message: 'Reading file',
        filePath
      });

      // Parse content
      const result = await this.parseContent(content, filePath, options);
      
      // Update metadata
      if (result.metadata) result.metadata.parseTime = Date.now() - startTime;
      
      return result;
    } catch (error) {
      return this.createErrorResult(filePath, `Parse failed: ${error}`);
    }
  }

  /**
   * Parse content directly (for in-memory parsing)
   */
  async parseContent(content: string, filePath: string, options: ParserOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];

    try {
      // Report progress
      this.reportProgress(options.progressCallback, {
        current: 10,
        total: 100,
        message: 'Parsing content',
        filePath
      });

      // Validate syntax first (await if async)
      const syntaxResult = this.validateSyntax(content);
      const syntaxErrors = syntaxResult instanceof Promise ? await syntaxResult : syntaxResult;
      errors.push(...syntaxErrors);

      // TEMPORARY FIX: Don't fail on syntax errors for tree-sitter parsers
      // They sometimes report false positives on valid TypeScript
      // If there are syntax errors, return early
      if (syntaxErrors.length > 0 && !this.constructor.name.includes('TreeSitter')) {
        return {
          components: [],
          relationships: [],
          errors,
          warnings,
          metadata: {
            filePath,
            language: this._language,
            parseTime: Date.now() - startTime,
            componentCount: 0,
            relationshipCount: 0
          }
        };
      }

      // Report progress
      this.reportProgress(options.progressCallback, {
        current: 30,
        total: 100,
        message: 'Extracting components',
        filePath
      });

      // Parse own content first
      const result = await this.parseOwnContent(content, filePath, options);

      // If delegation is disabled, return result
      if (!options.enableDelegation || this.delegateParsers.size === 0) {
        if (result.metadata) result.metadata.parseTime = Date.now() - startTime;
        return result;
      }

      // Detect language boundaries for delegation
      const boundaries = this.detectLanguageBoundaries(content, filePath);
      
      // Group boundaries by language for better delegation
      const boundariesByLanguage = new Map<string, LanguageBoundary[]>();
      for (const boundary of boundaries) {
        if (boundary.language !== this.language) {
          if (!boundariesByLanguage.has(boundary.language)) {
            boundariesByLanguage.set(boundary.language, []);
          }
          boundariesByLanguage.get(boundary.language)!.push(boundary);
        }
      }
      
      // Delegate to other parsers for embedded languages
      for (const [language, languageBoundaries] of boundariesByLanguage) {
        const delegate = this.delegateParsers.get(language);
        if (delegate) {
          // For HTML in PHP, reconstruct complete content
          if (language === 'html' && this.language === 'php' && languageBoundaries.length > 1) {
            const reconstructedHtml = this.reconstructHtmlFromFragments(content, languageBoundaries);
            const embeddedResult = await delegate.parseContent(
              reconstructedHtml.content,
              filePath,
              {
                ...options,
                isEmbedded: true,
                parentLanguage: this.language,
                parentScope: 'mixed.html.php'
              }
            );
            
            // Filter out generic embedded_code components before merging
            const filteredResult = {
              ...embeddedResult,
              components: embeddedResult.components.filter(c => {
                // Keep all non-embedded_code components
                if (c.type !== ComponentType.EMBEDDED_CODE) return true;
                // For embedded_code, only keep if it has a meaningful name
                if (c.name === filePath || c.name === 'mixed.php' || c.name === 'test.php') return false;
                return true;
              })
            };
            
            // Merge results with fragment mapping
            this.mergeReconstructedResults(result, filteredResult, reconstructedHtml.mapping, filePath);
          } else {
            // Regular single-boundary delegation
            for (const boundary of languageBoundaries) {
              const embeddedContent = this.extractContentFromBoundary(content, boundary);
              const embeddedResult = await delegate.parseContent(
                embeddedContent,
                filePath,
                {
                  ...options,
                  isEmbedded: true,
                  parentLanguage: this.language,
                  parentScope: boundary.scope,
                  offsetLine: boundary.startLine,
                  offsetColumn: boundary.startColumn
                }
              );
              
              // Merge results with proper offsets and relationships
              this.mergeEmbeddedResults(result, embeddedResult, boundary, filePath);
            }
          }
        }
      }

      // Report progress
      this.reportProgress(options.progressCallback, {
        current: 100,
        total: 100,
        message: 'Parse complete',
        filePath
      });

      if (result.metadata) result.metadata.parseTime = Date.now() - startTime;
      return result;
    } catch (error) {
      errors.push({
        message: `Parse error: ${error}`,
        severity: 'error',
        source: 'parser'
      });

      return {
        components: [],
        relationships: [],
        errors,
        warnings,
        metadata: {
          filePath,
          language: this._language,
          parseTime: Date.now() - startTime,
          componentCount: 0,
          relationshipCount: 0
        }
      };
    }
  }

  /**
   * Parse own content without delegation
   */
  protected async parseOwnContent(content: string, filePath: string, options: ParserOptions = {}): Promise<ParseResult> {
    // Extract components (await if async)
    const componentsResult = this.detectComponents(content, filePath);
    const components = componentsResult instanceof Promise ? await componentsResult : componentsResult;

    // Extract relationships (await if async)
    const relationshipsResult = this.detectRelationships(components, content);
    const relationships = relationshipsResult instanceof Promise ? await relationshipsResult : relationshipsResult;

    // Set capability flags and backend metadata on components
    const componentsWithMetadata = this.setCapabilityMetadata(components);
    const relationshipsWithMetadata = this.setRelationshipMetadata(relationships);

    // Determine parsing level and capabilities
    const capabilities = this.getCapabilities();
    const parsingLevel = this.getParsingLevel();
    const backend = this.getBackend();

    return {
      components: componentsWithMetadata,
      relationships: relationshipsWithMetadata,
      errors: [],
      warnings: [],
      metadata: {
        filePath,
        language: this._language,
        parseTime: 0,
        componentCount: componentsWithMetadata.length,
        relationshipCount: relationshipsWithMetadata.length,
        parsingLevel,
        capabilities,
        backend
      }
    };
  }

  /**
   * Set capability metadata on components
   */
  protected setCapabilityMetadata(components: IComponent[]): IComponent[] {
    const capabilities = this.getCapabilities();
    const parsingLevel = this.getParsingLevel();
    const backend = this.getBackend();

    return components.map(component => ({
      ...component,
      metadata: {
        ...component.metadata,
        parsingLevel,
        capabilities,
        backend
      }
    }));
  }

  /**
   * Set metadata on relationships including confidence and provenance
   */
  protected setRelationshipMetadata(relationships: IRelationship[]): IRelationship[] {
    const backend = this.getBackend();
    const parsingLevel = this.getParsingLevel();

    return relationships.map(relationship => ({
      ...relationship,
      metadata: {
        ...relationship.metadata,
        confidence: relationship.metadata.confidence || this.getDefaultConfidence(),
        provenance: {
          source: parsingLevel,
          parser: this._language,
          backend,
          timestamp: Date.now()
        }
      }
    }));
  }

  /**
   * Get the capabilities for this parser
   * Override in subclasses to specify actual capabilities
   */
  protected getCapabilities(): { symbols?: boolean; relationships?: boolean; ranges?: boolean; types?: boolean; controlFlow?: boolean; incremental?: boolean; } {
    return {
      symbols: true,
      relationships: true,
      ranges: true,
      types: false,
      controlFlow: false,
      incremental: false
    };
  }

  /**
   * Get the parsing level for this parser
   * Override in subclasses to specify actual parsing level
   */
  protected getParsingLevel(): 'semantic' | 'structural' | 'basic' {
    return 'basic';
  }

  /**
   * Get the backend for this parser
   * Override in subclasses to specify actual backend
   */
  protected getBackend(): 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid' {
    return 'detectors-only';
  }

  /**
   * Get the default confidence for relationships from this parser
   * Override in subclasses to specify parser-specific confidence
   */
  protected getDefaultConfidence(): number {
    return 0.7;
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  abstract detectComponents(content: string, filePath: string): IComponent[] | Promise<IComponent[]>;
  abstract detectRelationships(components: IComponent[], content: string): IRelationship[] | Promise<IRelationship[]>;
  abstract validateSyntax(content: string): ParseError[] | Promise<ParseError[]>;

  // Enhanced extraction methods - default implementations
  extractModuleComponents(content: string, filePath: string): IComponent[] {
    return [this.createFileComponent(filePath, content)];
  }

  extractVariableComponents(content: string, filePath: string): IComponent[] {
    return [];
  }

  extractConstructorComponents(content: string, filePath: string): IComponent[] {
    return [];
  }

  extractAccessorComponents(content: string, filePath: string): IComponent[] {
    return [];
  }

  extractPropertyAssignments(content: string, filePath: string): IComponent[] {
    return [];
  }

  extractUsageRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    try {
      const callers = components.filter(c => c.type === ComponentType.METHOD || c.type === ComponentType.FUNCTION);
      const callees = components.filter(c => c.type === ComponentType.METHOD || c.type === ComponentType.FUNCTION);
      if (callers.length === 0 || callees.length === 0) return relationships;

      const lines = content.split('\n');
      const getSlice = (c: IComponent): string => {
        if ((c as any).code && typeof (c as any).code === 'string') return (c as any).code as string;
        if (c.location) return lines.slice(Math.max(0, c.location.startLine - 1), Math.max(c.location.endLine, c.location.startLine)).join('\n');
        return content;
      };

      const word = (name: string) => new RegExp(`(^|[^A-Za-z0-9_])${name}\s*\(`);

      for (const caller of callers) {
        const src = getSlice(caller);
        const seen = new Set<string>();
        for (const callee of callees) {
          if (callee.id === caller.id) continue; // skip self
          const n = (callee.name || '').toString();
          if (n.length < 2) continue;
          if (!word(n).test(src)) continue;
          const id = `${caller.id}-calls-${callee.id}`;
          if (seen.has(id)) continue;
          seen.add(id);
          relationships.push({
            id,
            type: 'calls' as any,
            sourceId: caller.id,
            targetId: callee.id,
            metadata: { detection: 'generic', confidence: 0.5 }
          });
        }
      }
    } catch {}
    return relationships;
  }

  extractInheritanceRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    try {
      const lines = content.split('\n');
      const getHeader = (c: IComponent): string => {
        if (!c.location) return '';
        const start = Math.max(0, c.location.startLine - 1);
        return lines.slice(start, Math.min(lines.length, start + 4)).join(' ');
      };
      const classes = components.filter(c => c.type === ComponentType.CLASS || c.type === ComponentType.INTERFACE);
      const nameIndex = new Map<string, IComponent[]>();
      for (const c of classes) {
        const key = (c.name || '').toString();
        if (!key) continue;
        const arr = nameIndex.get(key) || [];
        arr.push(c); nameIndex.set(key, arr);
      }
      const link = (child: IComponent, parentName: string, kind: 'extends'|'implements') => {
        const local = (nameIndex.get(parentName) || [])[0];
        const targetId = local ? local.id : `RESOLVE:${parentName}`;
        relationships.push({
          id: `${child.id}-${kind}-${targetId}`,
          type: kind as any,
          sourceId: child.id,
          targetId,
          metadata: local ? { detection: 'header' } : { detection: 'header', needsResolution: true, parentName }
        });
      };
      for (const c of classes) {
        const header = getHeader(c);
        if (!header) continue;
        // JS/TS/Java-like
        let m = header.match(/class\s+([A-Za-z0-9_$.]+)/);
        if (m) {
          const ext = header.match(/extends\s+([A-Za-z0-9_$.]+)/);
          if (ext) link(c, ext[1]!.replace(/[$.]/g, '.'), 'extends');
          const impl = header.match(/implements\s+([A-Za-z0-9_$. ,]+)/);
          if (impl) impl[1]!.split(',').map(s=>s.trim()).filter(Boolean).forEach(n => link(c, n.replace(/[$.]/g, '.'), 'implements'));
        }
        // Python
        m = header.match(/class\s+([A-Za-z0-9_]+)\s*\(([^)]+)\)\s*:/);
        if (m) {
          m[2]!.split(',').map(s=>s.trim()).filter(Boolean).forEach(n => link(c, n, 'extends'));
        }
        // PHP
        m = header.match(/class\s+([A-Za-z0-9_\\]+)\s+extends\s+([A-Za-z0-9_\\]+)/);
        if (m) link(c, m[2]!.replace(/\\/g,'\\\\'), 'extends');
        const phpImpl = header.match(/implements\s+([A-Za-z0-9_\\ ,]+)/);
        if (phpImpl) phpImpl[1]!.split(',').map(s=>s.trim()).filter(Boolean).forEach(n => link(c, n.replace(/\\/g,'\\\\'), 'implements'));
      }
    } catch {}
    return relationships;
  }

  extractImportExportRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) return relationships;

    const push = (type: string, modulePath: string, meta: Record<string, any>) => {
      if (!modulePath) return;
      const rel: IRelationship = {
        id: `${fileComponent.id}-${type}-${modulePath}`,
        type: type as any,
        sourceId: fileComponent.id,
        targetId: `RESOLVE:${modulePath}`,
        metadata: { needsResolution: true, modulePath, ...meta }
      };
      relationships.push(rel);
    };

    const lines = content.split('\n');
    for (const raw of lines) {
      const line = raw.trim();
      // JS/TS: import x from 'module'; import * as x from "module";
      let m = line.match(/^import\s+[^;]+\s+from\s+['"]([^'"]+)['"];?/);
      if (m) { push('imports', m[1]!, { syntax: 'es_import' }); continue; }
      m = line.match(/^import\s+['"]([^'"]+)['"];?/);
      if (m) { push('imports', m[1]!, { syntax: 'es_side_effect' }); continue; }
      m = line.match(/^const\s+\w+\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/);
      if (m) { push('imports', m[1]!, { syntax: 'cjs_require' }); continue; }

      // Python: from module import x; import module.sub
      m = line.match(/^from\s+([\w\.]+)\s+import\s+/);
      if (m) { push('imports', m[1]!.replace(/\./g,'/'), { syntax: 'py_from_import' }); continue; }
      m = line.match(/^import\s+([\w\.]+)/);
      if (m) { push('imports', m[1]!.replace(/\./g,'/'), { syntax: 'py_import' }); continue; }

      // Java: import com.example.Class;
      m = line.match(/^import\s+([\w\.]+);/);
      if (m) { push('imports', m[1]!.replace(/\./g,'/'), { syntax: 'java_import' }); continue; }

      // PHP: use Namespace\\Class; require/include
      m = line.match(/^use\s+([\\\w]+);/);
      if (m) { push('imports', m[1]!.replace(/\\/g,'/'), { syntax: 'php_use' }); continue; }
      m = line.match(/^(require|include)(_once)?\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?/);
      if (m) { push('imports', m[3]!, { syntax: 'php_require' }); continue; }

      // C-like includes
      m = line.match(/^#\s*include\s+[<"]([^>"]+)[>"]/);
      if (m) { push('imports', m[1]!, { syntax: 'c_include' }); continue; }
    }

    return relationships;
  }

  extractContainmentRelationships(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) return relationships;

    // Create smart structural containment relationships
    const smartRelationships = this.extractSmartContainmentRelationships(components);
    relationships.push(...smartRelationships);

    // Create file-contains-component relationships for top-level components only
    const topLevelComponents = this.getTopLevelComponents(components, smartRelationships);
    topLevelComponents.forEach(component => {
      if (component.type !== ComponentType.FILE) {
        relationships.push({
          id: `${fileComponent.id}-contains-${component.id}`,
          type: RelationshipType.CONTAINS,
          sourceId: fileComponent.id,
          targetId: component.id,
          metadata: {
            relationship: 'file-contains-component',
            componentType: component.type,
            componentName: component.name
          }
        });
      }
    });

    return relationships;
  }

  /**
   * Extract smart containment relationships by analyzing component ID patterns
   * Creates class-contains-method, interface-contains-method, namespace-contains-component relationships
   */
  protected extractSmartContainmentRelationships(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    // Group components by their parent identifier from ID pattern AND by proximity
    const componentsByParent = new Map<string, IComponent[]>();
    const componentById = new Map<string, IComponent>();
    
    // Build lookup maps
    components.forEach(component => {
      componentById.set(component.id, component);
      
      // Parse component ID to find parent-child relationships
      // Expected format: "ParentName:type:childName" or "FileName:type:componentName"
      const idParts = component.id.split(':');
      if (idParts.length >= 3) {
        const potentialParentName = idParts[0];
        const componentType = idParts[1];
        
        // Skip file components as parents (they're handled separately)
        if (potentialParentName && componentType && componentType !== 'file') {
          if (!componentsByParent.has(potentialParentName)) {
            componentsByParent.set(potentialParentName, []);
          }
          componentsByParent.get(potentialParentName)!.push(component);
        }
      }
    });
    
    // ADDITIONAL: Find class-member relationships by proximity analysis
    // This handles cases where IDs follow "filename:type:name" pattern
    this.extractProximityBasedContainmentRelationships(components, relationships);
    
    // Create containment relationships
    componentsByParent.forEach((children, parentName) => {
      // Find the parent component
      const parentComponent = this.findParentComponent(parentName, children, componentById);
      
      if (parentComponent) {
        children.forEach(child => {
          // Don't create self-relationships
          if (child.id === parentComponent.id) return;
          
          // Determine relationship type based on parent and child types
          const relationshipType = this.determineContainmentRelationshipType(parentComponent, child);
          
          if (relationshipType) {
            relationships.push({
              id: `${parentComponent.id}-contains-${child.id}`,
              type: relationshipType as any, // Use specific relationship type
              sourceId: parentComponent.id,
              targetId: child.id,
              metadata: {
                baseType: RelationshipType.CONTAINS, // Store the base type for compatibility
                parentType: parentComponent.type,
                childType: child.type,
                parentName: parentComponent.name,
                childName: child.name
              }
            });
          }
        });
      }
    });
    
    return relationships;
  }

  /**
   * Extract containment relationships by analyzing component proximity and line positions
   * This handles parsers that create IDs like "filename:type:name" instead of "ClassName:type:name"
   */
  protected extractProximityBasedContainmentRelationships(components: IComponent[], relationships: IRelationship[]): void {
    // Find all classes and interfaces that could be containers
    const containers = components.filter(c => 
      c.type === ComponentType.CLASS || 
      c.type === ComponentType.INTERFACE ||
      c.type === ComponentType.ENUM ||
      c.type === 'namespace' ||
      c.type === 'module'
    );
    
    // Find all potential members (methods, properties, constructors)
    const members = components.filter(c => 
      c.type === ComponentType.METHOD || 
      c.type === ComponentType.PROPERTY ||
      c.type === ComponentType.CONSTRUCTOR ||
      c.type === ComponentType.ACCESSOR
    );

    
    // For each member, find the container it belongs to based on line position
    members.forEach(member => {
      // Find the container that this member is inside of
      const container = this.findContainerByProximity(member, containers);
      
      
      if (container) {
        // Determine the specific relationship type
        const relationshipType = this.determineContainmentRelationshipType(container, member);
        
        
        if (relationshipType) {
          relationships.push({
            id: `${container.id}-contains-${member.id}`,
            type: relationshipType as any, // Use specific relationship type
            sourceId: container.id,
            targetId: member.id,
            metadata: {
              baseType: 'contains',
              parentType: container.type,
              childType: member.type,
              parentName: container.name,
              childName: member.name,
              detectionMethod: 'proximity'
            }
          });
        }
      }
    });
  }

  /**
   * Find the container (class/interface) that a member belongs to based on line positions
   */
  protected findContainerByProximity(member: IComponent, containers: IComponent[]): IComponent | null {
    // Find containers that the member is inside of (by line numbers)
    const candidateContainers = containers.filter(container => {
      return member.location.startLine >= container.location.startLine &&
             member.location.endLine <= container.location.endLine;
    });
    
    // If multiple candidates, choose the most specific (smallest range)
    if (candidateContainers.length > 0) {
      return candidateContainers.reduce((smallest, current) => {
        const smallestRange = smallest.location.endLine - smallest.location.startLine;
        const currentRange = current.location.endLine - current.location.startLine;
        return currentRange < smallestRange ? current : smallest;
      });
    }
    
    return null;
  }

  /**
   * Find the parent component for a given parent name and children
   */
  protected findParentComponent(
    parentName: string, 
    children: IComponent[], 
    componentById: Map<string, IComponent>
  ): IComponent | null {
    // Look for exact parent component match
    for (const [id, component] of componentById) {
      if (component.name === parentName && 
          (component.type === ComponentType.CLASS || 
           component.type === ComponentType.INTERFACE ||
           component.type === ComponentType.ENUM ||
           component.type === 'namespace' ||
           component.type === 'module')) {
        return component;
      }
    }
    
    // If no exact match, look for a component that could be the parent
    // based on the naming patterns in the children
    const sampleChild = children[0];
    if (sampleChild) {
      const childIdParts = sampleChild.id.split(':');
      if (childIdParts.length >= 3) {
        const potentialParentId = `${childIdParts[0]}:class:${parentName}`;
        const parentComponent = componentById.get(potentialParentId);
        if (parentComponent) return parentComponent;
        
        // Try interface
        const potentialInterfaceId = `${childIdParts[0]}:interface:${parentName}`;
        const interfaceComponent = componentById.get(potentialInterfaceId);
        if (interfaceComponent) return interfaceComponent;
      }
    }
    
    return null;
  }

  /**
   * Determine the type of containment relationship between parent and child
   */
  protected determineContainmentRelationshipType(parent: IComponent, child: IComponent): string | null {
    const parentType = parent.type;
    const childType = child.type;
    
    // Class relationships
    if (parentType === ComponentType.CLASS) {
      switch (childType) {
        case ComponentType.METHOD:
        case 'constructor':
          return 'class-contains-method';
        case ComponentType.PROPERTY:
          return 'class-contains-property';
        case ComponentType.CLASS:
          return 'class-contains-inner-class';
        default:
          return 'class-contains-member';
      }
    }
    
    // Interface relationships  
    if (parentType === ComponentType.INTERFACE) {
      switch (childType) {
        case ComponentType.METHOD:
          return 'interface-contains-method';
        case ComponentType.PROPERTY:
          return 'interface-contains-property';
        default:
          return 'interface-contains-member';
      }
    }
    
    // Enum relationships
    if (parentType === ComponentType.ENUM) {
      return 'enum-contains-value';
    }
    
    // Namespace/Module relationships
    if (parentType === 'namespace' || parentType === 'module') {
      switch (childType) {
        case ComponentType.CLASS:
          return 'namespace-contains-class';
        case ComponentType.INTERFACE:
          return 'namespace-contains-interface';
        case ComponentType.FUNCTION:
          return 'namespace-contains-function';
        default:
          return 'namespace-contains-component';
      }
    }
    
    return null;
  }

  /**
   * Get top-level components that aren't contained by other components
   */
  protected getTopLevelComponents(components: IComponent[], smartRelationships: IRelationship[]): IComponent[] {
    const containedComponentIds = new Set(
      smartRelationships.map(rel => rel.targetId)
    );
    
    return components.filter(component => 
      !containedComponentIds.has(component.id)
    );
  }

  detectFrameworkComponents(content: string, filePath: string): IComponent[] {
    return [];
  }

  inferTypeFromExpression(expression: string): string {
    // Basic type inference
    if (/^\d+$/.test(expression)) return 'number';
    if (/^(true|false)$/.test(expression)) return 'boolean';
    if (/^['"`].*['"`]$/.test(expression)) return 'string';
    if (/^\[.*\]$/.test(expression)) return 'array';
    if (/^\{.*\}$/.test(expression)) return 'object';
    return 'unknown';
  }


  protected createFileComponent(filePath: string, content: string): IComponent {
    const fileName = filePath.split('/').pop() || filePath;
    return {
      id: this.generateComponentId(filePath, fileName, ComponentType.FILE),
      name: fileName,
      type: ComponentType.FILE,
      language: this._language,
      filePath,
      location: { startLine: 1, endLine: content.split('\n').length, startColumn: 0, endColumn: 0 },
      code: content.length > 5000 ? content.substring(0, 5000) + '\n// ... truncated ...' : content,
      metadata: {
        size: content.length,
        lines: content.split('\n').length,
        extension: filePath.split('.').pop() || '',
        isModule: /\b(?:import|export|module\.exports|exports\.)\b/.test(content)
      }
    };
  }

  /**
   * Read file content safely
   */
  protected readFileContent(filePath: string): string {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * Extract source code from content by line range
   */
  protected extractSourceCodeByRange(content: string, startLine: number, endLine: number): string {
    const lines = content.split('\n');
    const extractedLines = lines.slice(startLine - 1, endLine);
    // No truncation - return full source code
    return extractedLines.join('\n');
  }

  /**
   * Generate a unique component ID with full hierarchical context
   * This ensures uniqueness even for local variables with the same name
   */
  protected generateComponentId(filePath: string, name: string, type: string): string {
    const fileName = basename(filePath, extname(filePath));

    // Build hierarchical ID from context stack
    const idParts = [fileName];

    // Add all parent contexts to create a unique path
    if (this.context.idPrefix.length > 0) {
      idParts.push(...this.context.idPrefix);
    }

    // Add the component's type and name
    idParts.push(`${type}:${name}`);

    const finalId = idParts.join('|');

    // Debug logging for malformed IDs
    if (finalId.includes(':helpers|')) {
      console.error('[MALFORMED ID DETECTED]');
      console.error('  filePath:', filePath);
      console.error('  fileName:', fileName);
      console.error('  name:', name);
      console.error('  type:', type);
      console.error('  context.idPrefix:', this.context.idPrefix);
      console.error('  idParts:', idParts);
      console.error('  finalId:', finalId);
      console.error('  Stack trace:', new Error().stack);
    }

    // Join with pipe separator for readability
    return finalId;
  }

  /**
   * Push a component onto the context stack when entering its scope
   */
  protected pushContext(component: IComponent): void {
    this.context.componentStack.push(component);
    this.context.idPrefix.push(`${component.type}:${component.name}`);
  }

  /**
   * Pop a component from the context stack when leaving its scope
   */
  protected popContext(): void {
    this.context.componentStack.pop();
    this.context.idPrefix.pop();
  }

  /**
   * Get the current parent component ID if any
   */
  protected getCurrentParentId(): string | undefined {
    const parent = this.context.componentStack[this.context.componentStack.length - 1];
    return parent?.id;
  }

  /**
   * Clear the context (should be called at the start of each file parse)
   */
  protected clearContext(): void {
    this.context.componentStack = [];
    this.context.idPrefix = [];
  }

  /**
   * Generate a unique relationship ID
   */
  protected generateRelationshipId(sourceId: string, targetId: string, type: string): string {
    return `${sourceId}-${type}-${targetId}`;
  }

  /**
   * Create a location object
   */
  protected createLocation(startLine: number, endLine: number, startColumn = 0, endColumn = 0): Location {
    return {
      startLine,
      endLine,
      startColumn,
      endColumn
    };
  }

  /**
   * Create an error result for failed parsing
   */
  protected createErrorResult(filePath: string, message: string): ParseResult {
    return {
      components: [],
      relationships: [],
      errors: [{
        message,
        severity: 'error',
        source: 'parser'
      }],
      warnings: [],
      metadata: {
        filePath,
        language: this._language,
        parseTime: 0,
        componentCount: 0,
        relationshipCount: 0
      }
    };
  }

  /**
   * Create a parse error
   */
  protected createParseError(
    message: string, 
    location?: Location, 
    code?: string,
    severity: 'error' | 'warning' = 'error'
  ): ParseError {
    const error: ParseError = {
      message,
      severity,
      source: this._language
    };
    if (location) error.location = location;
    if (code) error.code = code;
    return error;
  }

  /**
   * Create a parse warning
   */
  protected createParseWarning(
    message: string, 
    location?: Location, 
    code?: string
  ): ParseWarning {
    const warning: ParseWarning = {
      message,
      source: this._language
    };
    if (location) warning.location = location;
    if (code) warning.code = code;
    return warning;
  }

  /**
   * Report progress via callback
   */
  protected reportProgress(
    callback: ProgressCallback | undefined, 
    progress: { current: number; total: number; message: string; filePath?: string }
  ): void {
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Extract documentation comments from content
   */
  public extractDocumentation(content: string, startLine: number): string | undefined {
    const lines = content.split('\n');
    const docs: string[] = [];
    
    // Look for comments before the component
    for (let i = startLine - 2; i >= 0; i--) {
      const line = lines[i];
      if (!line) continue;
      const trimmedLine = line.trim();
      
      // JSDoc style comments
      if (trimmedLine.startsWith('/**') || trimmedLine.includes('/**')) {
        for (let j = i; j < startLine && j < lines.length; j++) {
          const docLine = lines[j];
          if (!docLine) continue;
          const trimmedDocLine = docLine.trim();
          if (trimmedDocLine.includes('*/')) break;
          docs.unshift(trimmedDocLine.replace(/^\/\*\*?/, '').replace(/\*\/$/, '').replace(/^\*/, '').trim());
        }
        break;
      }
      
      // Single line comments
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
        docs.unshift(trimmedLine.replace(/^\/\/|^#/, '').trim());
      } else if (trimmedLine.length > 0) {
        // Stop if we hit non-comment content
        break;
      }
    }
    
    return docs.length > 0 ? docs.join('\n').trim() : undefined;
  }

  /**
   * Check if a name is exported (basic heuristic)
   */
  protected isExported(content: string, name: string): boolean {
    const exportPatterns = [
      new RegExp(`export\\s+.*\\b${name}\\b`),
      new RegExp(`export\\s*{[^}]*\\b${name}\\b[^}]*}`),
      new RegExp(`module\\.exports\\s*=.*\\b${name}\\b`),
      new RegExp(`exports\\.${name}\\s*=`)
    ];
    
    return exportPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Extract imports from content (basic implementation)
   */
  protected extractImports(content: string): Array<{ name: string; from: string; line: number }> {
    const imports: Array<{ name: string; from: string; line: number }> = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // ES6 imports
      const es6Match = line.match(/import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/);
      if (es6Match && es6Match[1]) {
        imports.push({
          name: es6Match[0],
          from: es6Match[1],
          line: index + 1
        });
      }
      
      // CommonJS require
      const cjsMatch = line.match(/(?:const|let|var)\s+(?:{[^}]+}|\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (cjsMatch && cjsMatch[1]) {
        imports.push({
          name: cjsMatch[0],
          from: cjsMatch[1],
          line: index + 1
        });
      }
    });
    
    return imports;
  }

  /**
   * Default content validation - subclasses should override
   */
  validateContent(content: string): boolean {
    // By default, accept any content
    return true;
  }

  /**
   * Default language boundary detection - subclasses should override
   */
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[] {
    // By default, the entire file is in this language
    const lines = content.split('\n');
    return [{
      language: this.language,
      startLine: 1,
      startColumn: 0,
      endLine: lines.length,
      endColumn: lines[lines.length - 1]?.length || 0,
      scope: `source.${this.language}`
    }];
  }

  /**
   * Register a delegate parser for embedded languages
   */
  registerDelegate(language: string, parser: ILanguageParser): void {
    this.delegateParsers.set(language, parser);
  }

  /**
   * Extract content from a language boundary
   */
  protected extractContentFromBoundary(content: string, boundary: LanguageBoundary): string {
    const lines = content.split('\n');
    const boundaryLines = lines.slice(boundary.startLine - 1, boundary.endLine);
    
    if (boundaryLines.length === 1 && boundaryLines[0]) {
      // Single line - extract by column
      return boundaryLines[0].substring(boundary.startColumn, boundary.endColumn);
    } else if (boundaryLines.length > 1) {
      // Multi-line
      if (boundaryLines[0]) {
        boundaryLines[0] = boundaryLines[0].substring(boundary.startColumn);
      }
      const lastLine = boundaryLines[boundaryLines.length - 1];
      if (lastLine) {
        boundaryLines[boundaryLines.length - 1] = lastLine.substring(0, boundary.endColumn);
      }
      return boundaryLines.join('\n');
    }
    
    return '';
  }

  /**
   * Merge embedded parse results with proper offsets and scope context
   */
  protected mergeEmbeddedResults(
    mainResult: ParseResult, 
    embeddedResult: ParseResult, 
    boundary: LanguageBoundary,
    filePath: string
  ): void {
    // Get the parent component for scope context
    const parentComponent = this.findParentComponentForBoundary(mainResult.components, boundary);
    
    // Adjust component positions and add scope context
    embeddedResult.components.forEach(component => {
      // Adjust line/column positions
      if (component.location) {
        component.location.startLine += boundary.startLine - 1;
        component.location.endLine += boundary.startLine - 1;
        if (component.location.startLine === boundary.startLine) {
          component.location.startColumn += boundary.startColumn;
        }
        if (component.location.endLine === boundary.startLine) {
          component.location.endColumn += boundary.startColumn;
        }
      }
      
      // Add scope context
      const componentChain: Array<{ id: string; name: string; type: ComponentType; language: string }> = [];
      
      // Add file component to chain
      const fileComponent = mainResult.components.find(c => c.type === ComponentType.FILE);
      if (fileComponent) {
        componentChain.push({
          id: fileComponent.id,
          name: fileComponent.name,
          type: fileComponent.type,
          language: fileComponent.language
        });
      }
      
      // Add parent component to chain
      if (parentComponent) {
        componentChain.push({
          id: parentComponent.id,
          name: parentComponent.name,
          type: parentComponent.type,
          language: parentComponent.language
        });
      }
      
      component.scopeContext = {
        scope: boundary.scope,
        languageStack: [this.language, boundary.language],
        componentChain,
        crossLanguageParent: parentComponent ? {
          id: parentComponent.id,
          name: parentComponent.name,
          language: parentComponent.language
        } : undefined,
        boundary: {
          startMarker: this.getStartMarker(boundary),
          endMarker: this.getEndMarker(boundary),
          isStringEmbedded: boundary.scope.includes('string.')
        }
      };
      
      // Update component type for embedded code
      if (component.type === ComponentType.FILE) {
        component.type = ComponentType.EMBEDDED_CODE;
      }
    });
    
    // Add embedded components to main result
    mainResult.components.push(...embeddedResult.components);
    
    // Create language boundary relationships
    if (parentComponent) {
      embeddedResult.components.forEach(embeddedComponent => {
        mainResult.relationships.push({
          id: this.generateRelationshipId(parentComponent.id, embeddedComponent.id, 'embedded_in_scope'),
          type: RelationshipType.EMBEDDED_IN_SCOPE,
          sourceId: embeddedComponent.id,
          targetId: parentComponent.id,
          metadata: {
            embeddedLanguage: boundary.language,
            parentLanguage: this.language,
            boundary: {
              startLine: boundary.startLine,
              endLine: boundary.endLine,
              scope: boundary.scope
            }
          }
        });
      });
    }
    
    // Add embedded relationships with adjusted positions
    embeddedResult.relationships.forEach(rel => {
      if (rel.location) {
        rel.location.startLine += boundary.startLine - 1;
        rel.location.endLine += boundary.startLine - 1;
      }
    });
    
    mainResult.relationships.push(...embeddedResult.relationships);
    
    // Merge errors and warnings
    mainResult.errors.push(...embeddedResult.errors);
    mainResult.warnings.push(...embeddedResult.warnings);
    
    // Update counts
    if (mainResult.metadata && embeddedResult.metadata) {
      mainResult.metadata.componentCount += embeddedResult.metadata.componentCount;
      mainResult.metadata.relationshipCount += embeddedResult.metadata.relationshipCount;
    }
  }

  /**
   * Find the parent component that contains a language boundary
   */
  protected findParentComponentForBoundary(components: IComponent[], boundary: LanguageBoundary): IComponent | undefined {
    // Find the most specific component that contains the boundary
    const candidates = components.filter(c => {
      return c.location.startLine <= boundary.startLine &&
             c.location.endLine >= boundary.endLine &&
             c.type !== ComponentType.FILE;
    });
    
    if (candidates.length === 0) return undefined;
    
    // Return the most specific (smallest) containing component
    return candidates.reduce((smallest, current) => {
      const smallestRange = smallest.location.endLine - smallest.location.startLine;
      const currentRange = current.location.endLine - current.location.startLine;
      return currentRange < smallestRange ? current : smallest;
    });
  }

  /**
   * Get start marker for a language boundary
   */
  protected getStartMarker(boundary: LanguageBoundary): string {
    // Subclasses can override for specific markers
    if (boundary.language === 'php') return '<?php';
    if (boundary.language === 'javascript' && boundary.scope.includes('script')) return '<script>';
    if (boundary.language === 'css' && boundary.scope.includes('style')) return '<style>';
    return '';
  }

  /**
   * Get end marker for a language boundary
   */
  protected getEndMarker(boundary: LanguageBoundary): string {
    // Subclasses can override for specific markers
    if (boundary.language === 'php') return '?>';
    if (boundary.language === 'javascript' && boundary.scope.includes('script')) return '</script>';
    if (boundary.language === 'css' && boundary.scope.includes('style')) return '</style>';
    return '';
  }

  /**
   * Reconstruct HTML content from fragments by merging boundaries and replacing PHP with placeholders
   */
  protected reconstructHtmlFromFragments(content: string, boundaries: LanguageBoundary[]): {
    content: string;
    mapping: Array<{ originalStart: number; originalEnd: number; reconstructedStart: number; reconstructedEnd: number }>;
  } {
    const lines = content.split('\n');
    const mapping: Array<{ originalStart: number; originalEnd: number; reconstructedStart: number; reconstructedEnd: number }> = [];
    let reconstructedContent = '';
    let reconstructedPosition = 0;
    
    // We need to process ALL boundaries (both HTML and PHP) to create proper reconstruction
    // Get all boundaries from PHP parser, not just HTML ones
    const allBoundaries = this.detectLanguageBoundaries(content, 'temp.php');
    
    // Sort boundaries by start position
    const sortedBoundaries = [...allBoundaries].sort((a, b) => {
      if (a.startLine !== b.startLine) {
        return a.startLine - b.startLine;
      }
      return a.startColumn - b.startColumn;
    });
    
    for (const boundary of sortedBoundaries) {
      // Convert line/column to absolute position
      const startPos = this.getAbsolutePosition(lines, boundary.startLine, boundary.startColumn);
      const endPos = this.getAbsolutePosition(lines, boundary.endLine, boundary.endColumn);
      
      // Extract boundary content
      const boundaryContent = content.substring(startPos, endPos);
      let processedContent = boundaryContent;
      
      if (boundary.language === 'php') {
        // Replace PHP content with a placeholder comment
        processedContent = `<!-- PHP_PLACEHOLDER -->`;
      }
      
      // Only add mapping for HTML boundaries
      if (boundary.language === 'html') {
        mapping.push({
          originalStart: startPos,
          originalEnd: endPos,
          reconstructedStart: reconstructedPosition,
          reconstructedEnd: reconstructedPosition + processedContent.length
        });
      }
      
      reconstructedContent += processedContent;
      reconstructedPosition += processedContent.length;
    }
    
    return {
      content: reconstructedContent,
      mapping
    };
  }

  /**
   * Merge results from reconstructed HTML parsing back to original positions
   */
  protected mergeReconstructedResults(
    mainResult: ParseResult,
    reconstructedResult: ParseResult,
    mapping: Array<{ originalStart: number; originalEnd: number; reconstructedStart: number; reconstructedEnd: number }>,
    filePath: string
  ): void {
    // We need the original content lines - try to get them from the file component's code if available
    let lines: string[] = [];
    const fileComponent = mainResult.components.find(c => c.type === ComponentType.FILE);
    if (fileComponent && fileComponent.code) {
      lines = fileComponent.code.split('\n');
    } else {
      // Fallback: try to read the file if it exists
      try {
        if (mainResult.metadata?.filePath && this.readFileContent) {
          lines = this.readFileContent(mainResult.metadata.filePath).split('\n');
        }
      } catch (error) {
        // If we can't read the file, we can't do position mapping
        return;
      }
    }
    
    if (lines.length === 0) {
      // If we can't get the content lines, we can't do position mapping
      return;
    }
    
    // Process components from reconstructed parsing
    reconstructedResult.components.forEach(component => {
      // Skip file components - we already have one
      if (component.type === ComponentType.FILE) {
        return;
      }
      
      // Map component position back to original content
      const mappedComponent = this.mapComponentToOriginalPosition(component, mapping, lines);
      if (mappedComponent) {
        // Only mark as embedded_code if it's a generic component
        // Keep specific types like variable, function, class, section, etc.
        if (mappedComponent.type === ComponentType.FILE) {
          mappedComponent.type = ComponentType.EMBEDDED_CODE;
        }
        
        // Add scope context
        mappedComponent.scopeContext = {
          scope: 'text.html.php',
          languageStack: [this.language, 'html'],
          componentChain: this.buildComponentChain(mainResult.components, mappedComponent),
          boundary: {
            startMarker: '?>',
            endMarker: '<?php',
            isStringEmbedded: false
          }
        };
        
        mainResult.components.push(mappedComponent);
      }
    });
    
    // Process relationships from reconstructed parsing
    reconstructedResult.relationships.forEach(relationship => {
      // Map relationship positions and add to main result
      const mappedRelationship = this.mapRelationshipToOriginalPosition(relationship, mapping, lines);
      if (mappedRelationship) {
        mainResult.relationships.push(mappedRelationship);
      }
    });
    
    // Update metadata
    if (mainResult.metadata) {
      mainResult.metadata.componentCount += reconstructedResult.components.filter(c => c.type !== ComponentType.FILE).length;
      mainResult.metadata.relationshipCount += reconstructedResult.relationships.length;
    }
    
    // Merge errors and warnings
    mainResult.errors.push(...reconstructedResult.errors);
    mainResult.warnings.push(...reconstructedResult.warnings);
  }

  /**
   * Convert line/column position to absolute character position
   */
  private getAbsolutePosition(lines: string[], line: number, column: number): number {
    let position = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      position += (lines[i]?.length || 0) + 1; // +1 for newline
    }
    return position + column;
  }

  /**
   * Map a component from reconstructed content back to original positions
   */
  private mapComponentToOriginalPosition(
    component: IComponent,
    mapping: Array<{ originalStart: number; originalEnd: number; reconstructedStart: number; reconstructedEnd: number }>,
    lines: string[]
  ): IComponent | null {
    const componentStart = this.getAbsolutePosition(lines, component.location.startLine, component.location.startColumn);
    const componentEnd = this.getAbsolutePosition(lines, component.location.endLine, component.location.endColumn);
    
    // Find all mappings that this component spans
    const relevantMappings = mapping.filter(m => 
      // Component starts within this mapping OR ends within this mapping OR spans entire mapping
      (componentStart >= m.reconstructedStart && componentStart < m.reconstructedEnd) ||
      (componentEnd > m.reconstructedStart && componentEnd <= m.reconstructedEnd) ||
      (componentStart <= m.reconstructedStart && componentEnd >= m.reconstructedEnd)
    );
    
    if (relevantMappings.length === 0) {
      return null; // Component doesn't map to any original position
    }
    
    // Handle components that span multiple boundaries
    if (relevantMappings.length > 1) {
      // For multi-boundary components (like head/body sections), use the first and last mappings
      const firstMapping = relevantMappings[0]!;
      const lastMapping = relevantMappings[relevantMappings.length - 1]!;
      
      // Calculate start position from first mapping
      const offsetStart = componentStart - firstMapping.reconstructedStart;
      const originalStart = firstMapping.originalStart + offsetStart;
      
      // Calculate end position from last mapping
      const offsetEnd = componentEnd - lastMapping.reconstructedStart;
      const originalEnd = lastMapping.originalStart + offsetEnd;
      
      // Convert back to line/column
      const newStartLocation = this.getLineColumnFromAbsolute(lines, originalStart);
      const newEndLocation = this.getLineColumnFromAbsolute(lines, originalEnd);
      
      return {
        ...component,
        location: {
          startLine: newStartLocation.line,
          startColumn: newStartLocation.column,
          endLine: newEndLocation.line,
          endColumn: newEndLocation.column
        }
      };
    }
    
    // Single boundary component - use original logic
    const relevantMapping = relevantMappings[0]!;
    
    // Calculate offset within the mapping
    const offsetStart = componentStart - relevantMapping.reconstructedStart;
    const offsetEnd = componentEnd - relevantMapping.reconstructedStart;
    
    // Map back to original positions
    const originalStart = relevantMapping.originalStart + offsetStart;
    const originalEnd = relevantMapping.originalStart + offsetEnd;
    
    // Convert back to line/column
    const newStartLocation = this.getLineColumnFromAbsolute(lines, originalStart);
    const newEndLocation = this.getLineColumnFromAbsolute(lines, originalEnd);
    
    return {
      ...component,
      location: {
        startLine: newStartLocation.line,
        startColumn: newStartLocation.column,
        endLine: newEndLocation.line,
        endColumn: newEndLocation.column
      }
    };
  }

  /**
   * Map a relationship from reconstructed content back to original positions
   */
  private mapRelationshipToOriginalPosition(
    relationship: IRelationship,
    mapping: Array<{ originalStart: number; originalEnd: number; reconstructedStart: number; reconstructedEnd: number }>,
    lines: string[]
  ): IRelationship | null {
    // For now, return the relationship as-is since relationships don't have location info
    // In the future, we could add location tracking to relationships
    return relationship;
  }

  /**
   * Convert absolute character position back to line/column
   */
  private getLineColumnFromAbsolute(lines: string[], position: number): { line: number; column: number } {
    let currentPos = 0;
    for (let line = 0; line < lines.length; line++) {
      const lineLength = (lines[line]?.length || 0) + 1; // +1 for newline
      if (currentPos + lineLength > position) {
        return {
          line: line + 1,
          column: position - currentPos
        };
      }
      currentPos += lineLength;
    }
    
    // Fallback to end of last line
    return {
      line: lines.length,
      column: lines[lines.length - 1]?.length || 0
    };
  }

  /**
   * Build component chain for scope context
   */
  private buildComponentChain(
    mainComponents: IComponent[],
    embeddedComponent: IComponent
  ): Array<{ id: string; name: string; type: ComponentType; language: string }> {
    const chain: Array<{ id: string; name: string; type: ComponentType; language: string }> = [];
    
    // Add file component
    const fileComponent = mainComponents.find(c => c.type === ComponentType.FILE);
    if (fileComponent) {
      chain.push({
        id: fileComponent.id,
        name: fileComponent.name,
        type: fileComponent.type,
        language: fileComponent.language
      });
    }
    
    // Find containing components (classes, functions, etc.)
    const containingComponents = mainComponents.filter(c => 
      c.type !== ComponentType.FILE &&
      c.location.startLine <= embeddedComponent.location.startLine &&
      c.location.endLine >= embeddedComponent.location.endLine
    );
    
    // Sort by specificity (smallest range first)
    containingComponents.sort((a, b) => {
      const aRange = a.location.endLine - a.location.startLine;
      const bRange = b.location.endLine - b.location.startLine;
      return aRange - bRange;
    });
    
    // Add to chain
    containingComponents.forEach(component => {
      chain.push({
        id: component.id,
        name: component.name,
        type: component.type,
        language: component.language
      });
    });
    
    return chain;
  }
}
