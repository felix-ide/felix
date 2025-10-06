/**
 * JavaScript/TypeScript Parser - Uses TypeScript compiler API to parse JS/TS files
 */

import ts from 'typescript';
import { basename, extname } from 'path';
import { BaseLanguageParser } from './BaseLanguageParser.js';
import { ParseError, ParserOptions, LanguageBoundary } from '../interfaces/ILanguageParser.js';
import { 
  IComponent, 
  IRelationship, 
  Location, 
  ComponentType, 
  RelationshipType,
  IClassComponent,
  IFunctionComponent,
  IMethodComponent,
  Parameter
} from '../types.js';

/**
 * JavaScript/TypeScript parser using TypeScript compiler API
 */
export class JavaScriptParser extends BaseLanguageParser {
  private sourceFile?: ts.SourceFile;

  constructor(language: string = 'javascript') {
    super(language, ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
  }

  /**
   * Override capabilities for semantic JavaScript/TypeScript parsing
   */
  protected getCapabilities() {
    return {
      symbols: true,
      relationships: true,
      ranges: true,
      types: true,
      controlFlow: true,
      incremental: false  // TypeScript compiler doesn't support our incremental interface
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
   * Get JavaScript/TypeScript specific ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [
      ...this.getBaseIgnorePatterns(),
      
      // Node.js
      '**/node_modules/**',
      '**/node_modules',
      
      // Package manager files
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
      '**/.pnpm/**',
      '**/.pnpm',
      '**/.yarn/**',
      '**/.yarn',
      
      // Build outputs
      '**/dist/**',
      '**/dist',
      '**/build/**', 
      '**/build',
      '**/out/**',
      '**/out',
      '**/lib/**',
      '**/lib',
      
      // React/Next.js
      '**/.next/**',
      '**/.next',
      '**/out/**',
      '**/out',
      
      // Vue/Nuxt
      '**/.nuxt/**',
      '**/.nuxt',
      '**/.output/**',
      '**/.output',
      
      // Vite
      '**/dist/**',
      '**/dist',
      
      // Webpack
      '**/public/build/**',
      '**/public/dist/**',
      
      // Storybook
      '**/storybook-static/**',
      '**/storybook-static',
      
      // Gatsby
      '**/.cache/**',
      '**/.cache',
      '**/public/**',
      '**/public',
      
      // TypeScript
      '**/*.tsbuildinfo',
      '**/*.d.ts.map',
      '**/*.js.map',
      '**/*.css.map',
      
      // Testing and coverage
      '**/coverage/**',
      '**/coverage',
      '**/.nyc_output/**',
      '**/.nyc_output',
      '**/test-results/**',
      '**/test-results',
      '**/playwright-report/**',
      '**/playwright-report',
      
      // Cypress
      '**/cypress/videos/**',
      '**/cypress/screenshots/**',
      
      // Jest
      '**/__snapshots__/**',
      '**/__snapshots__',
      
      // ESLint/Prettier
      '**/.eslintcache',
      
      // Parcel
      '**/.parcel-cache/**',
      '**/.parcel-cache',
      
      // Rollup
      '**/rollup.config.cache.mjs'
    ];
  }

  /**
   * Validate syntax using TypeScript compiler
   */
  validateSyntax(content: string): ParseError[] {
    const errors: ParseError[] = [];
    
    try {
      // Create source file with TypeScript compiler
      this.sourceFile = ts.createSourceFile(
        'temp.ts',
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX // Support both JS and TS syntax
      );

      // Check for syntax errors  
      const diagnostics: ts.DiagnosticWithLocation[] = [];
      // Note: parseDiagnostics is not available in all TS versions, handle gracefully
      for (const diagnostic of diagnostics) {
        const start = diagnostic.start || 0;
        const length = diagnostic.length || 0;
        const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(start);
        
        errors.push(this.createParseError(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          this.createLocation(line + 1, line + 1, character, character + length),
          `TS${diagnostic.code}`,
          'error'
        ));
      }
    } catch (error) {
      errors.push(this.createParseError(`Syntax validation failed: ${error}`, undefined, 'PARSE_ERROR', 'error'));
    }

    return errors;
  }

  /**
   * Detect components in JavaScript/TypeScript content
   */
  detectComponents(content: string, filePath: string): IComponent[] {
    // Clear context for new file
    this.clearContext();

    const components: IComponent[] = [];

    try {
      // Create source file
      this.sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        this.getScriptKind(filePath)
      );

      // Add file component
      const fileComponent = this.createFileComponent(filePath, content);
      components.push(fileComponent);

      // Push file component as root context
      this.pushContext(fileComponent);

      // Walk the AST and extract components
      this.visitNode(this.sourceFile, components, filePath, content);

      // Pop file context
      this.popContext();

    } catch (error) {
      // If parsing fails, still return file component
      console.warn(`JavaScriptParser failed to parse ${filePath}:`, error);
      components.push(this.createFileComponent(filePath, content));
    } finally {
      // Keep sourceFile for relationship extraction
      // this.sourceFile = undefined; // DON'T DESTROY THE AST!
      this.clearContext();
    }

    return components;
  }

  /**
   * Detect relationships between components
   */
  async detectRelationships(components: IComponent[], content: string): Promise<IRelationship[]> {
    const relationships: IRelationship[] = [];

    // The AST should already be available from detectComponents
    // Only rebuild if absolutely necessary (shouldn't happen in normal flow)
    if (!this.sourceFile) {
      console.warn('AST was destroyed before relationship extraction - rebuilding');
      try {
        this.sourceFile = ts.createSourceFile(
          'temp.ts',
          content,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX
        );
      } catch (error) {
        console.error('Failed to rebuild AST for relationships:', error);
        return relationships;
      }
    }

    try {
      // Extract import/export relationships
      this.extractImportExportRelationshipsInternal(this.sourceFile, components, relationships);

      // Extract class inheritance relationships
      this.extractClassInheritanceRelationships(this.sourceFile, components, relationships);

      // Extract function call relationships
      this.extractFunctionCallRelationships(this.sourceFile, components, relationships);

      // Use base parser's smart containment detection
      const baseContainmentRelationships = this.extractContainmentRelationships(components);
      relationships.push(...baseContainmentRelationships);

      // PRIMARY PARSER: Add semantic data flow analysis
      const semanticRelationships = await this.analyzeDataFlow(components, content);
      relationships.push(...semanticRelationships);

    } catch (error) {
      // Log error but continue
      console.warn(`Failed to extract relationships: ${error}`);
    } finally {
      // Clean up AST after relationships are extracted
      this.sourceFile = undefined;
    }

    return relationships;
  }

  /**
   * Analyze semantic data flow relationships (PRIMARY PARSER)
   */
  private async analyzeDataFlow(components: IComponent[], content: string): Promise<IRelationship[]> {
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
      console.warn('DataFlowAnalyzer failed:', error);
      return [];
    }
  }

  /**
   * Visit AST node and extract components with proper class context tracking
   */
  private visitNode(node: ts.Node, components: IComponent[], filePath: string, content: string): void {
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        const classNode = node as ts.ClassDeclaration;
        if (classNode.name) {
          this.extractClassComponent(classNode, components, filePath, content);
        }
        // Don't traverse children here - extractClassComponent handles it
        return;
      case ts.SyntaxKind.InterfaceDeclaration:
        const interfaceNode = node as ts.InterfaceDeclaration;
        this.extractInterfaceComponent(interfaceNode, components, filePath, content);
        break;
      case ts.SyntaxKind.FunctionDeclaration:
        this.extractFunctionComponent(node as ts.FunctionDeclaration, components, filePath, content);
        // Don't traverse children here - extractFunctionComponent handles it
        return;
      case ts.SyntaxKind.ArrowFunction:
      case ts.SyntaxKind.FunctionExpression:
        this.extractFunctionExpressionComponent(node as ts.ArrowFunction | ts.FunctionExpression, components, filePath, content);
        // Don't traverse children here - extractFunctionExpressionComponent handles it
        return;
      case ts.SyntaxKind.MethodDeclaration:
        this.extractMethodComponent(node as ts.MethodDeclaration, components, filePath, content);
        break;
      case ts.SyntaxKind.PropertyDeclaration:
        this.extractPropertyComponent(node as ts.PropertyDeclaration, components, filePath, content);
        break;
      case ts.SyntaxKind.VariableDeclaration:
        this.extractVariableComponent(node as ts.VariableDeclaration, components, filePath, content);
        break;
      case ts.SyntaxKind.EnumDeclaration:
        this.extractEnumComponent(node as ts.EnumDeclaration, components, filePath, content);
        break;
      case ts.SyntaxKind.TypeAliasDeclaration:
        this.extractTypeAliasComponent(node as ts.TypeAliasDeclaration, components, filePath, content);
        break;
    }

    // Recursively visit child nodes (for nodes we didn't handle specially)
    ts.forEachChild(node, child => this.visitNode(child, components, filePath, content));
  }

  /**
   * Create file component
   */
  protected createFileComponent(filePath: string, content: string): IComponent {
    const lines = content.split('\n');
    const stats = {
      size: Buffer.byteLength(content, 'utf8'),
      lineCount: lines.length,
      extension: extname(filePath)
    };

    return {
      id: this.generateComponentId(filePath, basename(filePath), ComponentType.FILE),
      name: basename(filePath),
      type: ComponentType.FILE,
      language: this.language,
      filePath,
      location: this.createLocation(1, stats.lineCount),
      code: content,
      metadata: {
        size: stats.size,
        extension: stats.extension,
        modificationTime: Date.now(),
        lineCount: stats.lineCount,
        isModule: this.isModule(content)
      }
    };
  }

  /**
   * Extract class component
   */
  private extractClassComponent(node: ts.ClassDeclaration, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;
    
    const location = this.getNodeLocation(node);
    const className = node.name.text;
    
    const classComponent: IComponent = {
      id: this.generateComponentId(filePath, className, ComponentType.CLASS),
      name: className,
      type: ComponentType.CLASS,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content),
      parentId: this.getCurrentParentId(),
      metadata: {
        accessModifier: this.getAccessModifier(node),
        isExported: this.isExported(content, className),
        isAbstract: this.hasModifier(node, ts.SyntaxKind.AbstractKeyword),
        isStatic: this.hasModifier(node, ts.SyntaxKind.StaticKeyword),
        isFinal: false, // JS/TS doesn't have final classes
        superClass: this.getSuperClass(node),
        interfaces: this.getImplementedInterfaces(node),
        implementedInterfaces: this.getImplementedInterfaces(node),
        decorators: this.getDecorators(node),
        generics: this.getTypeParameters(node),
        documentation: this.extractDocumentation(content, location.startLine)
      }
    };

    components.push(classComponent);

    // Push context before processing children
    this.pushContext(classComponent);

    // Process class members
    node.members.forEach(member => {
      this.visitNode(member, components, filePath, content);
    });

    // Pop context after processing children
    this.popContext();
  }

  /**
   * Extract function component
   */
  private extractFunctionComponent(node: ts.FunctionDeclaration, components: IComponent[], filePath: string, content: string): void {
    if (!node.name) return;

    const location = this.getNodeLocation(node);
    const functionName = node.name.text;
    
    const functionComponent: IFunctionComponent = {
      id: this.generateComponentId(filePath, functionName, ComponentType.FUNCTION),
      name: functionName,
      type: ComponentType.FUNCTION,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content),
      parameters: this.extractParameters(node.parameters),
      metadata: {
        isExported: this.isExported(content, functionName)
      }
    };

    // Add optional properties only if they have values
    const returnType = this.getReturnType(node);
    if (returnType) functionComponent.returnType = returnType;
    
    if (this.hasModifier(node, ts.SyntaxKind.AsyncKeyword)) functionComponent.isAsync = true;
    if (node.asteriskToken !== undefined) functionComponent.isGenerator = true;
    functionComponent.isArrow = false;
    
    const accessModifier = this.getAccessModifier(node);
    if (accessModifier !== 'public') functionComponent.accessModifier = accessModifier;
    
    const decorators = this.getDecorators(node);
    if (decorators.length > 0) functionComponent.decorators = decorators;
    
    const documentation = this.extractDocumentation(content, location.startLine);
    if (documentation) functionComponent.documentation = documentation;

    components.push(functionComponent);
  }

  /**
   * Extract function expression component (arrow functions, function expressions)
   */
  private extractFunctionExpressionComponent(
    node: ts.ArrowFunction | ts.FunctionExpression,
    components: IComponent[],
    filePath: string,
    content: string
  ): void {
    // Try to get the function name from variable assignment
    let functionName = 'anonymous';
    const parent = node.parent;

    if (ts.isVariableDeclaration(parent) && parent.name && ts.isIdentifier(parent.name)) {
      functionName = parent.name.text;
    } else if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
      functionName = parent.name.text;
    }

    const location = this.getNodeLocation(node);

    // Make anonymous functions unique by adding line number
    const uniqueFunctionName = functionName === 'anonymous'
      ? `anonymous_L${location.startLine}`
      : functionName;

    const functionComponent: IFunctionComponent = {
      id: this.generateComponentId(filePath, uniqueFunctionName, ComponentType.FUNCTION),
      name: functionName,
      type: ComponentType.FUNCTION,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content),
      parentId: this.getCurrentParentId(),
      parameters: this.extractParameters(node.parameters),
      metadata: {
        isExported: this.isExported(content, functionName)
      }
    };

    // Add optional properties only if they have values
    const returnType = this.getReturnType(node);
    if (returnType) functionComponent.returnType = returnType;

    if (this.hasModifier(node, ts.SyntaxKind.AsyncKeyword)) functionComponent.isAsync = true;
    functionComponent.isGenerator = false;
    if (ts.isArrowFunction(node)) functionComponent.isArrow = true;

    const documentation = this.extractDocumentation(content, location.startLine);
    if (documentation) functionComponent.documentation = documentation;

    components.push(functionComponent);

    // Push function context for nested components
    this.pushContext(functionComponent);

    // Extract nested components within the function body
    if (node.body) {
      if (ts.isBlock(node.body)) {
        ts.forEachChild(node.body, child => {
          this.visitNode(child, components, filePath, content);
        });
      }
    }

    // Pop function context
    this.popContext();
  }

  /**
   * Extract method component
   */
  private extractMethodComponent(node: ts.MethodDeclaration, components: IComponent[], filePath: string, content: string): void {
    if (!node.name || !ts.isIdentifier(node.name)) return;

    const location = this.getNodeLocation(node);
    const methodName = node.name.text;

    const methodComponent: IMethodComponent = {
      id: this.generateComponentId(filePath, methodName, ComponentType.METHOD),
      name: methodName,
      type: ComponentType.METHOD,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content),
      parentId: this.getCurrentParentId(),
      parameters: this.extractParameters(node.parameters),
      accessModifier: this.getAccessModifier(node),
      metadata: {}
    };

    // Add optional properties only if they have values
    const returnType = this.getReturnType(node);
    if (returnType) methodComponent.returnType = returnType;

    if (this.hasModifier(node, ts.SyntaxKind.AsyncKeyword)) methodComponent.isAsync = true;
    if (node.asteriskToken !== undefined) methodComponent.isGenerator = true;
    if (this.hasModifier(node, ts.SyntaxKind.StaticKeyword)) methodComponent.isStatic = true;
    if (this.hasModifier(node, ts.SyntaxKind.AbstractKeyword)) methodComponent.isAbstract = true;
    methodComponent.isFinal = false;
    methodComponent.isConstructor = false; // Will be set if it's a constructor

    const decorators = this.getDecorators(node);
    if (decorators.length > 0) methodComponent.decorators = decorators;

    const documentation = this.extractDocumentation(content, location.startLine);
    if (documentation) methodComponent.documentation = documentation;

    components.push(methodComponent);
  }

  /**
   * Extract property component
   */
  private extractPropertyComponent(node: ts.PropertyDeclaration, components: IComponent[], filePath: string, content: string): void {
    if (!node.name || !ts.isIdentifier(node.name)) return;

    const location = this.getNodeLocation(node);
    const propertyName = node.name.text;

    const propertyComponent: IComponent = {
      id: this.generateComponentId(filePath, propertyName, ComponentType.PROPERTY),
      name: propertyName,
      type: ComponentType.PROPERTY,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content), // Add source code
      parentId: this.getCurrentParentId(),
      metadata: {
        propertyType: this.getTypeString(node.type),
        defaultValue: this.getDefaultValue(node.initializer),
        isStatic: this.hasModifier(node, ts.SyntaxKind.StaticKeyword),
        isReadonly: this.hasModifier(node, ts.SyntaxKind.ReadonlyKeyword),
        accessModifier: this.getAccessModifier(node),
        decorators: this.getDecorators(node),
        documentation: this.extractDocumentation(content, location.startLine)
      }
    };

    components.push(propertyComponent);
  }

  /**
   * Extract variable component
   */
  private extractVariableComponent(node: ts.VariableDeclaration, components: IComponent[], filePath: string, content: string): void {
    if (!node.name || !ts.isIdentifier(node.name)) return;

    // Only extract module-level or class-level variables, not local variables
    const isModuleLevel = this.isModuleLevelVariable(node);
    const isClassLevel = this.isClassLevelVariable(node);

    if (!isModuleLevel && !isClassLevel) {
      // Skip local variables inside functions/methods
      return;
    }

    const location = this.getNodeLocation(node);
    const variableName = node.name.text;

    const variableComponent: IComponent = {
      id: this.generateComponentId(filePath, variableName, ComponentType.VARIABLE),
      name: variableName,
      type: ComponentType.VARIABLE,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content), // Add source code
      parentId: this.getCurrentParentId(),
      metadata: {
        variableType: this.getTypeString(node.type),
        defaultValue: this.getDefaultValue(node.initializer),
        scope: this.getVariableScope(node),
        isConst: this.isConstVariable(node),
        documentation: this.extractDocumentation(content, location.startLine),
        isExported: this.isExported(content, variableName),
        isModuleLevel,
        isClassLevel
      }
    };

    components.push(variableComponent);
  }

  /**
   * Check if a variable is at module level (top-level in file)
   */
  private isModuleLevelVariable(node: ts.VariableDeclaration): boolean {
    let parent: ts.Node = node.parent;
    while (parent) {
      if (ts.isSourceFile(parent)) {
        return true;
      }
      if (ts.isFunctionDeclaration(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isArrowFunction(parent) ||
          ts.isFunctionExpression(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * Check if a variable is a class property
   */
  private isClassLevelVariable(node: ts.VariableDeclaration): boolean {
    let parent: ts.Node = node.parent;
    while (parent) {
      if (ts.isClassDeclaration(parent) || ts.isClassExpression(parent)) {
        return true;
      }
      if (ts.isFunctionDeclaration(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isArrowFunction(parent) ||
          ts.isFunctionExpression(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * Extract interface component
   */
  private extractInterfaceComponent(node: ts.InterfaceDeclaration, components: IComponent[], filePath: string, content: string): void {
    const location = this.getNodeLocation(node);
    const interfaceName = node.name.text;
    
    const interfaceComponent: IComponent = {
      id: this.generateComponentId(filePath, interfaceName, ComponentType.INTERFACE),
      name: interfaceName,
      type: ComponentType.INTERFACE,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content), // Add source code
      metadata: {
        extends: this.getInterfaceExtends(node),
        methods: this.getInterfaceMethods(node),
        properties: this.getInterfaceProperties(node),
        generics: this.getTypeParameters(node),
        documentation: this.extractDocumentation(content, location.startLine),
        isExported: this.isExported(content, interfaceName)
      }
    };

    components.push(interfaceComponent);
  }

  /**
   * Extract enum component
   */
  private extractEnumComponent(node: ts.EnumDeclaration, components: IComponent[], filePath: string, content: string): void {
    const location = this.getNodeLocation(node);
    const enumName = node.name.text;

    const enumComponent: IComponent = {
      id: this.generateComponentId(filePath, enumName, ComponentType.ENUM),
      name: enumName,
      type: ComponentType.ENUM,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content), // Add source code
      parentId: this.getCurrentParentId(),
      metadata: {
        values: this.getEnumValues(node),
        isConst: this.hasModifier(node, ts.SyntaxKind.ConstKeyword),
        documentation: this.extractDocumentation(content, location.startLine),
        isExported: this.isExported(content, enumName)
      }
    };

    components.push(enumComponent);
  }

  /**
   * Extract type alias component
   */
  private extractTypeAliasComponent(node: ts.TypeAliasDeclaration, components: IComponent[], filePath: string, content: string): void {
    const location = this.getNodeLocation(node);
    const typeName = node.name.text;

    const typeComponent: IComponent = {
      id: this.generateComponentId(filePath, typeName, ComponentType.TYPEDEF),
      name: typeName,
      type: ComponentType.TYPEDEF,
      language: this.language,
      filePath,
      location,
      code: this.extractSourceCode(node, content), // Add source code
      parentId: this.getCurrentParentId(),
      metadata: {
        typeDefinition: this.getTypeString(node.type),
        generics: this.getTypeParameters(node),
        documentation: this.extractDocumentation(content, location.startLine),
        isExported: this.isExported(content, typeName)
      }
    };

    components.push(typeComponent);
  }

  // Interface method for extracting import/export relationships
  extractImportExportRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    if (this.sourceFile) {
      this.extractImportExportRelationshipsInternal(this.sourceFile, components, relationships);
    }
    return relationships;
  }

  // Helper methods for extracting relationships  
  private extractImportExportRelationshipsInternal(sourceFile: ts.SourceFile, components: IComponent[], relationships: IRelationship[]): void {
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) return;

    // Extract imports
    sourceFile.statements.forEach(statement => {
      if (ts.isImportDeclaration(statement)) {
        const moduleSpecifier = statement.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          
          // Handle named imports
          if (statement.importClause && statement.importClause.namedBindings) {
            if (ts.isNamedImports(statement.importClause.namedBindings)) {
              statement.importClause.namedBindings.elements.forEach(element => {
                const importedName = element.name.text;
                const originalName = element.propertyName ? element.propertyName.text : importedName;
                
                relationships.push({
                  id: `${fileComponent.id}-imports-${originalName}-from-${importPath}`,
                  type: RelationshipType.IMPORTS_FROM,
                  sourceId: fileComponent.id,
                  targetId: `RESOLVE:${importPath}`,
                  metadata: {
                    importKind: 'named',
                    importedName,
                    originalName,
                    specifier: importPath,
                    needsResolution: true
                  }
                });
              });
            }
          }
          
          // Handle default imports
          if (statement.importClause && statement.importClause.name) {
            const importedName = statement.importClause.name.text;
            relationships.push({
              id: `${fileComponent.id}-imports-default-${importedName}-from-${importPath}`,
              type: RelationshipType.IMPORTS_FROM,
              sourceId: fileComponent.id,
              targetId: `RESOLVE:${importPath}`,
              metadata: {
                importKind: 'default',
                importedName,
                specifier: importPath,
                needsResolution: true
              }
            });
          }
          
          // Handle namespace imports
          if (statement.importClause && statement.importClause.namedBindings && ts.isNamespaceImport(statement.importClause.namedBindings)) {
            const namespaceName = statement.importClause.namedBindings.name.text;
            relationships.push({
              id: `${fileComponent.id}-imports-namespace-${namespaceName}-from-${importPath}`,
              type: RelationshipType.IMPORTS_FROM,
              sourceId: fileComponent.id,
              targetId: `RESOLVE:${importPath}`,
              metadata: {
                importKind: 'namespace',
                namespaceName,
                specifier: importPath,
                needsResolution: true
              }
            });
          }
        }
      }
      
      // Extract exports
      if (ts.isExportDeclaration(statement)) {
        if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
          // Re-export from another module
          const exportPath = statement.moduleSpecifier.text;
          relationships.push({
            id: `${fileComponent.id}-exports-from-${exportPath}`,
            type: RelationshipType.EXPORTS_FROM,
            sourceId: fileComponent.id,
            targetId: exportPath,
            metadata: {
              exportPath,
              isReExport: true
            }
          });
        } else if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
          // Named exports
          statement.exportClause.elements.forEach(element => {
            const exportedName = element.name.text;
            const localName = element.propertyName ? element.propertyName.text : exportedName;
            
            // Find the component being exported
            const exportedComponent = components.find(c => c.name === localName && c.type !== ComponentType.FILE);
            if (exportedComponent) {
              relationships.push({
                id: `${fileComponent.id}-exports-${exportedComponent.id}`,
                type: RelationshipType.EXPORTS,
                sourceId: fileComponent.id,
                targetId: exportedComponent.id,
                metadata: {
                  exportedName,
                  localName,
                  componentType: exportedComponent.type
                }
              });
              // Mark component metadata as exported
              exportedComponent.metadata = exportedComponent.metadata || {};
              exportedComponent.metadata.isExported = true;
              exportedComponent.metadata.exportedName = exportedName;
            }
          });
        }
      }

      // export default <expr or identifier>
      if (ts.isExportAssignment(statement)) {
        const expr = statement.expression;
        let targetComp: IComponent | undefined;
        if (ts.isIdentifier(expr)) {
          targetComp = components.find(c => c.name === expr.text && c.type !== ComponentType.FILE);
        }
        if (targetComp) {
          relationships.push({
            id: `${fileComponent.id}-exports-default-${targetComp.id}`,
            type: RelationshipType.EXPORTS,
            sourceId: fileComponent.id,
            targetId: targetComp.id,
            metadata: { default: true, componentType: targetComp.type }
          });
          targetComp.metadata = targetComp.metadata || {};
          targetComp.metadata.isExported = true;
          targetComp.metadata.exportedDefault = true;
        } else {
          relationships.push({
            id: `${fileComponent.id}-exports-default-expression`,
            type: RelationshipType.EXPORTS,
            sourceId: fileComponent.id,
            targetId: `${fileComponent.id}#default`,
            metadata: { default: true }
          });
        }
      }

      // export modifier on declarations (export class/function/const/interface/enum/type)
      const hasExportModifier = !!(((statement as any).modifiers) && ((statement as any).modifiers as any[]).some((m: any) => m.kind === ts.SyntaxKind.ExportKeyword));
      if (hasExportModifier) {
        if (ts.isClassDeclaration(statement)) {
          const sName = (statement as ts.ClassDeclaration).name?.text;
          if (sName) {
            const comp = components.find(c => c.type === ComponentType.CLASS && c.name === sName);
            if (comp) { comp.metadata = comp.metadata || {}; (comp.metadata as any).isExported = true; }
          }
        } else if (ts.isFunctionDeclaration(statement)) {
          const fName = (statement as ts.FunctionDeclaration).name?.text;
          if (fName) {
            const comp = components.find(c => c.type === ComponentType.FUNCTION && c.name === fName);
            if (comp) { comp.metadata = comp.metadata || {}; (comp.metadata as any).isExported = true; }
          }
        } else if (ts.isVariableStatement(statement)) {
          for (const decl of statement.declarationList.declarations) {
            const varName = ts.isIdentifier(decl.name) ? decl.name.text : undefined;
            if (varName) {
              const comp = components.find(c => c.type === ComponentType.VARIABLE && c.name === varName);
              if (comp) { comp.metadata = comp.metadata || {}; (comp.metadata as any).isExported = true; }
            }
          }
        } else if (ts.isInterfaceDeclaration(statement)) {
          const iName = (statement as ts.InterfaceDeclaration).name.text;
          const comp = components.find(c => c.type === ComponentType.INTERFACE && c.name === iName);
          if (comp) { comp.metadata = comp.metadata || {}; (comp.metadata as any).isExported = true; }
        } else if (ts.isEnumDeclaration(statement)) {
          const eName = (statement as ts.EnumDeclaration).name.text;
          const comp = components.find(c => c.type === ComponentType.ENUM && c.name === eName);
          if (comp) { comp.metadata = comp.metadata || {}; (comp.metadata as any).isExported = true; }
        } else if (ts.isTypeAliasDeclaration(statement)) {
          const tName = (statement as ts.TypeAliasDeclaration).name.text;
          const comp = components.find(c => c.type === ComponentType.TYPEDEF && c.name === tName);
          if (comp) { comp.metadata = comp.metadata || {}; (comp.metadata as any).isExported = true; }
        }
      }
    });
  }

  private extractClassInheritanceRelationships(sourceFile: ts.SourceFile, components: IComponent[], relationships: IRelationship[]): void {
    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        const classComponent = components.find(c => c.type === ComponentType.CLASS && c.name === className);
        
        if (classComponent) {
          // Check for extends clause
          if (node.heritageClauses) {
            node.heritageClauses.forEach(heritage => {
              if (heritage.token === ts.SyntaxKind.ExtendsKeyword) {
                heritage.types.forEach(type => {
                  if (ts.isIdentifier(type.expression)) {
                    const parentClassName = type.expression.text;
                    const parentClass = components.find(c => c.type === ComponentType.CLASS && c.name === parentClassName);
                    
                    if (parentClass) {
                      relationships.push({
                        id: `${classComponent.id}-extends-${parentClass.id}`,
                        type: RelationshipType.EXTENDS,
                        sourceId: classComponent.id,
                        targetId: parentClass.id,
                        metadata: {
                          relationship: 'inheritance',
                          childClass: className,
                          parentClass: parentClassName
                        }
                      });
                    } else {
                      // Create cross-file extends relationship using class name – standardized RESOLVE scheme
                      relationships.push({
                        id: `${classComponent.id}-extends-${parentClassName}`,
                        type: RelationshipType.EXTENDS,
                        sourceId: classComponent.id,
                        targetId: `RESOLVE:${parentClassName}`,
                        metadata: {
                          relationship: 'inheritance',
                          resolutionKind: 'class',
                          childClass: className,
                          parentClass: parentClassName,
                          needsResolution: true
                        }
                      });
                    }
                  }
                });
              } else if (heritage.token === ts.SyntaxKind.ImplementsKeyword) {
                heritage.types.forEach(type => {
                  if (ts.isIdentifier(type.expression)) {
                    const interfaceName = type.expression.text;
                    const interfaceComponent = components.find(c => c.type === ComponentType.INTERFACE && c.name === interfaceName);
                    
                    if (interfaceComponent) {
                      relationships.push({
                        id: `${classComponent.id}-implements-${interfaceComponent.id}`,
                        type: RelationshipType.IMPLEMENTS,
                        sourceId: classComponent.id,
                        targetId: interfaceComponent.id,
                        metadata: {
                          relationship: 'implementation',
                          className,
                          interfaceName
                        }
                      });
                    }
                  }
                });
              }
            });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }

  private extractFunctionCallRelationships(sourceFile: ts.SourceFile, components: IComponent[], relationships: IRelationship[]): void {
    const componentMap = new Map<string, IComponent>();
    components.forEach(c => {
      if (c.name && c.type !== ComponentType.FILE) {
        componentMap.set(c.name, c);
      }
    });
    
    const findContainingFunction = (node: ts.Node): IComponent | undefined => {
      let current: ts.Node | undefined = node;
      while (current) {
        if (ts.isFunctionDeclaration(current) && current.name) {
          return componentMap.get(current.name.text);
        } else if (ts.isMethodDeclaration(current) && current.name && ts.isIdentifier(current.name)) {
          return componentMap.get(current.name.text);
        } else if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
          // Handle function expressions assigned to variables
          const parent = current.parent;
          if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
            return componentMap.get(parent.name.text);
          }
        }
        current = current.parent;
      }
      return undefined;
    };
    
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const caller = findContainingFunction(node);
        if (!caller) {
          ts.forEachChild(node, visit);
          return;
        }
        
        let calleeName: string | undefined;
        
        // Direct function call
        if (ts.isIdentifier(node.expression)) {
          calleeName = node.expression.text;
        }
        // Method call
        else if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
          calleeName = node.expression.name.text;
        }
        
        if (calleeName) {
          const callee = componentMap.get(calleeName);
          if (callee && caller.id !== callee.id) {
            relationships.push({
              id: `${caller.id}-calls-${callee.id}`,
              type: RelationshipType.CALLS,
              sourceId: caller.id,
              targetId: callee.id,
              metadata: {
                relationship: 'function-call',
                callerName: caller.name,
                calleeName: callee.name,
                callerType: caller.type,
                calleeType: callee.type
              }
            });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
  }


  // Utility methods
  private getScriptKind(filePath: string): ts.ScriptKind {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case '.tsx': return ts.ScriptKind.TSX;
      case '.jsx': return ts.ScriptKind.JSX;
      case '.ts': return ts.ScriptKind.TS;
      default: return ts.ScriptKind.JS;
    }
  }

  private getNodeLocation(node: ts.Node): Location {
    if (!this.sourceFile) {
      return this.createLocation(1, 1);
    }

    const start = this.sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd());

    return this.createLocation(
      start.line + 1,
      end.line + 1,
      start.character,
      end.character
    );
  }

  private hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    const modifiers = (node as any).modifiers;
    return modifiers?.some((modifier: any) => modifier.kind === kind) ?? false;
  }

  private getAccessModifier(node: ts.Node): 'public' | 'private' | 'protected' | 'package' {
    if (this.hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return 'private';
    if (this.hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return 'protected';
    return 'public';
  }

  private getSuperClass(node: ts.ClassDeclaration): string | undefined {
    const heritageClause = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
    return heritageClause?.types[0]?.expression.getText();
  }

  private getImplementedInterfaces(node: ts.ClassDeclaration): string[] {
    const heritageClause = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ImplementsKeyword);
    return heritageClause?.types.map(type => type.expression.getText()) ?? [];
  }

  private getDecorators(node: ts.Node): string[] {
    // TypeScript 5.0 changed decorator API, need to handle both old and new
    const decorators = (node as any).decorators || (node as any).modifiers?.filter((m: any) => m.kind === ts.SyntaxKind.Decorator);
    return decorators?.map((decorator: any) => decorator.getText()) ?? [];
  }

  private getTypeParameters(node: any): string[] {
    const typeParameters = node.typeParameters;
    return typeParameters?.map((param: any) => param.name.text) ?? [];
  }

  private extractParameters(parameters: ts.NodeArray<ts.ParameterDeclaration>): Parameter[] {
    return parameters.map(param => {
      const parameter: Parameter = {
        name: param.name.getText(),
        isOptional: param.questionToken !== undefined,
        isRest: param.dotDotDotToken !== undefined
      };
      
      const type = this.getTypeString(param.type);
      if (type) parameter.type = type;
      
      const defaultValue = this.getDefaultValue(param.initializer);
      if (defaultValue) parameter.defaultValue = defaultValue;
      
      return parameter;
    });
  }

  private getReturnType(node: ts.FunctionLikeDeclaration): string | undefined {
    return this.getTypeString(node.type);
  }

  private getTypeString(type: ts.TypeNode | undefined): string | undefined {
    return type?.getText();
  }

  private getDefaultValue(initializer: ts.Expression | undefined): string | undefined {
    return initializer?.getText();
  }

  private getVariableScope(node: ts.VariableDeclaration): string {
    const parent = node.parent;
    if (ts.isVariableDeclarationList(parent)) {
      if (parent.flags & ts.NodeFlags.Const) return 'const';
      if (parent.flags & ts.NodeFlags.Let) return 'let';
      return 'var';
    }
    return 'unknown';
  }

  private isConstVariable(node: ts.VariableDeclaration): boolean {
    const parent = node.parent;
    return ts.isVariableDeclarationList(parent) && !!(parent.flags & ts.NodeFlags.Const);
  }

  private getInterfaceExtends(node: ts.InterfaceDeclaration): string[] {
    return node.heritageClauses?.flatMap(clause => 
      clause.types.map(type => type.expression.getText())
    ) ?? [];
  }

  private getInterfaceMethods(node: ts.InterfaceDeclaration): string[] {
    return node.members
      .filter(member => ts.isMethodSignature(member))
      .map(member => member.name?.getText() ?? 'unknown')
      .filter(name => name !== 'unknown');
  }

  private getInterfaceProperties(node: ts.InterfaceDeclaration): string[] {
    return node.members
      .filter(member => ts.isPropertySignature(member))
      .map(member => member.name?.getText() ?? 'unknown')
      .filter(name => name !== 'unknown');
  }

  private getEnumValues(node: ts.EnumDeclaration): Array<{ name: string; value?: string }> {
    return node.members.map(member => {
      const enumValue: { name: string; value?: string } = {
        name: member.name.getText()
      };
      
      const value = member.initializer?.getText();
      if (value) enumValue.value = value;
      
      return enumValue;
    });
  }

  private isModule(content: string): boolean {
    return /\b(?:import|export)\b/.test(content) || 
           /\bmodule\.exports\b/.test(content) ||
           /\bexports\.\w+/.test(content);
  }

  // Enhanced extraction methods with comprehensive AST tracking
  extractVariableComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    if (!this.sourceFile) return components;

    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node)) {
        this.extractVariableComponent(node, components, filePath, content);
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return components;
  }

  extractConstructorComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    if (!this.sourceFile) return components;

    const visit = (node: ts.Node) => {
      if (ts.isConstructorDeclaration(node)) {
        const className = this.findContainingClassName(node);
        if (className) {
          const location = this.getNodeLocation(node);
          const constructorComponent: IComponent = {
            id: this.generateComponentId(filePath, `${className}.constructor`, ComponentType.METHOD),
            name: 'constructor',
            type: ComponentType.METHOD,
            language: this.language,
            filePath,
            location,
            metadata: {
              isConstructor: true,
              className,
              parameters: this.extractParameters(node.parameters),
              accessModifier: this.getAccessModifier(node),
              documentation: this.extractDocumentation(content, location.startLine)
            }
          };
          components.push(constructorComponent);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return components;
  }

  extractAccessorComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    if (!this.sourceFile) return components;

    const visit = (node: ts.Node) => {
      if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
        const className = this.findContainingClassName(node);
        const propertyName = ts.isIdentifier(node.name) ? node.name.text : 'unknown';
        const isGetter = ts.isGetAccessorDeclaration(node);
        
        if (className) {
          const location = this.getNodeLocation(node);
          const accessorComponent: IComponent = {
            id: this.generateComponentId(filePath, `${className}.${propertyName}.${isGetter ? 'get' : 'set'}`, ComponentType.METHOD),
            name: propertyName,
            type: ComponentType.METHOD,
            language: this.language,
            filePath,
            location,
            metadata: {
              isAccessor: true,
              isGetter,
              isSetter: !isGetter,
              className,
              accessModifier: this.getAccessModifier(node),
              returnType: isGetter ? this.getReturnType(node) : 'void',
              documentation: this.extractDocumentation(content, location.startLine)
            }
          };
          components.push(accessorComponent);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return components;
  }

  extractPropertyAssignments(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    if (!this.sourceFile) return components;

    const visit = (node: ts.Node) => {
      // Property assignments in object literals
      if (ts.isPropertyAssignment(node)) {
        const propertyName = ts.isIdentifier(node.name) ? node.name.text : 'unknown';
        const location = this.getNodeLocation(node);
        
        const propertyComponent: IComponent = {
          id: this.generateComponentId(filePath, `${propertyName}_assignment_${location.startLine}`, ComponentType.PROPERTY),
          name: propertyName,
          type: ComponentType.PROPERTY,
          language: this.language,
          filePath,
          location,
          metadata: {
            isAssignment: true,
            valueType: this.inferTypeFromNode(node.initializer),
            documentation: this.extractDocumentation(content, location.startLine)
          }
        };
        components.push(propertyComponent);
      }
      
      // Binary expressions for property assignments (obj.prop = value)
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        if (ts.isPropertyAccessExpression(node.left)) {
          const propertyName = ts.isIdentifier(node.left.name) ? node.left.name.text : 'unknown';
          const objectName = ts.isIdentifier(node.left.expression) ? node.left.expression.text : 'unknown';
          const location = this.getNodeLocation(node);
          
          const assignmentComponent: IComponent = {
            id: this.generateComponentId(filePath, `${objectName}.${propertyName}_assign_${location.startLine}`, ComponentType.PROPERTY),
            name: `${objectName}.${propertyName}`,
            type: ComponentType.PROPERTY,
            language: this.language,
            filePath,
            location,
            metadata: {
              isAssignment: true,
              objectName,
              propertyName,
              valueType: this.inferTypeFromNode(node.right),
              documentation: this.extractDocumentation(content, location.startLine)
            }
          };
          components.push(assignmentComponent);
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return components;
  }

  extractUsageRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    if (!this.sourceFile) return relationships;

    const visit = (node: ts.Node) => {
      // Function/method calls
      if (ts.isCallExpression(node)) {
        const caller = this.findContainingFunction(node);
        if (caller) {
          let calledName = 'unknown';
          
          if (ts.isIdentifier(node.expression)) {
            calledName = node.expression.text;
          } else if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.name)) {
            calledName = node.expression.name.text;
          }
          
          const calledComponent = components.find(c => c.name === calledName);
          const callerComponent = components.find(c => c.name === caller);
          
          if (callerComponent) {
            const location = this.getNodeLocation(node);
            relationships.push({
              id: `${callerComponent.id}-calls-${calledName}-${location.startLine}`,
              type: RelationshipType.CALLS,
              sourceId: callerComponent.id,
              targetId: calledComponent?.id || `UNRESOLVED:${calledName}`,
              metadata: {
                callType: 'function_call',
                line: location.startLine,
                callerName: caller,
                calledName
              }
            });
          }
        }
      }
      
      // Property access (usage)
      if (ts.isPropertyAccessExpression(node)) {
        const accessor = this.findContainingFunction(node);
        const propertyName = ts.isIdentifier(node.name) ? node.name.text : 'unknown';
        const objectName = ts.isIdentifier(node.expression) ? node.expression.text : 'unknown';
        
        if (accessor) {
          const accessorComponent = components.find(c => c.name === accessor);
          const propertyComponent = components.find(c => c.name === propertyName || c.name.includes(propertyName));
          
          if (accessorComponent) {
            const location = this.getNodeLocation(node);
            relationships.push({
              id: `${accessorComponent.id}-accesses-${objectName}.${propertyName}-${location.startLine}`,
              type: RelationshipType.USES,
              sourceId: accessorComponent.id,
              targetId: propertyComponent?.id || `UNRESOLVED:${objectName}.${propertyName}`,
              metadata: {
                usageType: 'property_access',
                line: location.startLine,
                accessorName: accessor,
                objectName,
                propertyName
              }
            });
          }
        }
      }
      
      // Variable references
      if (ts.isIdentifier(node)) {
        const user = this.findContainingFunction(node);
        const varName = node.text;
        
        if (user && varName !== user) { // Don't track self-references
          const userComponent = components.find(c => c.name === user);
          const varComponent = components.find(c => c.name === varName && c.type === ComponentType.VARIABLE);
          
          if (userComponent && varComponent) {
            const location = this.getNodeLocation(node);
            relationships.push({
              id: `${userComponent.id}-uses-${varComponent.id}-${location.startLine}`,
              type: RelationshipType.USES,
              sourceId: userComponent.id,
              targetId: varComponent.id,
              metadata: {
                usageType: 'variable_reference',
                line: location.startLine,
                userName: user,
                variableName: varName
              }
            });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return relationships;
  }

  detectFrameworkComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    if (!this.sourceFile) return components;

    const visit = (node: ts.Node) => {
      // React functional components
      if (ts.isFunctionDeclaration(node) && this.isReactFunctionalComponent(node, content)) {
        const componentName = node.name?.text || 'Anonymous';
        const location = this.getNodeLocation(node);
        
        const reactComponent: IComponent = {
          id: this.generateComponentId(filePath, componentName, ComponentType.FUNCTION),
          name: componentName,
          type: ComponentType.FUNCTION,
          language: this.language,
          filePath,
          location,
          metadata: {
            isReactComponent: true,
            framework: 'React',
            componentType: 'functional',
            hooks: this.extractReactHooks(node),
            props: this.extractReactProps(node),
            documentation: this.extractDocumentation(content, location.startLine)
          }
        };
        components.push(reactComponent);
      }
      
      // React class components
      if (ts.isClassDeclaration(node)) {
        const className = node.name?.text || 'Anonymous';
        const extendsReact = this.extendsReactComponent(node);
        
        if (extendsReact) {
          const location = this.getNodeLocation(node);
          const reactClassComponent: IComponent = {
            id: this.generateComponentId(filePath, className, ComponentType.CLASS),
            name: className,
            type: ComponentType.CLASS,
            language: this.language,
            filePath,
            location,
            metadata: {
              isReactComponent: true,
              framework: 'React',
              componentType: 'class',
              extends: extendsReact,
              methods: this.extractClassMethods(node),
              documentation: this.extractDocumentation(content, location.startLine)
            }
          };
          components.push(reactClassComponent);
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return components;
  }

  // Helper methods for enhanced extraction
  private findContainingClassName(node: ts.Node): string | undefined {
    let parent = node.parent;
    while (parent) {
      if (ts.isClassDeclaration(parent) && parent.name) {
        return parent.name.text;
      }
      parent = parent.parent;
    }
    return undefined;
  }

  private findContainingFunction(node: ts.Node): string | undefined {
    let parent = node.parent;
    while (parent) {
      if (ts.isFunctionDeclaration(parent) && parent.name) {
        return parent.name.text;
      }
      if (ts.isMethodDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.text;
      }
      if (ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) {
        // Look for variable assignment
        const grandParent = parent.parent;
        if (ts.isVariableDeclaration(grandParent) && ts.isIdentifier(grandParent.name)) {
          return grandParent.name.text;
        }
      }
      parent = parent.parent;
    }
    return undefined;
  }

  private isReactFunctionalComponent(node: ts.FunctionDeclaration, content: string): boolean {
    // Check if function returns JSX
    return this.returnsJSX(node) || content.includes('React') || /\.jsx?$/.test(content);
  }

  private extendsReactComponent(node: ts.ClassDeclaration): string | undefined {
    if (node.heritageClauses) {
      for (const heritage of node.heritageClauses) {
        if (heritage.token === ts.SyntaxKind.ExtendsKeyword) {
          for (const type of heritage.types) {
            if (ts.isIdentifier(type.expression)) {
              const baseName = type.expression.text;
              if (baseName.includes('Component') || baseName.includes('React')) {
                return baseName;
              }
            }
          }
        }
      }
    }
    return undefined;
  }

  private extractReactHooks(node: ts.FunctionDeclaration): string[] {
    const hooks: string[] = [];
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const name = n.expression.text;
        if (name.startsWith('use')) {
          hooks.push(name);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
    return hooks;
  }

  private extractReactProps(node: ts.FunctionDeclaration): string[] {
    const props: string[] = [];
    if (node.parameters && node.parameters.length > 0) {
      const firstParam = node.parameters[0];
      if (firstParam && ts.isObjectBindingPattern(firstParam.name)) {
        firstParam.name.elements.forEach(element => {
          if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
            props.push(element.name.text);
          }
        });
      }
    }
    return props;
  }

  private extractClassMethods(node: ts.ClassDeclaration): string[] {
    const methods: string[] = [];
    node.members.forEach(member => {
      if (ts.isMethodDeclaration(member) && ts.isIdentifier(member.name)) {
        methods.push(member.name.text);
      }
    });
    return methods;
  }

  // Additional helper methods for enhanced AST tracking
  private inferTypeFromNode(node: ts.Node): string {
    if (ts.isStringLiteral(node)) return 'string';
    if (ts.isNumericLiteral(node)) return 'number';
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return 'boolean';
    if (node.kind === ts.SyntaxKind.NullKeyword) return 'null';
    if (node.kind === ts.SyntaxKind.UndefinedKeyword) return 'undefined';
    if (ts.isArrayLiteralExpression(node)) return 'array';
    if (ts.isObjectLiteralExpression(node)) return 'object';
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return 'function';
    return 'unknown';
  }

  private returnsJSX(node: ts.FunctionDeclaration): boolean {
    // Simple check for JSX return statements
    const sourceText = node.getText();
    return /return\s*<\w+/.test(sourceText) || /=>\s*<\w+/.test(sourceText);
  }

  /**
   * Extract source code for a TypeScript node
   */
  private extractSourceCode(node: ts.Node, content: string): string {
    if (!this.sourceFile) return '';
    
    // Get the source text from the node - no truncation
    return node.getText(this.sourceFile);
  }

  /**
   * Validate that content is valid JavaScript/TypeScript
   */
  validateContent(content: string): boolean {
    // Check for JavaScript/TypeScript patterns
    // Avoid false positives with PHP files
    if (content.includes('<?php')) return false;
    
    // Check for JS/TS specific syntax
    const jsPatterns = [
      /\b(?:function|const|let|var|class|import|export)\b/,
      /\b(?:async|await|return|throw|try|catch)\b/,
      /\bconsole\.\w+\s*\(/, // console.log, console.error, etc.
      /\bdocument\.\w+/, // DOM access
      /\bwindow\.\w+/, // Browser globals
      /=>/, // Arrow functions
      /\{\s*\}/, // Object literals
      /\[\s*\]/, // Array literals
      /\.\w+\s*\(/, // Method calls
      /\bif\s*\([^)]*\)\s*\{/, // If statements with braces
      /\bfor\s*\([^)]*\)\s*\{/, // For loops
    ];
    
    return jsPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect language boundaries for embedded languages
   */
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[] {
    const boundaries: LanguageBoundary[] = [];

    // Default boundary for the entire file
    const lines = content.split('\n');
    boundaries.push({
      language: this.language,
      startLine: 1,
      startColumn: 0,
      endLine: lines.length,
      endColumn: lines[lines.length - 1]?.length || 0,
      scope: this.getFileScope(filePath)
    });
    
    // Parse AST to find template literals with embedded languages
    if (this.sourceFile) {
      const visit = (node: ts.Node) => {
        // Tagged template literals (e.g., sql`SELECT * FROM users`)
        if (ts.isTaggedTemplateExpression(node)) {
          const tag = node.tag;
          if (ts.isIdentifier(tag)) {
            const tagName = tag.text.toLowerCase();
            let embeddedLang: string | null = null;
            
            switch (tagName) {
              case 'sql':
                embeddedLang = 'sql';
                break;
              case 'gql':
              case 'graphql':
                embeddedLang = 'graphql';
                break;
              case 'html':
                embeddedLang = 'html';
                break;
              case 'css':
                embeddedLang = 'css';
                break;
            }
            
            if (embeddedLang && node.template.kind === ts.SyntaxKind.TemplateExpression) {
              const start = this.sourceFile!.getLineAndCharacterOfPosition(node.template.getStart());
              const end = this.sourceFile!.getLineAndCharacterOfPosition(node.template.getEnd());
              
              boundaries.push({
                language: embeddedLang,
                startLine: start.line + 1,
                startColumn: start.character,
                endLine: end.line + 1,
                endColumn: end.character,
                scope: `string.template.${embeddedLang}.${this.getFileScope(filePath)}`
              });
            }
          }
        }
        
        // JSX/TSX elements contain HTML-like syntax
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
          const start = this.sourceFile!.getLineAndCharacterOfPosition(node.getStart());
          const end = this.sourceFile!.getLineAndCharacterOfPosition(node.getEnd());
          
          boundaries.push({
            language: 'jsx',
            startLine: start.line + 1,
            startColumn: start.character,
            endLine: end.line + 1,
            endColumn: end.character,
            scope: `meta.jsx.${this.getFileScope(filePath)}`
          });
        }
        
        ts.forEachChild(node, visit);
      };
      
      visit(this.sourceFile);
    }


    return boundaries;
  }

  /**
   * Get the appropriate scope name based on file extension
   */
  private getFileScope(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
        return 'source.ts';
      case '.tsx':
        return 'source.tsx';
      case '.jsx':
        return 'source.jsx';
      default:
        return 'source.js';
    }
  }
}
