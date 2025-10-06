/**
 * PHP Parser - Uses PHP's built-in tokenizer and ReflectionClass
 * 
 * Since we're in a TypeScript/Node.js environment, we'll use a PHP subprocess
 * to parse PHP files and return structured data as JSON for processing.
 */

import { BaseLanguageParser } from './BaseLanguageParser.js';
import type { ParseError, ParserOptions, LanguageBoundary } from '../interfaces/ILanguageParser.js';
import { 
  IComponent, 
  IRelationship, 
  ComponentType, 
  RelationshipType 
} from '../types.js';
import { phpAstBridge, PhpAstBridge } from '../services/PhpAstBridge.js';

// PHP AST node types we care about
interface PhpASTNode {
  nodeType: string;
  startLine?: number;
  endLine?: number;
  startFilePos?: number;
  endFilePos?: number;
  name?: string;
  fqn?: string;              // Fully qualified name
  className?: string;
  methodName?: string;
  visibility?: 'public' | 'private' | 'protected';
  isStatic?: boolean;
  isAbstract?: boolean;
  isFinal?: boolean;
  params?: PhpParameterNode[];
  returnType?: string;
  docComment?: string;
  namespace?: string;
  extends?: string;
  extendsFqn?: string;       // FQN of extended class/interface
  implements?: string[];
  implementsFqns?: string[]; // FQNs of implemented interfaces
  uses?: string[];           // FQNs of used traits
  traits?: string[];
  properties?: PhpPropertyNode[];
  methods?: PhpMethodNode[];
  constants?: PhpConstantNode[];
}

interface PhpUseStatement {
  nodeType: 'Use';
  name: string;      // Full class name being imported
  alias?: string;    // Alias if provided
  finalName: string; // Name used in code (alias or base name)
  startLine?: number;
}

interface PhpFqnMapping {
  [shortName: string]: string; // Maps short names to FQNs
}

interface PhpParameterNode {
  name: string;
  type?: string;
  defaultValue?: string;
  isOptional?: boolean;
  isReference?: boolean;
  isVariadic?: boolean;
}

interface PhpPropertyNode {
  name: string;
  visibility: 'public' | 'private' | 'protected';
  type?: string;
  defaultValue?: string;
  isStatic?: boolean;
  docComment?: string;
  lineno?: number;
  startLine?: number;
}

interface PhpMethodNode {
  name: string;
  visibility: 'public' | 'private' | 'protected';
  isStatic?: boolean;
  isAbstract?: boolean;
  isFinal?: boolean;
  params?: PhpParameterNode[];
  returnType?: string;
  docComment?: string;
  lineno?: number;
  startLine?: number;
}

interface PhpConstantNode {
  name: string;
  value?: string;
  visibility?: 'public' | 'private' | 'protected';
  lineno?: number;
  startLine?: number;
}

/**
 * PHP parser using PHP's built-in reflection and parsing capabilities
 */
export class PhpParser extends BaseLanguageParser {
  private fqnToComponentMap: Map<string, string> = new Map(); // Maps FQN to component ID
  private namespaceComponentMap: Map<string, IComponent> = new Map();
  private lastParsedAst: any | null = null;
  private bridge: PhpAstBridge;
  private lastDetectedComponents: IComponent[] = [];

  constructor() {
    super('php', ['.php', '.phtml', '.php3', '.php4', '.php5', '.phar']);
    this.bridge = phpAstBridge;
  }

  /**
   * Get PHP specific ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [
      ...this.getBaseIgnorePatterns(),
      
      // Composer/PHP package manager
      '**/vendor/**',
      '**/vendor',
      '**/composer.lock',
      
      // Symfony framework specific (cache, logs, sessions)
      '**/var/**',
      '**/var',
      
      // Laravel framework
      '**/storage/app/**',
      '**/storage/logs/**',
      '**/storage/framework/cache/**',
      '**/storage/framework/sessions/**',
      '**/storage/framework/views/**',
      '**/bootstrap/cache/**',
      
      // CodeIgniter
      '**/system/cache/**',
      '**/system/logs/**',
      '**/application/cache/**',
      '**/application/logs/**',
      
      // Drupal
      '**/sites/default/files/**',
      
      // WordPress
      '**/wp-content/cache/**',
      '**/wp-content/uploads/**',
      
      // Environment files
      '**/.env',
      '**/.env.*',
      
      // Test artifacts
      '**/.phpunit.result.cache',
      '**/phpunit.xml',
      '**/phpunit.xml.dist',
      
      // PHP build tools
      '**/build/**',
      '**/build',
      
      // PHPStan/Psalm
      '**/.phpstan.cache',
      '**/.psalm.cache'
    ];
  }

  /**
   * Override capabilities for semantic PHP parsing
   */
  protected getCapabilities() {
    return {
      symbols: true,
      relationships: true,
      ranges: true,
      types: true,          // PHP has type hints and ReflectionClass
      controlFlow: true,
      incremental: false    // PHP-Parser doesn't support our incremental interface
    };
  }

  /**
   * Override parsing level for semantic analysis
   */
  protected getParsingLevel(): 'semantic' | 'structural' | 'basic' {
    return 'semantic';
  }

  /**
   * Override backend to indicate AST-based parsing
   */
  protected getBackend(): 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid' {
    return 'ast';
  }

  /**
   * Override default confidence for semantic parser
   */
  protected getDefaultConfidence(): number {
    return 0.9;
  }

  /**
   * Validate PHP syntax using built-in parser
   */
  async validateSyntax(content: string): Promise<ParseError[]> {
    try {
      if (!content || content.indexOf('<?php') === -1) {
        return [];
      }

      const result = await this.bridge.parseContent('<memory>.php', content);
      if (result.success) {
        return [];
      }

      const line = typeof result.line === 'number' ? result.line : undefined;
      const location = line ? this.createLocation(line, line) : undefined;

      return [
        this.createParseError(
          result.message || 'PHP syntax error',
          location,
          result.error || 'SYNTAX_ERROR',
          'error'
        )
      ];
    } catch (error) {
      console.warn(`Failed to validate PHP syntax: ${error}`);
      return [
        this.createParseError(
          `PHP parsing failed: ${error}`,
          undefined,
          'PARSE_ERROR',
          'error'
        )
      ];
    }
  }

  /**
   * Detect components in PHP content
   */
  async detectComponents(content: string, filePath: string): Promise<IComponent[]> {
    const components: IComponent[] = [];

    try {
      const isRealPhp = typeof filePath === 'string' && /\.(php|phtml|php3|php4|php5|php7)$/i.test(filePath) && content.indexOf('<?php') !== -1;
      const fileComponent = this.createFileComponent(filePath, content);
      components.push(fileComponent);

      if (!isRealPhp) {
        this.lastParsedAst = null;
        this.clearContext();
        this.lastDetectedComponents = components.slice();
        return components;
      }

      let fileContextPushed = false;
      this.pushContext(fileComponent);
      fileContextPushed = true;

      this.fqnToComponentMap.clear();
      this.namespaceComponentMap.clear();

      const parseResult = await this.bridge.parseContent(filePath, content);

      if (parseResult.success && parseResult.ast) {
        this.lastParsedAst = parseResult.ast;
        this.extractComponentsFromAST(parseResult.ast, components, filePath, content);
      } else {
        this.lastParsedAst = null;
      }

      if (fileContextPushed) {
        this.popContext();
      }
      this.clearContext();
    } catch (error) {
      console.error('PHP parsing error:', error);
      this.lastParsedAst = null;
      this.clearContext();
    }

    this.lastDetectedComponents = components.slice();

    return components;
  }

  /**
   * Detect relationships between components
   */
  async detectRelationships(components: IComponent[], content: string): Promise<IRelationship[]> {
    const relationships: IRelationship[] = [];

    try {
      // === COMPOSE BASE PARSER RELATIONSHIP EXTRACTION METHODS ===

      // 1. Base parser's usage relationships (function calls, property access, variable references)
      const usageRelationships = this.extractUsageRelationships(components, content);
      relationships.push(...usageRelationships);

      // 2. Base parser's inheritance relationships (might catch some patterns)
      const inheritanceRelationships = this.extractInheritanceRelationships(components, content);
      relationships.push(...inheritanceRelationships);

      // 3. Prefer AST-based import relationships; fallback to base only if none found
      const astImportRels = this.extractPhpImportRelationshipsFromAst(components);
      if (astImportRels.length > 0) {
        relationships.push(...astImportRels);
      } else {
        const importExportRelationships = this.extractImportExportRelationships(components, content);
        relationships.push(...importExportRelationships);
      }

      // 4. Base parser's smart containment detection (file->component, class->method)
      const containmentRelationships = this.extractContainmentRelationships(components);
      relationships.push(...containmentRelationships);

      // === ADD PHP-SPECIFIC ENHANCEMENTS ===

      // 5. Enhanced inheritance relationships specific to PHP
      this.extractPhpInheritanceRelationships(components, relationships);

      // 6. Enhanced interface implementation relationships specific to PHP
      this.extractPhpImplementationRelationships(components, relationships);

      // 7. PHP trait usage relationships (unique to PHP)
      this.extractPhpTraitUsageRelationships(components, relationships);

      // 8. Namespace relationships (namespace contains types)
      this.extractPhpNamespaceRelationships(components, relationships);

      // PRIMARY PARSER: Add semantic data flow analysis
      const semanticRelationships = await this.analyzePhpDataFlow(components, content);
      relationships.push(...semanticRelationships);

    } catch (error) {
      console.warn(`Failed to extract PHP relationships: ${error}`);
    }

    return relationships;
  }

  /**
   * Analyze PHP-specific semantic data flow patterns (PRIMARY PARSER)
   */
  private async analyzePhpDataFlow(components: IComponent[], content: string): Promise<IRelationship[]> {
    try {
      const { DataFlowAnalyzer } = await import('../../analysis/DataFlowAnalyzer.js');
      const analyzer = new DataFlowAnalyzer();
      const relationships: IRelationship[] = [];

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
          relationships.push(...flowRels);
          analyzer.clear();
        }
      }

      return relationships;
    } catch (error) {
      console.warn('DataFlowAnalyzer failed for PHP:', error);
      return [];
    }
  }

  /**
   * Link namespace components to types/functions/constants defined within them.
   */
  private extractPhpNamespaceRelationships(components: IComponent[], relationships: IRelationship[]): void {
    const namespaceComponents = components.filter(c => c.type === ComponentType.NAMESPACE);
    if (namespaceComponents.length === 0) return;

    const linkableTypes = new Set([ComponentType.CLASS, ComponentType.PROPERTY, ComponentType.METHOD, ComponentType.CONSTANT, ComponentType.FUNCTION, ComponentType.INTERFACE]);
    const otherComponents = components.filter(c => linkableTypes.has(c.type as any));

    for (const ns of namespaceComponents) {
      const nsName = ns.name;
      for (const comp of otherComponents) {
        const compNs = comp.metadata?.namespace || (comp.metadata?.fullName ? String(comp.metadata.fullName).split('\\').slice(0, -1).join('\\') : undefined);
        if (compNs && compNs === nsName) {
          relationships.push({
            id: `${ns.id}-in-namespace-${comp.id}`,
            type: RelationshipType.IN_NAMESPACE,
            sourceId: ns.id,
            targetId: comp.id,
            metadata: { relationship: 'namespace-contains-entity' }
          });
        }
      }
    }
  }

  /**
   * Extract PHP import/use/require relationships using parsed AST data from helper
   */
  private extractPhpImportRelationshipsFromAst(components: IComponent[]): IRelationship[] {
    const rels: IRelationship[] = [];
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent || !this.lastParsedAst) return rels;

    try {
      const ast = this.lastParsedAst as { uses?: any[]; includes?: any[] };
      const uses = Array.isArray(ast.uses) ? ast.uses : [];
      for (const u of uses) {
        const fqn = u.name as string;
        const alias = u.alias as (string | undefined);
        const finalName = u.finalName as (string | undefined);
        const line = u.startLine as (number | undefined);
        rels.push({
          id: `${fileComponent.id}-use-${fqn}`,
          type: RelationshipType.IMPORTS_FROM,
          sourceId: fileComponent.id,
          targetId: `RESOLVE:${fqn}`,
          metadata: {
            importKind: 'use',
            alias: alias,
            finalName: finalName,
            specifier: fqn,
            ...(line ? { line } : {}),
            needsResolution: true
          }
        });
      }

      const includes = Array.isArray(ast.includes) ? ast.includes : [];
      for (const inc of includes) {
        const path = inc.path as (string | null);
        const kind = inc.kind as (string | undefined);
        const line = inc.startLine as (number | undefined);
        rels.push({
          id: `${fileComponent.id}-include-${kind || 'include'}-${path || 'expr'}`,
          type: RelationshipType.IMPORTS_FROM,
          sourceId: fileComponent.id,
          targetId: path ? `RESOLVE:${path}` : `RESOLVE:dynamic_include`,
          metadata: {
            importKind: 'include',
            includeKind: kind,
            specifier: path || '',
            ...(line ? { line } : {}),
            needsResolution: true
          }
        });
      }
    } catch (e) {
      return [];
    }

    return rels;
  }

  /**
   * Extract components from PHP AST
   */
  private extractComponentsFromAST(ast: any, components: IComponent[], filePath: string, content: string): void {
    if (!ast || typeof ast !== 'object') {
      return;
    }

    // Process namespaces
    if (ast.namespaces && Array.isArray(ast.namespaces)) {
      for (const namespace of ast.namespaces) {
        this.extractNamespaceComponent(namespace, components, filePath, content);
      }
    }

    // Process classes
    if (ast.classes && Array.isArray(ast.classes)) {
      for (const classNode of ast.classes) {
        this.extractClassComponent(classNode, components, filePath, content);
      }
    }

    // Process interfaces
    if (ast.interfaces && Array.isArray(ast.interfaces)) {
      for (const interfaceNode of ast.interfaces) {
        this.extractInterfaceComponent(interfaceNode, components, filePath, content);
      }
    }

    // Process traits
    if (ast.traits && Array.isArray(ast.traits)) {
      for (const traitNode of ast.traits) {
        this.extractTraitComponent(traitNode, components, filePath, content);
      }
    }

    // Process functions
    if (ast.functions && Array.isArray(ast.functions)) {
      for (const functionNode of ast.functions) {
        this.extractFunctionComponent(functionNode, components, filePath, content);
      }
    }

    // Process constants
    if (ast.constants && Array.isArray(ast.constants)) {
      for (const constantNode of ast.constants) {
        this.extractConstantComponent(constantNode, components, filePath, content);
      }
    }

    // Process global variables
    if (ast.variables && Array.isArray(ast.variables)) {
      for (const variableNode of ast.variables) {
        this.extractVariableComponent(variableNode, components, filePath, content);
      }
    }
  }

  /**
   * Extract namespace component from PHP AST
   */
  private extractNamespaceComponent(node: PhpASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const location = this.createLocation(node.startLine || 1, node.endLine || node.startLine || 1);
    const namespaceName = node.name;

    const namespaceComponent: IComponent = {
      id: this.generateComponentId(filePath, namespaceName, ComponentType.NAMESPACE),
      name: namespaceName,
      type: ComponentType.NAMESPACE,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        isExported: true,
        fullName: namespaceName
      }
    };

    components.push(namespaceComponent);
    this.namespaceComponentMap.set(namespaceName, namespaceComponent);
  }

  private withNamespaceContext<T>(namespaceName: string | undefined, fn: () => T): T {
    if (!namespaceName) {
      return fn();
    }

    const namespaceComponent = this.namespaceComponentMap.get(namespaceName);
    if (!namespaceComponent) {
      return fn();
    }

    this.pushContext(namespaceComponent);
    try {
      return fn();
    } finally {
      this.popContext();
    }
  }

  /**
   * Extract class component from PHP AST
   */
  private extractClassComponent(node: PhpASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    this.withNamespaceContext(node.namespace, () => {
      const location = this.createLocation(node.startLine || 1, node.endLine || node.startLine || 1);
      const className = node.name!;
      const fqn = node.fqn || (node.namespace ? `${node.namespace}\\${className}` : className);

      // Use FQN for component ID to ensure uniqueness across namespaces
      const classComponent: IComponent = {
        id: this.generateComponentId(filePath, fqn, ComponentType.CLASS),
        name: className,
        type: ComponentType.CLASS,
        language: this.language,
        filePath,
        location,
        parentId: this.getCurrentParentId(),
        metadata: {
          isExported: true,
          namespace: node.namespace,
          fullName: fqn,
          fqn: fqn,
          extends: node.extends,
          extendsFqn: node.extendsFqn,
          implements: node.implements || [],
          implementsFqns: node.implementsFqns || [],
          uses: node.uses || [],  // Trait FQNs
          isAbstract: node.isAbstract || false,
          isFinal: node.isFinal || false,
          methods: (node.methods || []).map(m => m.name),
          properties: (node.properties || []).map(p => p.name),
          constants: (node.constants || []).map(c => c.name),
          documentation: node.docComment,
          accessModifier: 'public'
        },
        code: this.extractSourceCodeByRange(content, node.startLine || 1, node.endLine || node.startLine || 1)
      };

      components.push(classComponent);

      // Store FQN to component ID mapping for relationship resolution
      this.fqnToComponentMap.set(fqn, classComponent.id);

      this.pushContext(classComponent);

      try {
        // Extract methods as separate components
        if (node.methods) {
          for (const method of node.methods) {
            this.extractMethodComponent(method, components, filePath, content, fqn);
          }
        }

        // Extract properties as separate components
        if (node.properties) {
          for (const property of node.properties) {
            this.extractPropertyComponent(property, components, filePath, content, fqn);
          }
        }

        // Extract constants as separate components
        if (node.constants) {
          for (const constant of node.constants) {
            this.extractClassConstantComponent(constant, components, filePath, content, fqn);
          }
        }
      } finally {
        this.popContext();
      }
    });
  }

  /**
   * Extract interface component from PHP AST
   */
  private extractInterfaceComponent(node: PhpASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const namespaceName = node.namespace;
    const interfaceName = node.name!;
    const fqn = node.fqn || (namespaceName ? `${namespaceName}\\${interfaceName}` : interfaceName);
    const extendsList = node.extends;
    const extendsFqns = node.extendsFqn ? [node.extendsFqn] : [];
    const methods = node.methods || [];
    const docComment = node.docComment;

    this.withNamespaceContext(namespaceName, () => {
      const location = this.createLocation(node.startLine || 1, node.endLine || node.startLine || 1);

      const interfaceComponent: IComponent = {
        id: this.generateComponentId(filePath, fqn, ComponentType.INTERFACE),
        name: interfaceName,
        type: ComponentType.INTERFACE,
        language: this.language,
        filePath,
        location,
        parentId: this.getCurrentParentId(),
        metadata: {
          isExported: true,
          namespace: namespaceName,
          fullName: fqn,
          fqn: fqn,
          extends: extendsList,
          extendsFqns,
          methods: methods.map(m => m.name),
          documentation: docComment
        },
        code: this.extractSourceCodeByRange(content, node.startLine || 1, node.endLine || node.startLine || 1)
      };

      components.push(interfaceComponent);

      // Store FQN to component ID mapping for relationship resolution
      this.fqnToComponentMap.set(fqn, interfaceComponent.id);
    });
  }

  /**
   * Extract trait component from PHP AST
   */
  private extractTraitComponent(node: PhpASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const namespaceName = node.namespace;
    const traitName = node.name!;
    const fqn = node.fqn || (namespaceName ? `${namespaceName}\\${traitName}` : traitName);
    const traitMethods = node.methods || [];
    const traitProperties = node.properties || [];
    const docComment = node.docComment;

    this.withNamespaceContext(namespaceName, () => {
      const location = this.createLocation(node.startLine || 1, node.endLine || node.startLine || 1);

      const traitComponent: IComponent = {
        id: this.generateComponentId(filePath, fqn, ComponentType.CLASS), // Using CLASS type as there's no TRAIT type
        name: traitName,
        type: ComponentType.CLASS,
        language: this.language,
        filePath,
        location,
        parentId: this.getCurrentParentId(),
        metadata: {
          isExported: true,
          namespace: namespaceName,
          fullName: fqn,
          fqn: fqn,
          isTrait: true,
          methods: traitMethods.map(m => m.name),
          properties: traitProperties.map(p => p.name),
          documentation: docComment
        }
      };

      components.push(traitComponent);

      // Store FQN to component ID mapping for relationship resolution
      this.fqnToComponentMap.set(fqn, traitComponent.id);
    });
  }

  /**
   * Extract function component from PHP AST
   */
  private extractFunctionComponent(node: PhpASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const namespaceName = node.namespace;
    const functionName = node.name!;
    const fqn = node.fqn || (namespaceName ? `${namespaceName}\\${functionName}` : functionName);
    const returnType = node.returnType;
    const docComment = node.docComment;
    const parameterNodes = this.extractFunctionParameters(node);

    this.withNamespaceContext(namespaceName, () => {
      const location = this.createLocation(node.startLine || 1, node.endLine || node.startLine || 1);

      const functionComponent: IComponent = {
        id: this.generateComponentId(filePath, fqn, ComponentType.FUNCTION),
        name: functionName,
        type: ComponentType.FUNCTION,
        language: this.language,
        filePath,
        location,
        parentId: this.getCurrentParentId(),
        metadata: {
          isExported: true,
          namespace: namespaceName,
          fullName: fqn,
          fqn: fqn,
          returnType,
          documentation: docComment,
          parameters: parameterNodes
        },
        code: this.extractSourceCodeByRange(content, node.startLine || 1, node.endLine || node.startLine || 1)
      };

      components.push(functionComponent);

      // Store FQN to component ID mapping for relationship resolution
      this.fqnToComponentMap.set(fqn, functionComponent.id);
    });
  }

  /**
   * Extract method component from PHP AST
   */
  private extractMethodComponent(method: PhpMethodNode, components: IComponent[], filePath: string, content: string, className: string): void {
    if (!method.name) return;

    const location = this.createLocation(method?.lineno || method?.startLine || 1, method?.lineno || method?.startLine || 1);
    const methodName = method.name;

    const methodComponent: IComponent = {
      id: this.generateComponentId(filePath, methodName, ComponentType.METHOD),
      name: methodName,
      type: ComponentType.METHOD,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        className: className,
        isStatic: method.isStatic || false,
        isAbstract: method.isAbstract || false,
        isFinal: method.isFinal || false,
        isConstructor: methodName === '__construct',
        isDestructor: methodName === '__destruct',
        returnType: method.returnType,
        documentation: method.docComment,
        parameters: this.extractMethodParameters(method),
        accessModifier: method.visibility || 'public'
      },
      code: this.extractSourceCodeByRange(content, method?.lineno || method?.startLine || 1, method?.lineno || method?.startLine || 1)
    };

    components.push(methodComponent);
  }

  /**
   * Extract property component from PHP AST
   */
  private extractPropertyComponent(property: PhpPropertyNode, components: IComponent[], filePath: string, content: string, className: string): void {
    if (!property.name) return;

    const location = this.createLocation(property.lineno || property.startLine || 1, property.lineno || property.startLine || 1);
    const propertyName = property.name;

    const propertyComponent: IComponent = {
      id: this.generateComponentId(filePath, propertyName, ComponentType.PROPERTY),
      name: propertyName,
      type: ComponentType.PROPERTY,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        className: className,
        isStatic: property.isStatic || false,
        type: property.type,
        defaultValue: property.defaultValue,
        documentation: property.docComment,
        accessModifier: property.visibility || 'public'
      },
      code: this.extractSourceCodeByRange(content, property.lineno || property.startLine || 1, property.lineno || property.startLine || 1)
    };

    components.push(propertyComponent);
  }

  /**
   * Extract constant component from PHP AST
   */
  private extractConstantComponent(node: PhpASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const namespaceName = node.namespace;
    const constantName = node.name!;
    const fullName = namespaceName ? `${namespaceName}\\${constantName}` : constantName;

    this.withNamespaceContext(namespaceName, () => {
      const location = this.createLocation(node.startLine || 1, node.startLine || 1);

      const constantComponent: IComponent = {
        id: this.generateComponentId(filePath, fullName, ComponentType.CONSTANT),
        name: constantName,
        type: ComponentType.CONSTANT,
        language: this.language,
        filePath,
        location,
        parentId: this.getCurrentParentId(),
        metadata: {
          isExported: true,
          namespace: namespaceName,
          fullName: fullName,
          isGlobal: true
        }
      };

      components.push(constantComponent);
    });
  }

  /**
   * Extract class constant component from PHP AST
   */
  private extractClassConstantComponent(constant: PhpConstantNode, components: IComponent[], filePath: string, content: string, className: string): void {
    if (!constant.name) return;

    const location = this.createLocation(constant.lineno || constant.startLine || 1, constant.lineno || constant.startLine || 1);
    const constantName = constant.name;

    const constantComponent: IComponent = {
      id: this.generateComponentId(filePath, `${className}::${constantName}`, ComponentType.CONSTANT),
      name: constantName,
      type: ComponentType.CONSTANT,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        className: className,
        value: constant.value,
        isClassConstant: true,
        accessModifier: constant.visibility || 'public'
      }
    };

    components.push(constantComponent);
  }

  /**
   * Extract variable component from PHP AST
   */
  private extractVariableComponent(node: PhpASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const namespaceName = node.namespace;
    const variableName = node.name!;
    const fullName = namespaceName ? `${namespaceName}\\$${variableName}` : `$${variableName}`;

    this.withNamespaceContext(namespaceName, () => {
      const location = this.createLocation(node.startLine || 1, node.startLine || 1);

      const variableComponent: IComponent = {
        id: this.generateComponentId(filePath, fullName, ComponentType.VARIABLE),
        name: variableName,
        type: ComponentType.VARIABLE,
        language: this.language,
        filePath,
        location,
        parentId: this.getCurrentParentId(),
        metadata: {
          namespace: namespaceName,
          fullName: fullName,
          scope: 'global',
          isGlobal: true
        }
      };

      components.push(variableComponent);
    });
  }

  /**
   * Create file component
   */
  protected createFileComponent(filePath: string, content: string): IComponent {
    const lines = content.split('\n');
    const stats = {
      size: Buffer.byteLength(content, 'utf8'),
      lineCount: lines.length,
      extension: '.php'
    };

    return {
      id: this.generateComponentId(filePath, this.getFileName(filePath), ComponentType.FILE),
      name: this.getFileName(filePath),
      type: ComponentType.FILE,
      language: this.language,
      filePath,
      location: this.createLocation(1, stats.lineCount),
      metadata: {
        size: stats.size,
        extension: stats.extension,
        modificationTime: Date.now(),
        lineCount: stats.lineCount,
        hasPhpTag: content.includes('<?php'),
        encoding: 'utf-8'
      },
      code: content // No truncation - store full file content
    };
  }

  // Helper methods
  private extractFunctionParameters(node: PhpASTNode): Array<{name: string; type?: string; defaultValue?: string; isOptional?: boolean}> {
    if (!node.params || !Array.isArray(node.params)) {
      return [];
    }

    return node.params.map(param => ({
      name: param.name || '',
      ...(param.type && { type: param.type }),
      ...(param.defaultValue && { defaultValue: param.defaultValue }),
      ...(param.isOptional && { isOptional: param.isOptional })
    }));
  }

  private extractMethodParameters(method: PhpMethodNode): Array<{name: string; type?: string; defaultValue?: string; isOptional?: boolean}> {
    if (!method.params || !Array.isArray(method.params)) {
      return [];
    }

    return method.params.map(param => ({
      name: param.name || '',
      ...(param.type && { type: param.type }),
      ...(param.defaultValue && { defaultValue: param.defaultValue }),
      ...(param.isOptional && { isOptional: param.isOptional })
    }));
  }

  private getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || '';
  }

  /**
   * Enhanced AST tracking: Extract all variable declarations with scope and type info
  */
  extractVariableComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    if (!this.lastParsedAst) {
      console.warn(`PHP AST unavailable when extracting variables for ${filePath}; run detectComponents first.`);
      return components;
    }

    try {
      this.extractVariablesFromAST(this.lastParsedAst, components, filePath, content);
    } catch (error) {
      console.warn(`Failed to extract PHP variables: ${error}`);
    }

    return components;
  }

  /**
   * Enhanced AST tracking: Extract __construct methods (PHP constructors)
  */
  extractConstructorComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    if (!this.lastParsedAst) {
      console.warn(`PHP AST unavailable when extracting constructors for ${filePath}; run detectComponents first.`);
      return components;
    }

    try {
      this.extractConstructorsFromAST(this.lastParsedAst, components, filePath, content);
    } catch (error) {
      console.warn(`Failed to extract PHP constructors: ${error}`);
    }

    return components;
  }

  /**
   * Enhanced AST tracking: Extract getters/setters and magic methods
   * Now uses AST data when available, falls back to regex only when AST lacks detail
   */
  extractAccessorComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];

    try {
      const astMethods = this.lastDetectedComponents.filter(
        component => component.filePath === filePath && component.type === ComponentType.METHOD
      );

      for (const method of astMethods) {
        const methodName = method.name || '';
        const isGetter = methodName.startsWith('get') && methodName.length > 3;
        const isSetter = methodName.startsWith('set') && methodName.length > 3;
        const isMagicMethod = methodName.startsWith('__');

        if (!isGetter && !isSetter && !isMagicMethod) {
          continue;
        }

        const updatedMetadata = { ...method.metadata };
        if (isGetter) {
          updatedMetadata.isGetter = true;
          updatedMetadata.isAccessor = true;
          updatedMetadata.propertyName = methodName.substring(3).toLowerCase();
        } else if (isSetter) {
          updatedMetadata.isSetter = true;
          updatedMetadata.isAccessor = true;
          updatedMetadata.propertyName = methodName.substring(3).toLowerCase();
        } else if (isMagicMethod) {
          updatedMetadata.isMagicMethod = true;
          updatedMetadata.magicMethodType = methodName;
        }

        components.push({ ...method, metadata: updatedMetadata });
      }

      if (components.length > 0) {
        return components;
      }

      // Fallback to regex-based extraction only if AST provides no methods
      console.warn(`Falling back to regex-based accessor extraction for ${filePath} - AST may lack method details`);

      const lines = content.split('\n');
      let currentClass = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();

        // Track current class context
        const classMatch = line.match(/^class\s+(\w+)/);
        if (classMatch) {
          currentClass = classMatch[1]!;
          continue;
        }

        // Find getter methods (get + PropertyName pattern)
        const getterMatch = line.match(/(public|private|protected)?\s*(static)?\s*function\s+(get\w+)\s*\(/);
        if (getterMatch && currentClass) {
          const visibility = getterMatch[1] || 'public';
          const isStatic = !!getterMatch[2];
          const methodName = getterMatch[3]!;
          const propertyName = methodName.substring(3).toLowerCase(); // Remove 'get'

          const component: IComponent = {
            id: this.generateComponentId(filePath, `${currentClass}.${methodName}`, ComponentType.METHOD),
            name: methodName,
            type: ComponentType.METHOD,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              className: currentClass,
              isGetter: true,
              isAccessor: true,
              propertyName: propertyName,
              accessModifier: visibility as 'public' | 'private' | 'protected',
              isStatic: isStatic,
              documentation: this.extractDocCommentFromLines(lines, i),
              extractionMethod: 'regex-fallback'
            }
          };

          components.push(component);
        }

        // Find setter methods (set + PropertyName pattern)
        const setterMatch = line.match(/(public|private|protected)?\s*(static)?\s*function\s+(set\w+)\s*\(/);
        if (setterMatch && currentClass) {
          const visibility = setterMatch[1] || 'public';
          const isStatic = !!setterMatch[2];
          const methodName = setterMatch[3]!;
          const propertyName = methodName.substring(3).toLowerCase(); // Remove 'set'

          const component: IComponent = {
            id: this.generateComponentId(filePath, `${currentClass}.${methodName}`, ComponentType.METHOD),
            name: methodName,
            type: ComponentType.METHOD,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              className: currentClass,
              isSetter: true,
              isAccessor: true,
              propertyName: propertyName,
              accessModifier: visibility as 'public' | 'private' | 'protected',
              isStatic: isStatic,
              documentation: this.extractDocCommentFromLines(lines, i),
              extractionMethod: 'regex-fallback'
            }
          };

          components.push(component);
        }

        // Find magic methods (__get, __set, __call, etc.)
        const magicMethodMatch = line.match(/(public|private|protected)?\s*function\s+(__\w+)\s*\(/);
        if (magicMethodMatch && currentClass) {
          const visibility = magicMethodMatch[1] || 'public';
          const methodName = magicMethodMatch[2]!;

          const component: IComponent = {
            id: this.generateComponentId(filePath, `${currentClass}.${methodName}`, ComponentType.METHOD),
            name: methodName,
            type: ComponentType.METHOD,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              className: currentClass,
              isMagicMethod: true,
              magicMethodType: methodName,
              accessModifier: visibility as 'public' | 'private' | 'protected',
              documentation: this.extractDocCommentFromLines(lines, i),
              extractionMethod: 'regex-fallback'
            }
          };

          components.push(component);
        }
      }
    } catch (error) {
      console.warn(`Failed to extract PHP accessors: ${error}`);
    }

    return components;
  }

  /**
   * Enhanced AST tracking: Extract property assignments and object property access
   */
  extractPropertyAssignments(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      const lines = content.split('\n');
      let currentClass = '';
      let currentMethod = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();
        
        // Track context
        const classMatch = line.match(/^class\s+(\w+)/);
        if (classMatch) {
          currentClass = classMatch[1]!;
          currentMethod = '';
          continue;
        }
        
        const methodMatch = line.match(/function\s+(\w+)\s*\(/);
        if (methodMatch) {
          currentMethod = methodMatch[1]!;
          continue;
        }
        
        // Find property assignments: $this->property = value
        const thisAssignMatch = line.match(/\$this->(\w+)\s*=\s*([^;]+);/);
        if (thisAssignMatch && currentClass && currentMethod) {
          const propertyName = thisAssignMatch[1]!;
          const value = thisAssignMatch[2]!.trim();
          
          const component: IComponent = {
            id: this.generateComponentId(filePath, `${currentClass}.${propertyName}_assign_${i + 1}`, ComponentType.PROPERTY),
            name: `${currentClass}->${propertyName}`,
            type: ComponentType.PROPERTY,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              className: currentClass,
              methodName: currentMethod,
              propertyName: propertyName,
              isAssignment: true,
              assignedValue: value,
              valueType: this.inferPhpType(value),
              isThisReference: true
            }
          };
          
          components.push(component);
        }
        
        // Find object property assignments: $obj->prop = value
        const objAssignMatch = line.match(/\$(\w+)->(\w+)\s*=\s*([^;]+);/);
        if (objAssignMatch && currentMethod) {
          const objectName = objAssignMatch[1]!;
          const propertyName = objAssignMatch[2]!;
          const value = objAssignMatch[3]!.trim();
          
          const component: IComponent = {
            id: this.generateComponentId(filePath, `${objectName}.${propertyName}_assign_${i + 1}`, ComponentType.PROPERTY),
            name: `$${objectName}->${propertyName}`,
            type: ComponentType.PROPERTY,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              objectName: objectName,
              propertyName: propertyName,
              methodContext: currentMethod,
              ...(currentClass && { classContext: currentClass }),
              isAssignment: true,
              assignedValue: value,
              valueType: this.inferPhpType(value)
            }
          };
          
          components.push(component);
        }
        
        // Find static property assignments: ClassName::$property = value
        const staticAssignMatch = line.match(/(\w+)::\$(\w+)\s*=\s*([^;]+);/);
        if (staticAssignMatch && currentMethod) {
          const className = staticAssignMatch[1]!;
          const propertyName = staticAssignMatch[2]!;
          const value = staticAssignMatch[3]!.trim();
          
          const component: IComponent = {
            id: this.generateComponentId(filePath, `${className}.${propertyName}_static_assign_${i + 1}`, ComponentType.PROPERTY),
            name: `${className}::$${propertyName}`,
            type: ComponentType.PROPERTY,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              className: className,
              propertyName: propertyName,
              methodContext: currentMethod,
              isAssignment: true,
              isStatic: true,
              assignedValue: value,
              valueType: this.inferPhpType(value)
            }
          };
          
          components.push(component);
        }
      }
    } catch (error) {
      console.warn(`Failed to extract PHP property assignments: ${error}`);
    }
    
    return components;
  }

  /**
   * Enhanced AST tracking: Extract function calls, property access, variable references
   */
  extractUsageRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    try {
      const lines = content.split('\n');
      let currentClass = '';
      let currentMethod = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();
        
        // Track context
        const classMatch = line.match(/^class\s+(\w+)/);
        if (classMatch) {
          currentClass = classMatch[1]!;
          currentMethod = '';
          continue;
        }
        
        const methodMatch = line.match(/function\s+(\w+)\s*\(/);
        if (methodMatch) {
          currentMethod = methodMatch[1]!;
          continue;
        }
        
        if (!currentMethod) continue;
        
        const currentComponent = components.find(c => 
          c.name === currentMethod && 
          (c.type === ComponentType.METHOD || c.type === ComponentType.FUNCTION)
        );
        
        if (!currentComponent) continue;
        
        // Find function calls: function_name(args)
        const functionCallMatches = line.matchAll(/(\w+)\s*\(/g);
        for (const match of functionCallMatches) {
          const calledFunction = match[1]!;
          const calledComponent = components.find(c => 
            c.name === calledFunction && 
            (c.type === ComponentType.FUNCTION || c.type === ComponentType.METHOD)
          );
          
          if (calledComponent && calledComponent.id !== currentComponent.id) {
            relationships.push({
              id: `${currentComponent.id}-calls-${calledComponent.id}-${i + 1}`,
              type: RelationshipType.CALLS,
              sourceId: currentComponent.id,
              targetId: calledComponent.id,
              metadata: {
                callType: 'function_call',
                line: i + 1,
                callerName: currentMethod,
                calledName: calledFunction,
                ...(currentClass && { callerClass: currentClass })
              }
            });
          }
        }
        
        // Find method calls: $obj->method(args)
        const methodCallMatches = line.matchAll(/\$(\w+)->(\w+)\s*\(/g);
        for (const match of methodCallMatches) {
          const objectName = match[1]!;
          const methodName = match[2]!;
          
          relationships.push({
            id: `${currentComponent.id}-calls-${objectName}.${methodName}-${i + 1}`,
            type: RelationshipType.CALLS,
            sourceId: currentComponent.id,
            targetId: `UNRESOLVED:$${objectName}->${methodName}`,
            metadata: {
              callType: 'method_call',
              line: i + 1,
              callerName: currentMethod,
              objectName: objectName,
              methodName: methodName,
              ...(currentClass && { callerClass: currentClass })
            }
          });
        }
        
        // Find static method calls: ClassName::method(args)
        const staticCallMatches = line.matchAll(/(\w+)::(\w+)\s*\(/g);
        for (const match of staticCallMatches) {
          const className = match[1]!;
          const methodName = match[2]!;
          
          relationships.push({
            id: `${currentComponent.id}-calls-${className}.${methodName}-${i + 1}`,
            type: RelationshipType.CALLS,
            sourceId: currentComponent.id,
            targetId: `UNRESOLVED:${className}::${methodName}`,
            metadata: {
              callType: 'static_method_call',
              line: i + 1,
              callerName: currentMethod,
              className: className,
              methodName: methodName,
              ...(currentClass && { callerClass: currentClass })
            }
          });
        }
        
        // Find property access: $obj->property
        const propertyAccessMatches = line.matchAll(/\$(\w+)->(\w+)(?!\s*\()/g);
        for (const match of propertyAccessMatches) {
          const objectName = match[1]!;
          const propertyName = match[2]!;
          
          relationships.push({
            id: `${currentComponent.id}-accesses-${objectName}.${propertyName}-${i + 1}`,
            type: RelationshipType.USES,
            sourceId: currentComponent.id,
            targetId: `UNRESOLVED:$${objectName}->${propertyName}`,
            metadata: {
              usageType: 'property_access',
              line: i + 1,
              accessorName: currentMethod,
              objectName: objectName,
              propertyName: propertyName,
              ...(currentClass && { accessorClass: currentClass })
            }
          });
        }
        
        // Find variable references
        const variableMatches = line.matchAll(/\$(\w+)/g);
        for (const match of variableMatches) {
          const varName = match[1]!;
          
          // Skip superglobals and the current method name
          if (this.isPhpSuperglobal(varName) || varName === currentMethod) continue;
          
          const varComponent = components.find(c => 
            c.name === varName && c.type === ComponentType.VARIABLE
          );
          
          if (varComponent) {
            relationships.push({
              id: `${currentComponent.id}-uses-${varComponent.id}-${i + 1}`,
              type: RelationshipType.USES,
              sourceId: currentComponent.id,
              targetId: varComponent.id,
              metadata: {
                usageType: 'variable_reference',
                line: i + 1,
                userName: currentMethod,
                variableName: varName,
                ...(currentClass && { userClass: currentClass })
              }
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to extract PHP usage relationships: ${error}`);
    }
    
    return relationships;
  }

  /**
   * Enhanced AST tracking: Extract Laravel/Symfony framework components
   */
  detectFrameworkComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      const lines = content.split('\n');
      
      // Detect Laravel components
      if (content.includes('Illuminate\\') || content.includes('use Illuminate')) {
        this.extractLaravelComponents(lines, components, filePath);
      }
      
      // Detect Symfony components
      if (content.includes('Symfony\\') || content.includes('use Symfony')) {
        this.extractSymfonyComponents(lines, components, filePath);
      }
      
      // Detect WordPress components
      if (content.includes('wp_') || content.includes('add_action') || content.includes('add_filter')) {
        this.extractWordPressComponents(lines, components, filePath);
      }
      
    } catch (error) {
      console.warn(`Failed to extract PHP framework components: ${error}`);
    }
    
    return components;
  }

  /**
   * Enhanced AST tracking: Extract use/require/include relationships
   */
  extractImportExportRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) return relationships;
    
    try {
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();
        
        // Handle 'use' statements
        const useMatch = line.match(/^use\s+([\\\w]+)(?:\s+as\s+(\w+))?\s*;/);
        if (useMatch) {
          const className = useMatch[1]!;
          const alias = useMatch[2];
          
          relationships.push({
            id: `${fileComponent.id}-uses-${className}-${i + 1}`,
            type: RelationshipType.IMPORTS_FROM,
            sourceId: fileComponent.id,
            targetId: `RESOLVE:${className}`,
            metadata: {
              importKind: 'use',
              className: className,
              specifier: className,
              ...(alias && { alias }),
              line: i + 1,
              needsResolution: true
            }
          });
        }
        
        // Handle 'require' and 'include' statements
        const requireMatch = line.match(/^(require|require_once|include|include_once)\s+([^;]+);/);
        if (requireMatch) {
          const includeType = requireMatch[1]!;
          const filePath = requireMatch[2]!.replace(/['"`]/g, '').trim();
          
          relationships.push({
            id: `${fileComponent.id}-${includeType}-${filePath}-${i + 1}`,
            type: RelationshipType.IMPORTS_FROM,
            sourceId: fileComponent.id,
            targetId: `RESOLVE:${filePath}`,
            metadata: {
              importKind: includeType,
              filePath: filePath,
              specifier: filePath,
              line: i + 1,
              needsResolution: true
            }
          });
        }
        
        // Handle namespace declaration
        const namespaceMatch = line.match(/^namespace\s+([\\\w]+)\s*;/);
        if (namespaceMatch) {
          const namespaceName = namespaceMatch[1]!;
          
          relationships.push({
            id: `${fileComponent.id}-belongs-to-namespace-${namespaceName}`,
            type: RelationshipType.BELONGS_TO,
            sourceId: fileComponent.id,
            targetId: `NAMESPACE:${namespaceName}`,
            metadata: {
              relationship: 'file-belongs-to-namespace',
              namespaceName: namespaceName,
              line: i + 1
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to extract PHP import relationships: ${error}`);
    }
    
    return relationships;
  }

  // Helper methods for enhanced extraction
  private extractVariablesFromAST(ast: any, components: IComponent[], filePath: string, content: string): void {
    if (!ast || typeof ast !== 'object') return;
    
    // Process global variables
    if (ast.variables && Array.isArray(ast.variables)) {
      for (const varNode of ast.variables) {
        this.extractVariableComponent(varNode, components, filePath, content);
      }
    }
  }

  private extractConstructorsFromAST(ast: any, components: IComponent[], filePath: string, content: string): void {
    if (!ast || typeof ast !== 'object') return;
    
    if (ast.classes && Array.isArray(ast.classes)) {
      for (const classNode of ast.classes) {
        if (classNode.methods && Array.isArray(classNode.methods)) {
          for (const method of classNode.methods) {
            if (method.name === '__construct') {
              const className = classNode.name;
              const location = this.createLocation(method.startLine || 1, method.startLine || 1);
              
              const constructorComponent: IComponent = {
                id: this.generateComponentId(filePath, `${className}.__construct`, ComponentType.CONSTRUCTOR),
                name: '__construct',
                type: ComponentType.CONSTRUCTOR,
                language: this.language,
                filePath,
                location,
                metadata: {
                  className: className,
                  isConstructor: true,
                  parameters: this.extractMethodParameters(method),
                  accessModifier: method.visibility || 'public',
                  documentation: method.docComment
                }
              };
              
              components.push(constructorComponent);
            }
          }
        }
      }
    }
  }

  private extractLaravelComponents(lines: string[], components: IComponent[], filePath: string): void {
    let currentClass = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      
      // Track current class
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[1]!;
        
        // Check if it extends Laravel base classes
        if (line.includes('extends Model') || line.includes('extends Eloquent')) {
          const component: IComponent = {
            id: this.generateComponentId(filePath, currentClass, ComponentType.CLASS),
            name: currentClass,
            type: ComponentType.CLASS,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              isLaravelModel: true,
              framework: 'Laravel',
              modelType: 'Eloquent'
            }
          };
          components.push(component);
        }
        
        if (line.includes('extends Controller') || line.includes('extends BaseController')) {
          const component: IComponent = {
            id: this.generateComponentId(filePath, currentClass, ComponentType.CLASS),
            name: currentClass,
            type: ComponentType.CLASS,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              isLaravelController: true,
              framework: 'Laravel',
              controllerType: 'Controller'
            }
          };
          components.push(component);
        }
      }
      
      // Find Laravel routes
      const routeMatch = line.match(/Route::(get|post|put|delete|patch|any)\s*\(\s*['"]([^'"]+)['"]/);
      if (routeMatch) {
        const method = routeMatch[1]!;
        const route = routeMatch[2]!;
        
        const component: IComponent = {
          id: this.generateComponentId(filePath, `route_${method}_${i + 1}`, ComponentType.FUNCTION),
          name: `route_${method}_${i + 1}`,
          type: ComponentType.FUNCTION,
          language: this.language,
          filePath,
          location: this.createLocation(i + 1, i + 1),
          metadata: {
            isLaravelRoute: true,
            framework: 'Laravel',
            httpMethod: method.toUpperCase(),
            route: route
          }
        };
        components.push(component);
      }
    }
  }

  private extractSymfonyComponents(lines: string[], components: IComponent[], filePath: string): void {
    let currentClass = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      
      // Track current class
      const classMatch = line.match(/class\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[1]!;
        
        // Check if it extends Symfony base classes
        if (line.includes('extends AbstractController') || line.includes('extends Controller')) {
          const component: IComponent = {
            id: this.generateComponentId(filePath, currentClass, ComponentType.CLASS),
            name: currentClass,
            type: ComponentType.CLASS,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              isSymfonyController: true,
              framework: 'Symfony',
              controllerType: 'Controller'
            }
          };
          components.push(component);
        }
      }
      
      // Find Symfony route annotations
      const routeAnnotationMatch = line.match(/#\[Route\(\s*['"]([^'"]+)['"].*methods:\s*\[\s*['"]([^'"]+)['"]/);
      if (routeAnnotationMatch) {
        const route = routeAnnotationMatch[1]!;
        const method = routeAnnotationMatch[2]!;
        
        // Look for the method definition on the next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]!;
          const funcMatch = nextLine.match(/function\s+(\w+)\s*\(/);
          
          if (funcMatch) {
            const funcName = funcMatch[1]!;
            const component: IComponent = {
              id: this.generateComponentId(filePath, `${currentClass}.${funcName}`, ComponentType.METHOD),
              name: funcName,
              type: ComponentType.METHOD,
              language: this.language,
              filePath,
              location: this.createLocation(i + 1, i + 2),
              metadata: {
                isSymfonyRoute: true,
                framework: 'Symfony',
                className: currentClass,
                httpMethod: method.toUpperCase(),
                route: route
              }
            };
            components.push(component);
          }
        }
      }
    }
  }

  private extractWordPressComponents(lines: string[], components: IComponent[], filePath: string): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      
      // Find WordPress hooks
      const hookMatch = line.match(/(add_action|add_filter)\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
      if (hookMatch) {
        const hookType = hookMatch[1]!;
        const hookName = hookMatch[2]!;
        const callbackFunction = hookMatch[3]!;
        
        const component: IComponent = {
          id: this.generateComponentId(filePath, `${hookType}_${hookName}_${i + 1}`, ComponentType.FUNCTION),
          name: `${hookType}_${hookName}`,
          type: ComponentType.FUNCTION,
          language: this.language,
          filePath,
          location: this.createLocation(i + 1, i + 1),
          metadata: {
            isWordPressHook: true,
            framework: 'WordPress',
            hookType: hookType,
            hookName: hookName,
            callbackFunction: callbackFunction
          }
        };
        components.push(component);
      }
      
      // Find WordPress shortcodes
      const shortcodeMatch = line.match(/add_shortcode\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
      if (shortcodeMatch) {
        const shortcodeName = shortcodeMatch[1]!;
        const callbackFunction = shortcodeMatch[2]!;
        
        const component: IComponent = {
          id: this.generateComponentId(filePath, `shortcode_${shortcodeName}`, ComponentType.FUNCTION),
          name: `shortcode_${shortcodeName}`,
          type: ComponentType.FUNCTION,
          language: this.language,
          filePath,
          location: this.createLocation(i + 1, i + 1),
          metadata: {
            isWordPressShortcode: true,
            framework: 'WordPress',
            shortcodeName: shortcodeName,
            callbackFunction: callbackFunction
          }
        };
        components.push(component);
      }
    }
  }

  private extractDocCommentFromLines(lines: string[], lineIndex: number): string | undefined {
    // Look backwards for PHP doc comment
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i]!.trim();
      
      if (line === '*/') {
        // Found end of doc comment, collect it
        let docComment = '';
        for (let j = i; j >= 0; j--) {
          const docLine = lines[j]!;
          docComment = docLine + '\n' + docComment;
          if (docLine.trim().startsWith('/**')) {
            return docComment.replace(/\/\*\*|\*\/|\s*\*\s?/g, '').trim();
          }
        }
      } else if (line && !line.startsWith('*') && !line.startsWith('//') && line !== '') {
        // Hit non-comment content
        break;
      }
    }
    
    return undefined;
  }

  private inferPhpType(value: string): string {
    if (/^\d+$/.test(value)) return 'int';
    if (/^\d+\.\d+$/.test(value)) return 'float';
    if (/^['"][^'"]*['"]$/.test(value)) return 'string';
    if (value === 'true' || value === 'false') return 'bool';
    if (value === 'null') return 'null';
    if (value.startsWith('[') && value.endsWith(']')) return 'array';
    if (value.startsWith('new ')) {
      const newMatch = value.match(/new\s+(\w+)/);
      return newMatch ? newMatch[1]! : 'object';
    }
    if (value.startsWith('$')) return 'variable';
    return 'mixed';
  }

  private isPhpSuperglobal(varName: string): boolean {
    const superglobals = [
      'GLOBALS', '_SERVER', '_GET', '_POST', '_FILES', '_COOKIE', '_SESSION',
      '_REQUEST', '_ENV', 'argc', 'argv', 'php_errormsg', 'http_response_header'
    ];
    return superglobals.includes(varName);
  }

  extractContainmentRelationships(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];
    this.extractContainmentRelationshipsInternal(components, relationships);
    return relationships;
  }

  private extractContainmentRelationshipsInternal(components: IComponent[], relationships: IRelationship[]): void {
    const fileComponents = components.filter(c => c.type === ComponentType.FILE);
    const otherComponents = components.filter(c => c.type !== ComponentType.FILE);
    
    for (const fileComp of fileComponents) {
      for (const otherComp of otherComponents) {
        if (otherComp.filePath === fileComp.filePath) {
          relationships.push({
            id: `${fileComp.id}-contains-${otherComp.id}`,
            type: RelationshipType.CONTAINS,
            sourceId: fileComp.id,
            targetId: otherComp.id,
            metadata: {
              relationship: 'file-contains-component'
            }
          });
        }
      }
    }
  }

  /**
   * Extract inheritance relationships (extends)
   */
  private extractPhpInheritanceRelationships(components: IComponent[], relationships: IRelationship[]): void {
    const classComponents = components.filter(c => c.type === ComponentType.CLASS);

    for (const classComp of classComponents) {
      const extendsFqn = classComp.metadata?.extendsFqn;
      if (extendsFqn) {
        // Try to resolve using FQN mapping first
        const targetComponentId = this.fqnToComponentMap.get(extendsFqn);
        if (targetComponentId) {
          relationships.push({
            id: `${classComp.id}-extends-${targetComponentId}`,
            type: RelationshipType.EXTENDS,
            sourceId: classComp.id,
            targetId: targetComponentId,
            metadata: {
              relationship: 'class-extends-class',
              inheritanceType: 'extends',
              targetFqn: extendsFqn,
              isResolved: true
            }
          });
        } else {
          // Create unresolved relationship with FQN for future resolution
          relationships.push({
            id: `${classComp.id}-extends-UNRESOLVED-${extendsFqn}`,
            type: RelationshipType.EXTENDS,
            sourceId: classComp.id,
            targetId: `UNRESOLVED:${extendsFqn}`,
            metadata: {
              relationship: 'class-extends-class',
              inheritanceType: 'extends',
              targetFqn: extendsFqn,
              isResolved: false,
              unresolvedReason: 'Target class not found in current context'
            }
          });
        }
      }
    }
  }

  /**
   * Extract interface implementation relationships (implements)
   */
  private extractPhpImplementationRelationships(components: IComponent[], relationships: IRelationship[]): void {
    const classComponents = components.filter(c => c.type === ComponentType.CLASS);

    for (const classComp of classComponents) {
      const implementsFqns = classComp.metadata?.implementsFqns || [];
      for (const interfaceFqn of implementsFqns) {
        // Try to resolve using FQN mapping first
        const targetComponentId = this.fqnToComponentMap.get(interfaceFqn);
        if (targetComponentId) {
          relationships.push({
            id: `${classComp.id}-implements-${targetComponentId}`,
            type: RelationshipType.IMPLEMENTS,
            sourceId: classComp.id,
            targetId: targetComponentId,
            metadata: {
              relationship: 'class-implements-interface',
              implementationType: 'implements',
              targetFqn: interfaceFqn,
              isResolved: true
            }
          });
        } else {
          // Create unresolved relationship with FQN for future resolution
          relationships.push({
            id: `${classComp.id}-implements-UNRESOLVED-${interfaceFqn}`,
            type: RelationshipType.IMPLEMENTS,
            sourceId: classComp.id,
            targetId: `UNRESOLVED:${interfaceFqn}`,
            metadata: {
              relationship: 'class-implements-interface',
              implementationType: 'implements',
              targetFqn: interfaceFqn,
              isResolved: false,
              unresolvedReason: 'Target interface not found in current context'
            }
          });
        }
      }
    }
  }

  /**
   * Extract trait usage relationships (use)
   */
  private extractPhpTraitUsageRelationships(components: IComponent[], relationships: IRelationship[]): void {
    const classComponents = components.filter(c => c.type === ComponentType.CLASS);

    for (const classComp of classComponents) {
      const usesFqns = classComp.metadata?.uses || [];
      for (const traitFqn of usesFqns) {
        // Try to resolve using FQN mapping first
        const targetComponentId = this.fqnToComponentMap.get(traitFqn);
        if (targetComponentId) {
          relationships.push({
            id: `${classComp.id}-uses-${targetComponentId}`,
            type: RelationshipType.USES,
            sourceId: classComp.id,
            targetId: targetComponentId,
            metadata: {
              relationship: 'class-uses-trait',
              usageType: 'trait',
              targetFqn: traitFqn,
              isResolved: true
            }
          });
        } else {
          // Create unresolved relationship with FQN for future resolution
          relationships.push({
            id: `${classComp.id}-uses-UNRESOLVED-${traitFqn}`,
            type: RelationshipType.USES,
            sourceId: classComp.id,
            targetId: `UNRESOLVED:${traitFqn}`,
            metadata: {
              relationship: 'class-uses-trait',
              usageType: 'trait',
              targetFqn: traitFqn,
              isResolved: false,
              unresolvedReason: 'Target trait not found in current context'
            }
          });
        }
      }
    }
  }

  /**
   * Validate that content is valid PHP
   */
  validateContent(content: string): boolean {
    // PHP files should have <?php or <? tag
    return content.includes('<?php') || content.includes('<?');
  }

  /**
   * Detect language boundaries in PHP files (PHP/HTML)
   */
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[] {
    const boundaries: LanguageBoundary[] = [];
    const lines = content.split('\n');
    let inPhp = false;
    let currentBoundary: LanguageBoundary | null = null;
    
    // Check if file starts with PHP
    const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
    const firstNonEmptyLineIndex = lines.findIndex(line => line.trim().length > 0);
    
    if (firstNonEmptyLine && (firstNonEmptyLine.includes('<?php') || firstNonEmptyLine.includes('<?'))) {
      inPhp = true;
    } else if (firstNonEmptyLine) {
      // File starts with HTML content
      currentBoundary = {
        language: 'html',
        startLine: firstNonEmptyLineIndex + 1,
        startColumn: 0,
        endLine: -1,
        endColumn: -1,
        scope: 'text.html.php'
      };
    }
    
    lines.forEach((line, lineNum) => {
      // Look for PHP open tags
      const phpOpenMatch = line.match(/<\?(?:php|=)?/);
      const phpCloseMatch = line.match(/\?>/);
      
      if (phpOpenMatch && !inPhp) {
        // Close HTML boundary if exists
        if (currentBoundary && currentBoundary.language === 'html') {
          currentBoundary.endLine = lineNum + 1;
          currentBoundary.endColumn = phpOpenMatch.index!;
          boundaries.push(currentBoundary);
        }
        
        // Start PHP boundary
        currentBoundary = {
          language: 'php',
          startLine: lineNum + 1,
          startColumn: phpOpenMatch.index! + phpOpenMatch[0].length,
          endLine: -1,
          endColumn: -1,
          scope: 'source.php'
        };
        inPhp = true;
      }
      
      if (phpCloseMatch && inPhp) {
        // Close PHP boundary
        if (currentBoundary && currentBoundary.language === 'php') {
          currentBoundary.endLine = lineNum + 1;
          currentBoundary.endColumn = phpCloseMatch.index!;
          boundaries.push(currentBoundary);
        }
        
        // Only start HTML boundary if there's content after ?>
        const afterCloseTag = line.substring(phpCloseMatch.index! + 2);
        const hasContentAfter = afterCloseTag.trim().length > 0;
        const hasContentInFuture = lines.slice(lineNum + 1).some(l => l.trim().length > 0);
        
        if (hasContentAfter || hasContentInFuture) {
          // Start HTML boundary
          currentBoundary = {
            language: 'html',
            startLine: lineNum + 1,
            startColumn: phpCloseMatch.index! + 2,
            endLine: -1,
            endColumn: -1,
            scope: 'text.html.php'
          };
          inPhp = false;
        } else {
          // No content after ?>, don't create HTML boundary
          currentBoundary = null;
          inPhp = false;
        }
      }
    });
    
    // Close any open boundary at end of file
    if (currentBoundary) {
      const boundary = currentBoundary as LanguageBoundary;
      if (boundary.endLine === -1) {
        const lastLine = lines[lines.length - 1];
        boundary.endLine = lines.length;
        boundary.endColumn = lastLine ? lastLine.length : 0;
      }
      boundaries.push(boundary);
    }
    
    // If no boundaries were created, the entire file is in one language
    if (boundaries.length === 0) {
      const lastLine = lines[lines.length - 1];
      // Only create a boundary if there's actual content
      if (content.trim().length > 0) {
        boundaries.push({
          language: 'php',  // Pure PHP files should only have PHP language
          startLine: 1,
          startColumn: 0,
          endLine: lines.length,
          endColumn: lastLine ? lastLine.length : 0,
          scope: 'source.php'
        });
      }
    }
    
    // Consolidate adjacent HTML boundaries for better delegation
    const consolidatedBoundaries: LanguageBoundary[] = [];
    let currentHtmlBoundary: LanguageBoundary | null = null;
    
    for (const boundary of boundaries) {
      if (boundary.language === 'html') {
        if (currentHtmlBoundary) {
          // Extend the current HTML boundary
          currentHtmlBoundary.endLine = boundary.endLine;
          currentHtmlBoundary.endColumn = boundary.endColumn;
        } else {
          // Start a new HTML boundary
          currentHtmlBoundary = { ...boundary };
        }
      } else {
        // Non-HTML boundary - close any open HTML boundary first
        if (currentHtmlBoundary) {
          consolidatedBoundaries.push(currentHtmlBoundary);
          currentHtmlBoundary = null;
        }
        consolidatedBoundaries.push(boundary);
      }
    }
    
    // Close any remaining HTML boundary
    if (currentHtmlBoundary) {
      consolidatedBoundaries.push(currentHtmlBoundary);
    }
    
    // Replace original boundaries with consolidated ones
    boundaries.length = 0;
    boundaries.push(...consolidatedBoundaries);
    
    // Also detect SQL in PHP strings
    lines.forEach((line, index) => {
      if (inPhp) {
        // Look for SQL in strings
        const sqlPattern = /["']([^"']*\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b[^"']*)['"]/gi;
        let match;
        
        while ((match = sqlPattern.exec(line)) !== null) {
          const sqlContent = match[1];
          if (sqlContent && sqlContent.length > 20) { // Only consider substantial SQL
            boundaries.push({
              language: 'sql',
              startLine: index + 1,
              startColumn: match.index,
              endLine: index + 1,
              endColumn: match.index + match[0].length,
              scope: 'string.quoted.sql.php'
            });
          }
        }
      }
    });
    
    return boundaries;
  }
}
