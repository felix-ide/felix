/**
 * Python Parser - Uses Python AST to parse Python files
 * 
 * Since we're in a TypeScript/Node.js environment, we'll use a Python subprocess
 * to parse Python files and return the AST as JSON for processing.
 */

import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { PythonStructuralParser } from './PythonStructuralParser.js';
import type { ParseError, ParserOptions, LanguageBoundary } from '../interfaces/ILanguageParser.js';
import {
  IComponent,
  IRelationship,
  ComponentType,
  RelationshipType
} from '../types.js';
import { PythonImportResolver, ResolvedPythonImport } from '../services/PythonImportResolver.js';
import { pythonAstBridge, PythonAstProvider } from '../services/PythonAstBridge.js';

// Python AST node types we care about
interface PythonASTNode {
  _type: string;
  lineno?: number;
  col_offset?: number;
  end_lineno?: number;
  end_col_offset?: number;
  name?: string;
  id?: string;
  arg?: string;
  args?: PythonASTNode[];
  body?: PythonASTNode[];
  decorator_list?: PythonASTNode[];
  bases?: PythonASTNode[];
  keywords?: PythonASTNode[];
  returns?: PythonASTNode;
  annotation?: PythonASTNode;
  value?: PythonASTNode;
  targets?: PythonASTNode[];
  module?: string;
  names?: PythonASTNode[];
  alias?: string;
  asname?: string;
  level?: number; // for ImportFrom
}

/**
 * Python parser using Python's AST module via subprocess
 */
export class PythonParser extends PythonStructuralParser {
  private importResolver: PythonImportResolver;
  private lastParsedAst: PythonASTNode | null = null;
  private bridge: PythonAstProvider;

  constructor(bridge: PythonAstProvider = pythonAstBridge, importResolver?: PythonImportResolver) {
    super('python', ['.py', '.pyw', '.pyi']);
    this.bridge = bridge;
    this.importResolver = importResolver ?? new PythonImportResolver(this.bridge);
  }

  /**
   * Get Python specific ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [
      ...this.getBaseIgnorePatterns(),
      
      // Python package managers and virtual environments
      '**/__pycache__/**',
      '**/__pycache__',
      '**/venv/**',
      '**/venv',
      '**/.venv/**',
      '**/.venv',
      '**/env/**',
      '**/env',
      '**/.env/**',
      '**/.env',
      '**/site-packages/**',
      '**/site-packages',
      '**/lib/python*/**',
      
      // Python build/distribution
      '**/build/**',
      '**/build',
      '**/dist/**',
      '**/dist',
      '**/*.egg-info/**',
      '**/*.egg-info',
      
      // Django framework
      '**/staticfiles/**',
      '**/media/**',
      '**/.static/**',
      '**/static/admin/**',
      '**/django_cache/**',
      
      // Flask framework
      '**/instance/**',
      
      // FastAPI
      '**/.pytest_cache/**',
      '**/.pytest_cache',
      
      // Testing and coverage
      '**/.pytest_cache/**',
      '**/.pytest_cache',
      '**/.coverage',
      '**/htmlcov/**',
      '**/htmlcov',
      '**/.tox/**',
      '**/.tox',
      '**/.nox/**',
      '**/.nox',
      
      // Documentation
      '**/docs/_build/**',
      '**/docs/build/**',
      
      // IDE/Editor specific
      '**/.python-version',
      '**/.pyenv-version',
      
      // Jupyter notebooks checkpoints
      '**/.ipynb_checkpoints/**',
      '**/.ipynb_checkpoints',
      
      // Conda
      '**/conda-meta/**',
      '**/pkgs/**',
      
      // Poetry
      '**/poetry.lock',
      
      // Pipenv
      '**/Pipfile.lock',
      
      // mypy
      '**/.mypy_cache/**',
      '**/.mypy_cache',
      
      // Bandit
      '**/.bandit',
      
      // Pylint
      '**/.pylint.d/**',
      '**/.pylint.d'
    ];
  }

  /**
   * Override capabilities for semantic Python parsing
   */
  protected getCapabilities() {
    return {
      symbols: true,
      relationships: true,
      ranges: true,
      types: true,          // Python has good type annotation support
      controlFlow: true,
      incremental: false    // Python AST doesn't support our incremental interface
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
   * Validate syntax using Python's AST parser
   */
  async validateSyntax(content: string): Promise<ParseError[]> {
    try {
      const result = await this.bridge.parseContent('<memory>.py', content);
      if (result.success) {
        return [];
      }

      const location = result.lineno
        ? this.createLocation(result.lineno, result.lineno, result.offset || 0, result.offset || 0)
        : undefined;

      return [
        this.createParseError(
          result.message || 'Python syntax error',
          location,
          result.error || 'SYNTAX_ERROR',
          'error'
        )
      ];
    } catch (error) {
      return [
        this.createParseError(
          `Python parsing failed: ${error}`,
          undefined,
          'PARSE_ERROR',
          'error'
        )
      ];
    }
  }

  /**
   * Detect components in Python content
   */
  async detectComponents(content: string, filePath: string): Promise<IComponent[]> {
    this.clearContext();

    const components: IComponent[] = [];
    this.lastParsedAst = null;
    const { moduleComponent } = this.beginFileModuleContext(filePath, content, components);

    try {
      const parseResult = await this.bridge.parseContent(filePath, content);

      if (parseResult.success && parseResult.ast) {
        this.lastParsedAst = parseResult.ast as PythonASTNode;
        this.extractComponentsFromAST(this.lastParsedAst, components, filePath, content);
      }
    } catch (error) {
      console.error('Python parsing error:', error);
    } finally {
      this.endFileModuleContext();
    }

    if (moduleComponent && !components.includes(moduleComponent)) {
      components.push(moduleComponent);
    }

    return components;
  }

  /**
   * Detect relationships between components
   */
  async detectRelationships(components: IComponent[], content: string, filePath?: string): Promise<IRelationship[]> {
    const relationships: IRelationship[] = [];
    const seenRelationshipIds = new Set<string>();

    const pushRelationships = (rels: IRelationship[]) => {
      for (const rel of rels) {
        if (!rel.id) {
          rel.id = this.generateRelationshipId(rel.sourceId, rel.targetId, rel.type as string);
        }
        if (seenRelationshipIds.has(rel.id)) continue;
        seenRelationshipIds.add(rel.id);
        relationships.push(rel);
      }
    };

    try {
      // === COMPOSE BASE PARSER RELATIONSHIP EXTRACTION METHODS ===

      // 1. Base parser's usage relationships (function calls, property access, variable references)
      pushRelationships(this.extractUsageRelationships(components, content));

      // 2. Base parser's inheritance relationships (might catch some patterns)
      pushRelationships(this.extractInheritanceRelationships(components, content));

      // 3. Enhanced import/export relationships using import resolver
      pushRelationships(this.extractImportExportRelationships(components, content));

      // 4. Base parser's smart containment detection (file->component, class->method)
      pushRelationships(this.extractContainmentRelationships(components));

      pushRelationships(this.linkModuleContainment(components));

      pushRelationships(this.linkPythonInheritanceRelationships(components));

      // PRIMARY PARSER: Add semantic data flow analysis
      const semanticRelationships = await this.analyzePythonDataFlow(components, content);
      pushRelationships(semanticRelationships);

      // === ADD PYTHON-SPECIFIC ENHANCEMENTS (already implemented) ===
      // Note: The Python parser already has enhanced extractUsageRelationships,
      // extractImportExportRelationships methods that override the base parser

    } catch (error) {
      console.warn(`Failed to extract Python relationships: ${error}`);
    }

    return relationships;
  }

  /**
   * Analyze Python-specific semantic data flow patterns (PRIMARY PARSER)
   */
  private async analyzePythonDataFlow(components: IComponent[], content: string): Promise<IRelationship[]> {
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

          // Track decorators (Python-specific)
          const decorators = component.metadata?.decorators;
          if (Array.isArray(decorators)) {
            decorators.forEach((decorator: string) => {
              relationships.push({
                id: `${component.id}-decorated-by-${decorator}`,
                sourceId: component.id,
                targetId: decorator,
                type: 'decorates' as any,
                metadata: { decorator }
              });
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
      console.warn('DataFlowAnalyzer failed for Python:', error);
      return [];
    }
  }

  /**
   * Extract components from Python AST
   */
  private extractComponentsFromAST(ast: PythonASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!ast || typeof ast !== 'object') {
      return;
    }

    // Process current node
    switch (ast._type) {
      case 'ClassDef':
        this.extractClassComponent(ast, components, filePath, content);
        // Don't traverse children here - extractClassComponent handles it
        return;
      case 'FunctionDef':
      case 'AsyncFunctionDef':
        this.extractFunctionComponent(ast, components, filePath, content);
        // Don't traverse children here - extractFunctionComponent handles it
        return;
      case 'Assign':
        this.extractVariableComponent(ast, components, filePath, content);
        break;
      case 'Import':
        this.extractImportComponents(ast, components, filePath, content);
        break;
      case 'ImportFrom':
        this.extractImportFromComponents(ast, components, filePath, content);
        break;
    }

    // Recursively process child nodes
    if (ast.body && Array.isArray(ast.body)) {
      for (const child of ast.body) {
        this.extractComponentsFromAST(child, components, filePath, content);
      }
    }
    
    // Process other node collections
    ['decorator_list', 'args', 'bases', 'keywords'].forEach(field => {
      if (ast[field as keyof PythonASTNode] && Array.isArray(ast[field as keyof PythonASTNode])) {
        for (const child of ast[field as keyof PythonASTNode] as PythonASTNode[]) {
          this.extractComponentsFromAST(child, components, filePath, content);
        }
      }
    });
  }

  /**
   * Extract class component from Python AST
   */
  private extractClassComponent(node: PythonASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const location = this.createLocationFromNode(node);
    const className = node.name;

    const moduleName = this.currentModuleName;
    const baseClasses = this.extractBaseClasses(node);
    const fullName = this.buildFullName(moduleName, className);

    const classComponent: IComponent = {
      id: this.generateComponentId(filePath, className, ComponentType.CLASS),
      name: className,
      type: ComponentType.CLASS,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
      parentId: this.getCurrentParentId(),
      metadata: {
        accessModifier: 'public', // Python doesn't have explicit access modifiers
        isExported: true, // Python classes are generally accessible
        baseClasses,
        decorators: this.extractDecorators(node),
        isAbstract: this.hasAbstractMethods(node),
        methods: this.extractClassMethods(node),
        properties: this.extractClassProperties(node),
        documentation: this.extractDocstring(node, content),
        ...(moduleName ? { module: moduleName } : {}),
        ...(fullName ? { fullName } : {})
      }
    };

    components.push(classComponent);

    // Push class context for nested components
    this.pushContext(classComponent);

    // Extract methods and properties as separate components
    if (node.body && Array.isArray(node.body)) {
      for (const bodyNode of node.body) {
        this.extractComponentsFromAST(bodyNode, components, filePath, content);
      }
    }

    // Pop class context
    this.popContext();
  }

  private extractImportComponents(node: PythonASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!Array.isArray(node.names) || node.names.length === 0) return;
    const location = this.createLocationFromNode(node);
    const codeSnippet = this.extractSourceCodeByRange(content, location.startLine, location.endLine);
    const parentId = this.getCurrentParentId();
    const moduleName = this.currentModuleName;

    for (const aliasNode of node.names as PythonASTNode[]) {
      const moduleTarget = (aliasNode as any)?.name || (aliasNode as any)?.id;
      if (!moduleTarget) continue;
      const alias = (aliasNode as any)?.asname || undefined;
      const componentId = this.generateComponentId(
        filePath,
        `import-module-${moduleTarget}-${location.startLine}-${alias ?? 'direct'}`,
        ComponentType.IMPORT
      );

      components.push({
        id: componentId,
        name: alias ? `${moduleTarget} as ${alias}` : String(moduleTarget),
        type: ComponentType.IMPORT,
        language: this.language,
        filePath,
        location,
        parentId,
        code: codeSnippet,
        metadata: {
          importKind: 'module',
          module: String(moduleTarget),
          alias,
          line: location.startLine,
          column: location.startColumn || 0,
          ...(moduleName ? { moduleName } : {})
        }
      });
    }
  }

  private extractImportFromComponents(node: PythonASTNode, components: IComponent[], filePath: string, content: string): void {
    const names = Array.isArray(node.names) ? (node.names as PythonASTNode[]) : [];
    if (names.length === 0) return;

    const location = this.createLocationFromNode(node);
    const codeSnippet = this.extractSourceCodeByRange(content, location.startLine, location.endLine);
    const parentId = this.getCurrentParentId();
    const moduleRaw = node.module || '';
    const level = typeof node.level === 'number' ? node.level : 0;
    const normalizedModule = this.normalizeRelativeModule(moduleRaw, level, filePath) || moduleRaw;
    const moduleName = this.currentModuleName;

    names.forEach((aliasNode, index) => {
      const importedName = (aliasNode as any)?.name || (aliasNode as any)?.id || '*';
      const alias = (aliasNode as any)?.asname || undefined;

      const importKind = importedName === '*' ? 'wildcard' : 'named';
      const descriptor = importKind === 'wildcard'
        ? `${normalizedModule}-wildcard`
        : `${normalizedModule}-${importedName}`;

      const componentId = this.generateComponentId(
        filePath,
        `import-from-${descriptor}-${location.startLine}-${index}`,
        ComponentType.IMPORT
      );

      components.push({
        id: componentId,
        name: importKind === 'wildcard'
          ? `from ${normalizedModule || moduleRaw} import *`
          : `${normalizedModule || moduleRaw}.${importedName}`,
        type: ComponentType.IMPORT,
        language: this.language,
        filePath,
        location,
        parentId,
        code: codeSnippet,
        metadata: {
          importKind,
          module: normalizedModule || moduleRaw,
          moduleRaw,
          relLevel: level,
          importedName: importKind === 'wildcard' ? undefined : importedName,
          alias,
          line: location.startLine,
          column: location.startColumn || 0,
          ...(moduleName ? { moduleName } : {})
        }
      });
    });
  }

  /**
   * Extract function component from Python AST
   */
  private extractFunctionComponent(node: PythonASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const location = this.createLocationFromNode(node);
    const functionName = node.name;

    // Check if this is a method (has a class parent in the context)
    const parentComponent = this.context.componentStack[this.context.componentStack.length - 1];
    const isMethod = parentComponent && parentComponent.type === ComponentType.CLASS;
    const componentType = isMethod ? ComponentType.METHOD : ComponentType.FUNCTION;

    const moduleName = this.currentModuleName;
    const parentFullName = parentComponent?.metadata?.fullName || (parentComponent ? this.buildFullName(moduleName, parentComponent.name) : undefined);
    const fullName = isMethod
      ? this.buildFullName(parentFullName, functionName)
      : this.buildFullName(moduleName, functionName);

    const functionComponent: IComponent = {
      id: this.generateComponentId(filePath, functionName, componentType),
      name: functionName,
      type: componentType,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
      parentId: this.getCurrentParentId(),
      metadata: {
        parameters: this.extractFunctionParameters(node),
        isExported: true,
        isAsync: node._type === 'AsyncFunctionDef',
        decorators: this.extractDecorators(node),
        returnType: this.extractReturnType(node),
        documentation: this.extractDocstring(node, content),
        ...(moduleName ? { module: moduleName } : {}),
        ...(fullName ? { fullName } : {}),
        ...(parentFullName && isMethod ? { classFullName: parentFullName } : {})
      }
    };

    // Add class context if it's a method
    if (isMethod && parentComponent) {
      functionComponent.metadata.className = parentComponent.name;
    }

    components.push(functionComponent);

    // Push function context for nested components
    this.pushContext(functionComponent);

    // Process function body
    if (node.body && Array.isArray(node.body)) {
      for (const child of node.body) {
        this.extractComponentsFromAST(child, components, filePath, content);
      }
    }

    // Pop function context
    this.popContext();
  }

  /**
   * Extract method component from Python AST
   */
  private extractMethodComponent(node: PythonASTNode, components: IComponent[], filePath: string, content: string, className: string): void {
    if (!node.name) return;

    const location = this.createLocationFromNode(node);
    const methodName = node.name;

    const methodComponent: IComponent = {
      id: this.generateComponentId(filePath, methodName, ComponentType.METHOD),
      name: methodName,
      type: ComponentType.METHOD,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
      metadata: {
        parameters: this.extractFunctionParameters(node),
        accessModifier: this.getMethodAccessModifier(methodName),
        className: className,
        isAsync: node._type === 'AsyncFunctionDef',
        isStatic: this.isStaticMethod(node),
        isClassMethod: this.isClassMethod(node),
        isProperty: this.isPropertyMethod(node),
        isConstructor: methodName === '__init__',
        decorators: this.extractDecorators(node),
        documentation: this.extractDocstring(node, content)
      }
    };

    components.push(methodComponent);
  }

  /**
   * Extract variable component from Python AST
   */
  private extractVariableComponent(node: PythonASTNode, components: IComponent[], filePath: string, content: string): void {
    if (!node.targets || !Array.isArray(node.targets)) return;

    // Check if we're at module level or class level
    const parentComponent = this.context.componentStack[this.context.componentStack.length - 1];
    const isModuleLevel = parentComponent && parentComponent.type === ComponentType.FILE;
    const isClassLevel = parentComponent && parentComponent.type === ComponentType.CLASS;

    // Skip local variables inside functions/methods
    if (!isModuleLevel && !isClassLevel) {
      return;
    }

    // Handle simple assignments like: x = 5
    for (const target of node.targets) {
      if (target._type === 'Name' && target.id) {
        const location = this.createLocationFromNode(node);
        const variableName = target.id;

        const moduleName = this.currentModuleName;
        const parentFullName = parentComponent?.metadata?.fullName || (parentComponent ? this.buildFullName(moduleName, parentComponent.name) : undefined);
        const fullName = isClassLevel
          ? this.buildFullName(parentFullName, variableName)
          : this.buildFullName(moduleName, variableName);

        const variableComponent: IComponent = {
          id: this.generateComponentId(filePath, variableName, isClassLevel ? ComponentType.PROPERTY : ComponentType.VARIABLE),
          name: variableName,
          type: isClassLevel ? ComponentType.PROPERTY : ComponentType.VARIABLE,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
            metadata: {
              scope: this.getVariableScope(variableName),
              type: this.inferVariableType(node.value),
              isConstant: this.isConstantVariable(variableName),
              isExported: true,
              isModuleLevel,
              isClassLevel,
              ...(moduleName ? { module: moduleName } : {}),
              ...(fullName ? { fullName } : {})
            }
          };

        // Add class context if it's a class variable
        if (isClassLevel && parentComponent) {
          variableComponent.metadata.className = parentComponent.name;
          if (parentFullName) {
            variableComponent.metadata.classFullName = parentFullName;
          }
        }

        components.push(variableComponent);
      }
    }
  }

  /**
   * Create file component
   */
  protected createFileComponent(filePath: string, content: string): IComponent {
    const lines = content.split('\n');
    const stats = {
      size: Buffer.byteLength(content, 'utf8'),
      lineCount: lines.length,
      extension: '.py'
    };
    const moduleName = this.computeModuleName(filePath);

    return {
      id: this.generateComponentId(filePath, this.getFileName(filePath), ComponentType.FILE),
      name: this.getFileName(filePath),
      type: ComponentType.FILE,
      language: this.language,
      filePath,
      location: this.createLocation(1, stats.lineCount),
      code: content, // No truncation - store full file content
      metadata: {
        size: stats.size,
        extension: stats.extension,
        modificationTime: Date.now(),
        lineCount: stats.lineCount,
        isModule: this.isModule(content),
        encoding: 'utf-8',
        ...(moduleName ? { module: moduleName, moduleName } : {})
      }
    };
  }

  // Helper methods
  private createLocationFromNode(node: PythonASTNode) {
    const startLine = node.lineno || 1;
    const endLine = node.end_lineno || startLine;
    const startCol = node.col_offset || 0;
    const endCol = node.end_col_offset || startCol;
    
    return this.createLocation(startLine, endLine, startCol, endCol);
  }

  private extractQualifiedName(node?: PythonASTNode): string | undefined {
    if (!node) return undefined;

    if (node._type === 'Name' && node.id) {
      return node.id;
    }

    if (node._type === 'Attribute') {
      const value = this.extractQualifiedName((node as any).value);
      const attr = (node as any).attr || ((node as any).value && (node as any).value.id) || (node as any).id;
      if (attr && value) {
        return `${value}.${attr}`;
      }
      return attr || value || undefined;
    }

    if ((node as any).id) {
      return (node as any).id as string;
    }

    return undefined;
  }

  private extractBaseClasses(node: PythonASTNode): string[] {
    if (!node.bases || !Array.isArray(node.bases)) return [];

    return node.bases
      .map(base => this.extractQualifiedName(base))
      .filter((name): name is string => Boolean(name) && name !== 'object');
  }

  private extractDecorators(node: PythonASTNode): string[] {
    if (!node.decorator_list || !Array.isArray(node.decorator_list)) return [];
    
    return node.decorator_list
      .filter(decorator => decorator._type === 'Name' && decorator.id)
      .map(decorator => `@${decorator.id}`)
      .filter(Boolean);
  }

  private hasAbstractMethods(node: PythonASTNode): boolean {
    if (!node.body || !Array.isArray(node.body)) return false;
    
    return node.body.some(bodyNode => 
      (bodyNode._type === 'FunctionDef' || bodyNode._type === 'AsyncFunctionDef') &&
      bodyNode.decorator_list?.some(decorator => 
        decorator._type === 'Name' && decorator.id === 'abstractmethod'
      )
    );
  }

  private extractClassMethods(node: PythonASTNode): string[] {
    if (!node.body || !Array.isArray(node.body)) return [];
    
    return node.body
      .filter(bodyNode => bodyNode._type === 'FunctionDef' || bodyNode._type === 'AsyncFunctionDef')
      .map(bodyNode => bodyNode.name!)
      .filter(Boolean);
  }

  private extractClassProperties(node: PythonASTNode): string[] {
    // This would require more sophisticated analysis of property decorators
    // For now, return empty array
    return [];
  }

  private extractDocstring(node: PythonASTNode, content: string): string | undefined {
    if (!node.body || !Array.isArray(node.body) || node.body.length === 0) return;
    
    const firstNode = node.body[0];
    if (firstNode && firstNode._type === 'Expr' && firstNode.value?._type === 'Str') {
      return (firstNode.value as any).s || (firstNode.value as any).value;
    }
    
    return undefined;
  }

  private extractFunctionParameters(node: PythonASTNode): Array<{name: string; type?: string; defaultValue?: string; isOptional?: boolean}> {
    if (!node.args) return [];
    
    const params: Array<{name: string; type?: string; defaultValue?: string; isOptional?: boolean}> = [];
    
    // Handle regular arguments
    const args = node.args as any;
    if (args && args.args && Array.isArray(args.args)) {
      for (const arg of args.args) {
        if (arg.arg) {
          const paramObj: any = {
            name: arg.arg,
            isOptional: false
          };
          const typeAnnotation = this.extractTypeAnnotation(arg.annotation);
          if (typeAnnotation) {
            paramObj.type = typeAnnotation;
          }
          params.push(paramObj);
        }
      }
    }
    
    // Handle keyword arguments with defaults
    if (args && args.defaults && Array.isArray(args.defaults)) {
      const defaultCount = args.defaults.length;
      const argCount = args.args?.length || 0;
      const startIndex = argCount - defaultCount;
      
      args.defaults.forEach((defaultValue: any, index: number) => {
        const paramIndex = startIndex + index;
        if (params[paramIndex]) {
          params[paramIndex]!.defaultValue = this.extractDefaultValue(defaultValue);
          params[paramIndex]!.isOptional = true;
        }
      });
    }
    
    return params;
  }

  private extractReturnType(node: PythonASTNode): string | undefined {
    return this.extractTypeAnnotation(node.returns);
  }

  private extractTypeAnnotation(annotation: PythonASTNode | undefined): string | undefined {
    if (!annotation) return undefined;
    
    if (annotation._type === 'Name' && annotation.id) {
      return annotation.id;
    }
    
    // Handle more complex type annotations if needed
    return undefined;
  }

  private extractDefaultValue(value: PythonASTNode): string {
    if (!value) return '';
    
    switch (value._type) {
      case 'Num':
        return String((value as any).n);
      case 'Str':
        return `"${(value as any).s || (value as any).value}"`;
      case 'Constant':
        return String(value.value);
      case 'NameConstant':
        return String(value.value);
      default:
        return '';
    }
  }

  private getMethodAccessModifier(methodName: string): 'public' | 'private' | 'protected' {
    if (methodName.startsWith('__') && methodName.endsWith('__')) {
      return 'public'; // Magic methods are public
    } else if (methodName.startsWith('__')) {
      return 'private'; // Name mangling
    } else if (methodName.startsWith('_')) {
      return 'protected'; // Convention for protected
    }
    return 'public';
  }

  private isStaticMethod(node: PythonASTNode): boolean {
    return node.decorator_list?.some(decorator => 
      decorator._type === 'Name' && decorator.id === 'staticmethod'
    ) || false;
  }

  private isClassMethod(node: PythonASTNode): boolean {
    return node.decorator_list?.some(decorator => 
      decorator._type === 'Name' && decorator.id === 'classmethod'
    ) || false;
  }

  private isPropertyMethod(node: PythonASTNode): boolean {
    return node.decorator_list?.some(decorator => 
      decorator._type === 'Name' && decorator.id === 'property'
    ) || false;
  }

  private getVariableScope(variableName: string): string {
    if (variableName === variableName.toUpperCase() && /[A-Z]/.test(variableName)) return 'global'; // Convention for constants
    return 'local';
  }

  private inferVariableType(value: PythonASTNode | undefined): string {
    if (!value) return 'unknown';
    
    switch (value._type) {
      case 'Num':
        return 'number';
      case 'Str':
        return 'string';
      case 'List':
        return 'list';
      case 'Dict':
        return 'dict';
      case 'Set':
        return 'set';
      case 'Tuple':
        return 'tuple';
      case 'NameConstant':
        return typeof value.value;
      case 'Constant':
        return typeof value.value;
      default:
        return 'unknown';
    }
  }

  private isConstantVariable(variableName: string): boolean {
    return variableName === variableName.toUpperCase() && /[A-Z]/.test(variableName); // Python convention
  }

  private isModule(content: string): boolean {
    return /\b(?:import|from)\s+\w+/.test(content) ||
           /\bdef\s+\w+/.test(content) ||
           /\bclass\s+\w+/.test(content);
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
      console.warn('Python AST unavailable while extracting variables; run detectComponents first.');
      return components;
    }

    try {
      this.extractVariablesFromAST(this.lastParsedAst, components, filePath, content);
    } catch (error) {
      console.warn(`Failed to extract Python variables: ${error}`);
    }

    return components;
  }

  /**
   * Enhanced AST tracking: Extract __init__ methods (Python constructors)
   */
  extractConstructorComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];

    if (!this.lastParsedAst) {
      console.warn('Python AST unavailable while extracting constructors; run detectComponents first.');
      return components;
    }

    try {
      this.extractConstructorsFromAST(this.lastParsedAst, components, filePath, content);
    } catch (error) {
      console.warn(`Failed to extract Python constructors: ${error}`);
    }

    return components;
  }

  /**
   * Enhanced AST tracking: Extract @property decorators and getters/setters
   */
  extractAccessorComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      // Use regex patterns for property detection
      const lines = content.split('\n');
      let currentClass = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        
        // Track current class context
        const classMatch = line.match(/^class\s+(\w+)/);
        if (classMatch) {
          currentClass = classMatch[1]!;
          continue;
        }
        
        // Find @property decorators
        const propertyMatch = line.match(/^\s*@property/);
        if (propertyMatch && i + 1 < lines.length) {
          const nextLine = lines[i + 1]!;
          const methodMatch = nextLine.match(/^\s*def\s+(\w+)\s*\(/);
          
          if (methodMatch) {
            const propertyName = methodMatch[1]!;
            
            const component: IComponent = {
              id: this.generateComponentId(filePath, `${currentClass}.${propertyName}`, ComponentType.PROPERTY),
              name: propertyName,
              type: ComponentType.PROPERTY,
              language: this.language,
              filePath,
              location: this.createLocation(i + 1, i + 2),
              metadata: {
                className: currentClass,
                isProperty: true,
                isGetter: true,
                decorator: '@property',
                accessModifier: this.getMethodAccessModifier(propertyName),
                documentation: this.extractDocstringFromLines(lines, i + 2)
              }
            };
            
            components.push(component);
          }
        }
        
        // Find @{property}.setter decorators
        const setterMatch = line.match(/^\s*@(\w+)\.setter/);
        if (setterMatch && i + 1 < lines.length) {
          const propertyName = setterMatch[1]!;
          const nextLine = lines[i + 1]!;
          const methodMatch = nextLine.match(/^\s*def\s+(\w+)\s*\(/);
          
          if (methodMatch) {
            const component: IComponent = {
              id: this.generateComponentId(filePath, `${currentClass}.${propertyName}.setter`, ComponentType.METHOD),
              name: `${propertyName}.setter`,
              type: ComponentType.METHOD,
              language: this.language,
              filePath,
              location: this.createLocation(i + 1, i + 2),
              metadata: {
                className: currentClass,
                isProperty: true,
                isSetter: true,
                decorator: `@${propertyName}.setter`,
                accessModifier: this.getMethodAccessModifier(propertyName),
                documentation: this.extractDocstringFromLines(lines, i + 2)
              }
            };
            
            components.push(component);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to extract Python accessors: ${error}`);
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
        const line = lines[i]!;
        
        // Track context
        const classMatch = line.match(/^class\s+(\w+)/);
        if (classMatch) {
          currentClass = classMatch[1]!;
          currentMethod = '';
          continue;
        }
        
        const methodMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
        if (methodMatch) {
          currentMethod = methodMatch[1]!;
          continue;
        }
        
        // Find property assignments: self.property = value
        const selfAssignMatch = line.match(/^\s*self\.(\w+)\s*=\s*(.+)$/);
        if (selfAssignMatch && currentClass && currentMethod) {
          const propertyName = selfAssignMatch[1]!;
          const value = selfAssignMatch[2]!.trim();
          
          const component: IComponent = {
            id: this.generateComponentId(filePath, `${currentClass}.${propertyName}_assign_${i + 1}`, ComponentType.PROPERTY),
            name: `${currentClass}.${propertyName}`,
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
              valueType: this.inferPythonType(value),
              accessModifier: this.getMethodAccessModifier(propertyName)
            }
          };
          
          components.push(component);
        }
        
        // Find object property assignments: obj.prop = value
        const objAssignMatch = line.match(/^\s*(\w+)\.(\w+)\s*=\s*(.+)$/);
        if (objAssignMatch && currentMethod) {
          const objectName = objAssignMatch[1]!;
          const propertyName = objAssignMatch[2]!;
          const value = objAssignMatch[3]!.trim();
          
          const component: IComponent = {
            id: this.generateComponentId(filePath, `${objectName}.${propertyName}_assign_${i + 1}`, ComponentType.PROPERTY),
            name: `${objectName}.${propertyName}`,
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
              valueType: this.inferPythonType(value)
            }
          };
          
          components.push(component);
        }
      }
    } catch (error) {
      console.warn(`Failed to extract Python property assignments: ${error}`);
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
        const line = lines[i]!;
        
        // Track context
        const classMatch = line.match(/^class\s+(\w+)/);
        if (classMatch) {
          currentClass = classMatch[1]!;
          currentMethod = '';
          continue;
        }
        
        const methodMatch = line.match(/^\s*def\s+(\w+)\s*\(/);
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
        
        // Find method calls: obj.method(args)
        const methodCallMatches = line.matchAll(/(\w+)\.(\w+)\s*\(/g);
        for (const match of methodCallMatches) {
          const objectName = match[1]!;
          const methodName = match[2]!;
          
          relationships.push({
            id: `${currentComponent.id}-calls-${objectName}.${methodName}-${i + 1}`,
            type: RelationshipType.CALLS,
            sourceId: currentComponent.id,
            targetId: `UNRESOLVED:${objectName}.${methodName}`,
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
        
        // Find property access: obj.property
        const propertyAccessMatches = line.matchAll(/(\w+)\.(\w+)(?!\s*\()/g);
        for (const match of propertyAccessMatches) {
          const objectName = match[1]!;
          const propertyName = match[2]!;
          
          relationships.push({
            id: `${currentComponent.id}-accesses-${objectName}.${propertyName}-${i + 1}`,
            type: RelationshipType.USES,
            sourceId: currentComponent.id,
            targetId: `UNRESOLVED:${objectName}.${propertyName}`,
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
        const variableMatches = line.matchAll(/\b(\w+)\b/g);
        for (const match of variableMatches) {
          const varName = match[1]!;
          
          // Skip keywords and the current method name
          if (this.isPythonKeyword(varName) || varName === currentMethod) continue;
          
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
      console.warn(`Failed to extract Python usage relationships: ${error}`);
    }
    
    return relationships;
  }

  /**
   * Enhanced AST tracking: Extract Django/Flask framework components
   */
  detectFrameworkComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      const lines = content.split('\n');
      
      // Detect Django components
      if (content.includes('django') || content.includes('from django')) {
        this.extractDjangoComponents(lines, components, filePath);
      }
      
      // Detect Flask components
      if (content.includes('flask') || content.includes('from flask')) {
        this.extractFlaskComponents(lines, components, filePath);
      }
      
      // Detect FastAPI components
      if (content.includes('fastapi') || content.includes('from fastapi')) {
        this.extractFastAPIComponents(lines, components, filePath);
      }
      
    } catch (error) {
      console.warn(`Failed to extract Python framework components: ${error}`);
    }
    
    return components;
  }

  /**
   * Enhanced AST tracking: Extract import/export relationships using import resolver
   */
  extractImportExportRelationships(components: IComponent[], content: string): IRelationship[] {
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) return [];

    // Prefer AST-based extraction when we have a cached AST from detectComponents
    if (this.lastParsedAst) {
      try {
        return this.extractImportRelationshipsFromAst(this.lastParsedAst, fileComponent);
      } catch (e) {
        console.warn('Python AST import extraction failed, falling back to regex:', e);
      }
    }

    // Fallback to regex-based extraction when AST is unavailable
    return this.extractImportRelationshipsRegex(components, content);
  }

  /**
   * Traverse Python AST to extract import relationships (sync)
   */
  private extractImportRelationshipsFromAst(ast: PythonASTNode, fileComponent: IComponent): IRelationship[] {
    const relationships: IRelationship[] = [];

    const visit = (node: PythonASTNode) => {
      if (!node || typeof node !== 'object') return;
      switch (node._type) {
        case 'Import': {
          const names = (node.names || []) as PythonASTNode[];
          for (const n of names) {
            const name = (n as any).name || (n as any).id || '';
            const alias = (n as any).asname || undefined;
            if (!name) continue;
            relationships.push({
              id: `${fileComponent.id}-imports-${name}-${node.lineno || 0}`,
              type: RelationshipType.IMPORTS_FROM,
              sourceId: fileComponent.id,
              targetId: `RESOLVE:${name}`,
              metadata: {
                importKind: 'module',
                moduleName: name,
                specifier: name,
                ...(alias && { alias }),
                line: node.lineno || 0,
                needsResolution: true
              }
            });
          }
          break;
        }
        case 'ImportFrom': {
          const moduleNameRaw = node.module || '';
          const level = typeof node.level === 'number' ? node.level : 0;
          const moduleName = this.normalizeRelativeModule(moduleNameRaw, level, fileComponent.filePath);
          const names = (node.names || []) as PythonASTNode[];
          for (const n of names) {
            const importedName = (n as any).name || (n as any).id || '';
            const alias = (n as any).asname || undefined;
            relationships.push({
              id: `${fileComponent.id}-imports-${importedName}-from-${moduleName}-${node.lineno || 0}`,
              type: RelationshipType.IMPORTS_FROM,
              sourceId: fileComponent.id,
              targetId: `RESOLVE:${moduleName}`,
              metadata: {
                importKind: 'named',
                moduleName,
                moduleRaw: moduleNameRaw,
                relLevel: level,
                importedName,
                specifier: moduleName,
                ...(alias && { alias }),
                line: node.lineno || 0,
                needsResolution: true
              }
            });
          }
          break;
        }
      }

      // Recurse into children arrays common on Python AST
      const childArrays: (keyof PythonASTNode)[] = ['body', 'decorator_list', 'args', 'bases', 'keywords', 'targets', 'names'];
      for (const key of childArrays) {
        const arr = (node as any)[key];
        if (Array.isArray(arr)) arr.forEach((child: any) => visit(child));
      }
    };

    visit(ast);
    return relationships;
  }

  /**
   * Normalize a relative import to a dotted module path based on filePath.
   * This is a best-effort; full resolution remains for the resolver pass.
   */
  private normalizeRelativeModule(moduleName: string, level: number, filePath: string): string {
    try {
      if (!level || level <= 0) return moduleName || '';
      const pkgParts = this.getPythonPackageParts(filePath);
      // drop 'level' from the end
      const base = pkgParts.slice(0, Math.max(0, pkgParts.length - level));
      const extra = (moduleName || '').split('.').filter(Boolean);
      const joined = base.concat(extra).filter(Boolean).join('.');
      return joined;
    } catch {
      return moduleName || '';
    }
  }

  /**
   * Walk upward from the file directory, collecting directories that contain __init__.py.
   * Returns the package path parts from highest package dir down to the file's directory.
   */
  /**
   * Fallback regex-based import extraction (for backwards compatibility)
   */
  private extractImportRelationshipsRegex(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) return relationships;

    try {
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();

        // Handle 'import module' statements
        const importMatch = line.match(/^import\s+([\w.]+)(?:\s+as\s+(\w+))?/);
        if (importMatch) {
          const moduleName = importMatch[1]!;
          const alias = importMatch[2];

          relationships.push({
            id: `${fileComponent.id}-imports-${moduleName}-${i + 1}`,
            type: RelationshipType.IMPORTS_FROM,
            sourceId: fileComponent.id,
            targetId: `RESOLVE:${moduleName}`,
            metadata: {
              importKind: 'module',
              moduleName: moduleName,
              specifier: moduleName,
              ...(alias && { alias }),
              line: i + 1,
              needsResolution: true,
              unresolvedReason: 'Fallback regex extraction used'
            }
          });
        }

        // Handle 'from module import item' statements
        const fromImportMatch = line.match(/^from\s+([\w.]+)\s+import\s+(.+)/);
        if (fromImportMatch) {
          const moduleName = fromImportMatch[1]!;
          const imports = fromImportMatch[2]!.split(',').map(s => s.trim());

          for (const importItem of imports) {
            const importMatch = importItem.match(/(\w+)(?:\s+as\s+(\w+))?/);
            if (importMatch) {
              const itemName = importMatch[1]!;
              const alias = importMatch[2];

              relationships.push({
                id: `${fileComponent.id}-imports-${itemName}-from-${moduleName}-${i + 1}`,
                type: RelationshipType.IMPORTS_FROM,
                sourceId: fileComponent.id,
                targetId: `RESOLVE:${moduleName}`,
                metadata: {
                  importKind: 'named',
                  moduleName: moduleName,
                  importedName: itemName,
                  specifier: moduleName,
                  ...(alias && { alias }),
                  line: i + 1,
                  needsResolution: true,
                  unresolvedReason: 'Fallback regex extraction used'
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to extract Python import relationships: ${error}`);
    }

    return relationships;
  }

  private extractPythonNamespaceRelationships(moduleComponent: IComponent, components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];
    const moduleName = (moduleComponent.metadata as any)?.moduleName || moduleComponent.name;
    const filePath = moduleComponent.filePath;

    const allowedTypes = new Set<ComponentType>([
      ComponentType.CLASS,
      ComponentType.INTERFACE,
      ComponentType.FUNCTION,
      ComponentType.METHOD,
      ComponentType.PROPERTY,
      ComponentType.VARIABLE,
      ComponentType.CONSTANT,
      ComponentType.DECORATOR,
      ComponentType.MODULE
    ]);

    for (const component of components) {
      if (component.id === moduleComponent.id) continue;
      if (!component.filePath || component.filePath !== filePath) continue;
      if (!allowedTypes.has(component.type as ComponentType)) continue;
      if (component.type === ComponentType.MODULE || component.type === ComponentType.FILE) continue;

      const componentModule = (component.metadata as any)?.module as (string | undefined);
      if (moduleName && componentModule && componentModule !== moduleName) {
        continue;
      }

      const id = this.generateRelationshipId(moduleComponent.id, component.id, RelationshipType.IN_NAMESPACE);
      relationships.push({
        id,
        type: RelationshipType.IN_NAMESPACE,
        sourceId: moduleComponent.id,
        targetId: component.id,
        metadata: {
          relationship: 'module-contains-entity',
          module: moduleName
        }
      });
    }

    return relationships;
  }

  private extractPythonInheritanceRelationships(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];
    const classComponents = components.filter(c => c.type === ComponentType.CLASS);
    if (classComponents.length === 0) return relationships;

    const fullNameIndex = new Map<string, IComponent>();
    const shortNameIndex = new Map<string, IComponent[]>();

    for (const classComponent of classComponents) {
      const metadata = (classComponent.metadata ?? {}) as Record<string, any>;
      const fullName = typeof metadata.fullName === 'string' ? metadata.fullName : undefined;
      if (fullName) {
        fullNameIndex.set(fullName, classComponent);
      }
      const name = (classComponent.name || '').toString();
      if (name) {
        const list = shortNameIndex.get(name) || [];
        list.push(classComponent);
        shortNameIndex.set(name, list);
      }
    }

    const seen = new Set<string>();

    for (const classComponent of classComponents) {
      const metadata = (classComponent.metadata ?? {}) as Record<string, any>;
      const moduleName = typeof metadata.module === 'string' ? metadata.module : undefined;
      const baseClasses: string[] = Array.isArray(metadata.baseClasses) ? metadata.baseClasses : [];
      if (baseClasses.length === 0) continue;

      for (const baseRaw of baseClasses) {
        const baseName = (baseRaw || '').toString().trim();
        if (!baseName) continue;
        if (baseName === 'object') continue;

        let targetComponent: IComponent | undefined = fullNameIndex.get(baseName);

        if (!targetComponent && moduleName) {
          const moduleQualified = `${moduleName}.${baseName}`;
          targetComponent = fullNameIndex.get(moduleQualified);
        }

        if (!targetComponent) {
          const candidates = shortNameIndex.get(baseName);
          if (candidates && candidates.length === 1) {
            targetComponent = candidates[0];
          }
        }

        const targetId = targetComponent ? targetComponent.id : `RESOLVE:${baseName}`;
        const relationshipId = this.generateRelationshipId(classComponent.id, targetId, RelationshipType.EXTENDS);
        if (seen.has(relationshipId)) continue;
        seen.add(relationshipId);

        relationships.push({
          id: relationshipId,
          type: RelationshipType.EXTENDS,
          sourceId: classComponent.id,
          targetId,
          metadata: {
            relationship: 'class-extends-class',
            detection: 'python-ast',
            baseClass: baseName,
            module: moduleName,
            ...(targetComponent ? {} : { needsResolution: true })
          }
        });
      }
    }

    return relationships;
  }

  /**
   * Create unresolved import relationship for failed resolutions
   */
  private createUnresolvedImportRelationship(importStmt: any, fileComponent: IComponent): IRelationship | null {
    try {
      if (importStmt.type === 'Import' && importStmt.names.length > 0) {
        const name = importStmt.names[0].name;
        return {
          id: `${fileComponent.id}-imports-unresolved-${name}-${importStmt.line}`,
          type: RelationshipType.IMPORTS_FROM,
          sourceId: fileComponent.id,
          targetId: `RESOLVE:${name}`,
          metadata: {
            importKind: 'module',
            specifier: name,
            line: importStmt.line,
            column: importStmt.column,
            needsResolution: true,
            unresolvedReason: 'Import resolution failed'
          }
        };
      } else if (importStmt.type === 'ImportFrom') {
        const moduleName = importStmt.module || '';
        const name = importStmt.names.length > 0 ? importStmt.names[0].name : '';
        return {
          id: `${fileComponent.id}-imports-unresolved-${moduleName}.${name}-${importStmt.line}`,
          type: RelationshipType.IMPORTS_FROM,
          sourceId: fileComponent.id,
          targetId: `RESOLVE:${moduleName}`,
          metadata: {
            importKind: 'named',
            specifier: moduleName,
            importedName: name,
            line: importStmt.line,
            column: importStmt.column,
            needsResolution: true,
            unresolvedReason: 'Import resolution failed'
          }
        };
      }
    } catch (error) {
      console.warn(`Failed to create unresolved import relationship: ${error}`);
    }
    return null;
  }

  /**
   * Get workspace root from file path
   */
  private getWorkspaceRoot(filePath: string): string {
    // Simple heuristic: find the directory containing setup.py, pyproject.toml, or .git
    let currentDir = dirname(filePath);
    const maxLevels = 10; // Prevent infinite loops

    for (let i = 0; i < maxLevels; i++) {
      if (existsSync(join(currentDir, 'setup.py')) ||
          existsSync(join(currentDir, 'pyproject.toml')) ||
          existsSync(join(currentDir, '.git'))) {
        return currentDir;
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached root directory
      }
      currentDir = parentDir;
    }

    // Fallback to directory containing the file
    return dirname(filePath);
  }

  // Helper methods for enhanced extraction
  private extractVariablesFromAST(ast: any, components: IComponent[], filePath: string, content: string): void {
    if (!ast || typeof ast !== 'object') return;
    
    // Process global variables and class attributes
    if (ast.body && Array.isArray(ast.body)) {
      for (const node of ast.body) {
        if (node._type === 'Assign') {
          this.extractVariableComponent(node, components, filePath, content);
        }
      }
    }
  }

  private extractConstructorsFromAST(ast: any, components: IComponent[], filePath: string, content: string): void {
    if (!ast || typeof ast !== 'object') return;
    
    if (ast.classes && Array.isArray(ast.classes)) {
      for (const classNode of ast.classes) {
        if (classNode.methods && Array.isArray(classNode.methods)) {
          for (const method of classNode.methods) {
            if (method.name === '__init__') {
              const className = classNode.name;
              const location = this.createLocation(method.startLine || 1, method.startLine || 1);
              
              const constructorComponent: IComponent = {
                id: this.generateComponentId(filePath, `${className}.__init__`, ComponentType.CONSTRUCTOR),
                name: '__init__',
                type: ComponentType.CONSTRUCTOR,
                language: this.language,
                filePath,
                location,
                metadata: {
                  className: className,
                  isConstructor: true,
                  parameters: method.parameters || [],
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

  private extractDjangoComponents(lines: string[], components: IComponent[], filePath: string): void {
    let currentClass = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      
      // Track current class
      const classMatch = line.match(/^class\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[1]!;
        
        // Check if it's a Django model
        if (i + 1 < lines.length && lines[i + 1]!.includes('models.Model')) {
          const component: IComponent = {
            id: this.generateComponentId(filePath, currentClass, ComponentType.CLASS),
            name: currentClass,
            type: ComponentType.CLASS,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              isDjangoModel: true,
              framework: 'Django',
              modelType: 'Model'
            }
          };
          components.push(component);
        }
        
        // Check if it's a Django view
        if (line.includes('View') || line.includes('APIView')) {
          const component: IComponent = {
            id: this.generateComponentId(filePath, currentClass, ComponentType.CLASS),
            name: currentClass,
            type: ComponentType.CLASS,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              isDjangoView: true,
              framework: 'Django',
              viewType: line.includes('APIView') ? 'APIView' : 'View'
            }
          };
          components.push(component);
        }
      }
      
      // Find Django URL patterns
      const urlPatternMatch = line.match(/url\(|path\(/);
      if (urlPatternMatch) {
        const component: IComponent = {
          id: this.generateComponentId(filePath, `url_pattern_${i + 1}`, ComponentType.FUNCTION),
          name: `url_pattern_${i + 1}`,
          type: ComponentType.FUNCTION,
          language: this.language,
          filePath,
          location: this.createLocation(i + 1, i + 1),
          metadata: {
            isDjangoUrlPattern: true,
            framework: 'Django',
            urlPattern: line.trim()
          }
        };
        components.push(component);
      }
    }
  }

  private extractFlaskComponents(lines: string[], components: IComponent[], filePath: string): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      
      // Find Flask app creation
      const appMatch = line.match(/(\w+)\s*=\s*Flask\s*\(/);
      if (appMatch) {
        const appName = appMatch[1]!;
        const component: IComponent = {
          id: this.generateComponentId(filePath, appName, ComponentType.VARIABLE),
          name: appName,
          type: ComponentType.VARIABLE,
          language: this.language,
          filePath,
          location: this.createLocation(i + 1, i + 1),
          metadata: {
            isFlaskApp: true,
            framework: 'Flask',
            appName: appName
          }
        };
        components.push(component);
      }
      
      // Find Flask routes
      const routeMatch = line.match(/@(\w+)\.route\s*\(\s*['"]([^'"]+)['"]/);
      if (routeMatch) {
        const appName = routeMatch[1]!;
        const route = routeMatch[2]!;
        
        // Look for the function definition on the next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]!;
          const funcMatch = nextLine.match(/^\s*def\s+(\w+)\s*\(/);
          
          if (funcMatch) {
            const funcName = funcMatch[1]!;
            const component: IComponent = {
              id: this.generateComponentId(filePath, funcName, ComponentType.FUNCTION),
              name: funcName,
              type: ComponentType.FUNCTION,
              language: this.language,
              filePath,
              location: this.createLocation(i + 1, i + 2),
              metadata: {
                isFlaskRoute: true,
                framework: 'Flask',
                appName: appName,
                route: route,
                routeFunction: funcName
              }
            };
            components.push(component);
          }
        }
      }
    }
  }

  private extractFastAPIComponents(lines: string[], components: IComponent[], filePath: string): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      
      // Find FastAPI app creation
      const appMatch = line.match(/(\w+)\s*=\s*FastAPI\s*\(/);
      if (appMatch) {
        const appName = appMatch[1]!;
        const component: IComponent = {
          id: this.generateComponentId(filePath, appName, ComponentType.VARIABLE),
          name: appName,
          type: ComponentType.VARIABLE,
          language: this.language,
          filePath,
          location: this.createLocation(i + 1, i + 1),
          metadata: {
            isFastAPIApp: true,
            framework: 'FastAPI',
            appName: appName
          }
        };
        components.push(component);
      }
      
      // Find FastAPI routes
      const routeMatch = line.match(/@(\w+)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
      if (routeMatch) {
        const appName = routeMatch[1]!;
        const method = routeMatch[2]!;
        const route = routeMatch[3]!;
        
        // Look for the function definition on the next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]!;
          const funcMatch = nextLine.match(/^\s*(?:async\s+)?def\s+(\w+)\s*\(/);
          
          if (funcMatch) {
            const funcName = funcMatch[1]!;
            const component: IComponent = {
              id: this.generateComponentId(filePath, funcName, ComponentType.FUNCTION),
              name: funcName,
              type: ComponentType.FUNCTION,
              language: this.language,
              filePath,
              location: this.createLocation(i + 1, i + 2),
              metadata: {
                isFastAPIRoute: true,
                framework: 'FastAPI',
                appName: appName,
                httpMethod: method.toUpperCase(),
                route: route,
                routeFunction: funcName,
                isAsync: nextLine.includes('async')
              }
            };
            components.push(component);
          }
        }
      }
    }
  }

  private extractDocstringFromLines(lines: string[], startIndex: number): string | undefined {
    if (startIndex >= lines.length) return undefined;
    
    const line = lines[startIndex]?.trim();
    if (line?.startsWith('"""') || line?.startsWith("'''")) {
      let docstring = line;
      let i = startIndex + 1;
      
      while (i < lines.length) {
        const nextLine = lines[i]!;
        docstring += '\n' + nextLine;
        
        if (nextLine.includes('"""') || nextLine.includes("'''")) {
          break;
        }
        i++;
      }
      
      return docstring.replace(/["']{3}/g, '').trim();
    }
    
    return undefined;
  }

  private inferPythonType(value: string): string {
    if (/^\d+$/.test(value)) return 'int';
    if (/^\d+\.\d+$/.test(value)) return 'float';
    if (/^['"][^'"]*['"]$/.test(value)) return 'str';
    if (value === 'True' || value === 'False') return 'bool';
    if (value === 'None') return 'NoneType';
    if (value.startsWith('[') && value.endsWith(']')) return 'list';
    if (value.startsWith('{') && value.endsWith('}')) return 'dict';
    if (value.startsWith('(') && value.endsWith(')')) return 'tuple';
    return 'unknown';
  }

  private isPythonKeyword(word: string): boolean {
    const keywords = [
      'False', 'None', 'True', 'and', 'as', 'assert', 'break', 'class', 'continue',
      'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
      'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
      'raise', 'return', 'try', 'while', 'with', 'yield'
    ];
    return keywords.includes(word);
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
   * Validate that content is valid Python
   */
  validateContent(content: string): boolean {
    // Check for Python-specific patterns
    // Must have at least one strong Python indicator
    const strongPythonPatterns = [
      /\bdef\s+\w+\s*\([^)]*\)\s*:/,  // Python function definition with colon
      /\bclass\s+\w+.*:\s*$/m,         // Python class definition with colon at end of line
      /\bif\s+__name__\s*==\s*['"']__main__['"]:/,
      /\bfrom\s+\w+\s+import\b/,
      /^\s*import\s+\w+/m,             // Import at start of line
      /\belif\s+.*:/,                  // elif is Python-specific
      /\bexcept\s+\w+\s*:/,            // except with colon
    ];

    // If no strong pattern matches, don't detect as Python
    if (!strongPythonPatterns.some(pattern => pattern.test(content))) {
      return false;
    }

    // Additional validation - check it's not PHP or JS
    if (content.includes('<?php') || content.includes('function(') || content.includes('=>')) {
      return false;
    }

    return true;
  }

  /**
   * Detect language boundaries in Python files
   */
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[] {
    const boundaries: LanguageBoundary[] = [];
    const lines = content.split('\n');
    
    // Default boundary for the entire file
    boundaries.push({
      language: 'python',
      startLine: 1,
      startColumn: 0,
      endLine: lines.length,
      endColumn: lines[lines.length - 1]?.length || 0,
      scope: 'source.python'
    });
    
    // Detect SQL in string literals
    lines.forEach((line, index) => {
      // Look for SQL patterns in strings
      const sqlStringPattern = /(?:'''|"""|['"])([^'"]*\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b[^'"]*)(?:'''|"""|['"])/gi;
      let match;
      
      while ((match = sqlStringPattern.exec(line)) !== null) {
        const sqlContent = match[1];
        if (sqlContent && sqlContent.length > 20) { // Only consider substantial SQL
          boundaries.push({
            language: 'sql',
            startLine: index + 1,
            startColumn: match.index,
            endLine: index + 1,
            endColumn: match.index + match[0].length,
            scope: 'string.quoted.sql.python'
          });
        }
      }
    });
    
    // Detect regex patterns
    lines.forEach((line, index) => {
      const regexPattern = /r['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = regexPattern.exec(line)) !== null) {
        boundaries.push({
          language: 'regex',
          startLine: index + 1,
          startColumn: match.index,
          endLine: index + 1,
          endColumn: match.index + match[0].length,
          scope: 'string.regex.python'
        });
      }
    });
    
    return boundaries;
  }
}
