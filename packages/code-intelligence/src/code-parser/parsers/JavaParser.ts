/**
 * Java Parser - Uses java-parser library for proper AST parsing
 * 
 * This parser provides comprehensive Java parsing using the java-parser npm package
 * which generates a proper Abstract Syntax Tree for accurate component extraction.
 */

// Dynamic import for ES module compatibility
let parseJava: any;
import { BaseLanguageParser } from './BaseLanguageParser.js';
import type { ParseError, ParserOptions } from '../interfaces/ILanguageParser.js';
import { 
  IComponent, 
  IRelationship, 
  ComponentType, 
  RelationshipType 
} from '../types.js';

/**
 * Java AST node types we care about
 */
interface JavaASTNode {
  name?: string;
  children?: { [key: string]: any };
  location?: {
    startLine?: number;
    endLine?: number;
    startColumn?: number;
    endColumn?: number;
  };
}

/**
 * Java parser using java-parser library for proper AST analysis
 */
export class JavaParser extends BaseLanguageParser {
  private currentPackageName: string | undefined;
  constructor() {
    super('java', ['.java']);
    this.initializeParser();
  }

  private async initializeParser() {
    if (!parseJava) {
      try {
        const javaParserModule = await import('java-parser');
        parseJava = javaParserModule.parse;
      } catch (error) {
        console.warn('Failed to load java-parser module:', error);
      }
    }
  }

  /**
   * Get Java specific ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [
      ...this.getBaseIgnorePatterns(),
      
      // Maven
      '**/target/**',
      '**/target',
      
      // Gradle
      '**/build/**',
      '**/build',
      '**/.gradle/**',
      '**/.gradle',
      '**/gradle/**',
      '**/gradle',
      
      // IntelliJ IDEA
      '**/.idea/**',
      '**/.idea',
      '**/out/**',
      '**/out',
      '**/*.iml',
      '**/*.ipr',
      '**/*.iws',
      
      // Eclipse
      '**/.project',
      '**/.classpath',
      '**/.settings/**',
      '**/.settings',
      '**/bin/**',
      '**/bin',
      
      // NetBeans
      '**/nbproject/**',
      '**/nbproject',
      '**/nbbuild/**',
      '**/nbbuild',
      '**/nbdist/**',
      '**/nbdist',
      
      // Spring Boot
      '**/target/classes/**',
      '**/target/test-classes/**',
      '**/BOOT-INF/**',
      
      // Android
      '**/gen/**',
      '**/gen',
      '**/proguard/**',
      '**/proguard',
      
      // JUnit/TestNG
      '**/test-output/**',
      '**/test-output',
      '**/surefire-reports/**',
      '**/surefire-reports',
      
      // JAR/WAR files
      '**/*.jar',
      '**/*.war',
      '**/*.ear',
      '**/*.class',
      
      // Logs
      '**/logs/**',
      '**/logs',
      '**/*.log'
    ];
  }

  /**
   * Validate Java syntax using java-parser
   */
  async validateSyntax(content: string): Promise<ParseError[]> {
    const errors: ParseError[] = [];
    
    await this.initializeParser();
    if (!parseJava) {
      return [{
        message: 'Java parser not available',
        location: this.createLocation(1, 1),
        severity: 'error' as const
      }];
    }
    
    try {
      parseJava(content);
    } catch (error: any) {
      const errorMessage = error.message || 'Java syntax error';
      let line = 1;
      let column = 0;
      
      // Try to extract line/column from error message
      const locationMatch = errorMessage.match(/line (\d+)/i);
      if (locationMatch) {
        line = parseInt(locationMatch[1]!, 10);
      }
      
      errors.push({
        message: errorMessage,
        location: this.createLocation(line, line),
        severity: 'error' as const
      });
    }
    
    return errors;
  }

  /**
   * Detect components in Java content using AST
   */
  async detectComponents(content: string, filePath: string): Promise<IComponent[]> {
    // Clear context for new file
    this.clearContext();

    const components: IComponent[] = [];

    await this.initializeParser();
    if (!parseJava) {
      console.warn('Java parser not available, falling back to basic parsing');
      return [this.createFileComponent(filePath, content)];
    }

    try {
      // Add file component
      const fileComponent = this.createFileComponent(filePath, content);
      components.push(fileComponent);

      // Push file component as root context
      this.pushContext(fileComponent);

      // Parse Java AST
      const ast = parseJava(content);

      // Extract components from AST
      this.extractComponentsFromAST(ast, components, filePath, content);

      // Pop file context
      this.popContext();

    } catch (error) {
      console.warn(`Failed to parse Java file ${filePath}: ${error}`);
      // Return at least the file component on error
    } finally {
      this.clearContext();
    }

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
      const astImportRels = this.extractJavaImportRelationshipsFromAst(components, content);
      if (astImportRels.length > 0) {
        relationships.push(...astImportRels);
      } else {
        const importExportRelationships = this.extractImportExportRelationships(components, content);
        relationships.push(...importExportRelationships);
      }
      
      // 4. Base parser's smart containment detection (file->component, class->method)
      const containmentRelationships = this.extractContainmentRelationships(components);
      relationships.push(...containmentRelationships);
      
      // === ADD JAVA-SPECIFIC ENHANCEMENTS ===
      
      // 5. Enhanced inheritance relationships specific to Java
      this.extractJavaInheritanceRelationships(components, relationships);
      
      // 6. Enhanced interface implementation relationships specific to Java
      this.extractJavaImplementationRelationships(components, relationships);

      // 7. Namespace (package) relationships
      this.extractNamespaceRelationships(components, relationships);

      // PRIMARY PARSER: Add semantic data flow analysis
      const semanticRelationships = await this.analyzeJavaDataFlow(components, content);
      relationships.push(...semanticRelationships);

    } catch (error) {
      console.warn(`Failed to extract Java relationships: ${error}`);
    }

    return relationships;
  }

  /**
   * Analyze Java-specific semantic data flow patterns (PRIMARY PARSER)
   */
  private async analyzeJavaDataFlow(components: IComponent[], content: string): Promise<IRelationship[]> {
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
      console.warn('DataFlowAnalyzer failed for Java:', error);
      return [];
    }
  }

  /**
   * Extract Java import relationships using the parsed AST (sync)
   */
  private extractJavaImportRelationshipsFromAst(components: IComponent[], content: string): IRelationship[] {
    const rels: IRelationship[] = [];
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) return rels;

    try {
      const ast = parseJava(content);

      const visit = (node: any) => {
        if (!node || typeof node !== 'object') return;
        // Common placements in java-parser:
        // - Node name 'importDeclaration'
        // - or children.importDeclaration array under ordinaryCompilationUnit
        if (node.name === 'importDeclaration') {
          const qName = this.extractQualifiedName((node.children && (node.children.qualifiedName || node.children.typeName || node.children.packageOrTypeName)) || node);
          // Try to get raw snippet to detect static or on-demand imports
          let snippet = '';
          try { snippet = this.extractSourceCodeFromNode(content, node); } catch {}
          const isStatic = /\bimport\s+static\b/.test(snippet);
          const onDemand = /\.\*\s*;\s*$/.test(snippet);
          const loc = this.getNodeLocation(node);
          if (qName) {
            rels.push({
              id: `${fileComponent.id}-imports-${qName}`,
              type: RelationshipType.IMPORTS_FROM,
              sourceId: fileComponent.id,
              targetId: `RESOLVE:${qName}`,
              metadata: { syntax: 'java_import', specifier: qName, isStatic, onDemand, line: loc.startLine, startColumn: loc.startColumn, endColumn: loc.endColumn, needsResolution: true }
            });
          }
        }

        // Recurse over children
        if (node.children) {
          for (const key in node.children) {
            const child = node.children[key];
            if (Array.isArray(child)) child.forEach(n => visit(n));
            else if (child && typeof child === 'object') visit(child);
          }
        }
      };

      visit(ast);
    } catch (e) {
      // On failure, let caller fallback to regex in BaseLanguageParser
      return [];
    }

    return rels;
  }

  /**
   * Link namespace (package) components to types defined within them.
   */
  private extractNamespaceRelationships(components: IComponent[], relationships: IRelationship[]): void {
    const namespaceComponents = components.filter(c => c.type === ComponentType.NAMESPACE);
    if (namespaceComponents.length === 0) return;
    const typeComponents = components.filter(c => c.type === ComponentType.CLASS || c.type === ComponentType.INTERFACE);

    for (const ns of namespaceComponents) {
      const nsName = ns.name;
      for (const t of typeComponents) {
        const pkg = t.metadata?.package;
        if (pkg && pkg === nsName) {
          relationships.push({
            id: `${ns.id}-in-namespace-${t.id}`,
            type: RelationshipType.IN_NAMESPACE,
            sourceId: ns.id,
            targetId: t.id,
            metadata: { relationship: 'namespace-contains-type' }
          });
        }
      }
    }
  }

  /**
   * Extract components from Java AST
   */
  private extractComponentsFromAST(ast: any, components: IComponent[], filePath: string, content: string): void {
    if (!ast || !ast.children) {
      return;
    }

    // Java-parser structure: compilationUnit -> ordinaryCompilationUnit -> content
    if (ast.name === 'compilationUnit' && ast.children.ordinaryCompilationUnit) {
      const ordinaryUnit = ast.children.ordinaryCompilationUnit[0];
      if (ordinaryUnit) {
        this.traverseAST(ordinaryUnit, components, filePath, content);
      }
    } else {
      this.traverseAST(ast, components, filePath, content);
    }
  }

  /**
   * Recursively traverse the AST to extract components
   */
  private traverseAST(node: any, components: IComponent[], filePath: string, content: string): void {
    if (!node) return;

    // Process different node types
    switch (node.name) {
      case 'packageDeclaration':
        this.extractPackageComponent(node, components, filePath, content);
        break;
      case 'typeDeclaration':
        // typeDeclaration contains classDeclaration, interfaceDeclaration, etc.
        this.extractTypeDeclaration(node, components, filePath, content);
        break;
      // Note: classDeclaration, interfaceDeclaration, enumDeclaration are handled by typeDeclaration
      // so we don't process them directly to avoid duplicates
    }

    // Recursively process children
    if (node.children) {
      for (const key in node.children) {
        const child = node.children[key];
        if (Array.isArray(child)) {
          child.forEach(item => this.traverseAST(item, components, filePath, content));
        } else if (child && typeof child === 'object') {
          this.traverseAST(child, components, filePath, content);
        }
      }
    }
  }

  /**
   * Extract package component from AST
   */
  private extractPackageComponent(node: any, components: IComponent[], filePath: string, content: string): void {
    const packageName = this.extractPackageName(node);
    if (!packageName) return;

    // Package context is handled through metadata
    this.currentPackageName = packageName;
    
    const location = this.getNodeLocation(node);
    
    const packageComponent: IComponent = {
      id: this.generateComponentId(filePath, packageName, ComponentType.NAMESPACE),
      name: packageName,
      type: ComponentType.NAMESPACE,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        isExported: true,
        fullName: packageName,
        isPackage: true
      }
    };

    components.push(packageComponent);
  }

  /**
   * Extract type declaration (wrapper for class/interface/enum)
   */
  private extractTypeDeclaration(node: any, components: IComponent[], filePath: string, content: string): void {
    if (!node.children) return;

    // typeDeclaration contains classDeclaration, interfaceDeclaration, enumDeclaration
    if (node.children.classDeclaration) {
      const classDecl = node.children.classDeclaration[0];
      if (classDecl) {
        this.extractClassComponent(classDecl, components, filePath, content);
      }
    }
    
    if (node.children.interfaceDeclaration) {
      const interfaceDecl = node.children.interfaceDeclaration[0];
      if (interfaceDecl) {
        this.extractInterfaceComponent(interfaceDecl, components, filePath, content);
      }
    }
    
    if (node.children.enumDeclaration) {
      const enumDecl = node.children.enumDeclaration[0];
      if (enumDecl) {
        this.extractEnumComponent(enumDecl, components, filePath, content);
      }
    }
  }

  /**
   * Extract class component from AST
   */
  private extractClassComponent(node: any, components: IComponent[], filePath: string, content: string): void {
    const className = this.extractSimpleName(node);
    if (!className) return;

    const location = this.getNodeLocation(node);
    const pkg = this.currentPackageName;
    const fullName = pkg ? `${pkg}.${className}` : className;
    
    // Store current class context for methods/fields
    // Class context now handled by pushContext/popContext

    const classComponent: IComponent = {
      id: this.generateComponentId(filePath, className, ComponentType.CLASS),
      name: className,
      type: ComponentType.CLASS,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        isExported: this.hasPublicModifier(node),
        package: pkg,
        fullName: fullName,
        modifiers: this.extractModifiers(node),
        extends: this.extractSuperClass(node),
        implements: this.extractInterfaces(node),
        isAbstract: this.hasModifier(node, 'abstract'),
        isFinal: this.hasModifier(node, 'final'),
        accessModifier: this.getAccessModifier(node)
      },
      code: this.extractSourceCodeFromNode(content, node)
    };

    components.push(classComponent);

    // Push class context for nested components
    this.pushContext(classComponent);

    // Process class body directly without recursing through traverseAST
    const normalClass = node.children?.normalClassDeclaration?.[0];
    if (normalClass?.children?.classBody) {
      const classBody = normalClass.children.classBody[0];
      if (classBody) {
        this.processClassBody(classBody, components, filePath, content);
      }
    }

    // Restore previous class context
    this.popContext();
  }

  /**
   * Extract interface component from AST
   */
  private extractInterfaceComponent(node: any, components: IComponent[], filePath: string, content: string): void {
    const interfaceName = this.extractSimpleName(node);
    if (!interfaceName) return;

    const location = this.getNodeLocation(node);
    const pkg = this.currentPackageName;
    const fullName = pkg ? `${pkg}.${interfaceName}` : interfaceName;

    const interfaceComponent: IComponent = {
      id: this.generateComponentId(filePath, interfaceName, ComponentType.INTERFACE),
      name: interfaceName,
      type: ComponentType.INTERFACE,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        isExported: this.hasPublicModifier(node),
        package: pkg,
        fullName: fullName,
        modifiers: this.extractModifiers(node),
        extends: this.extractInterfaces(node)
      },
      code: this.extractSourceCodeFromNode(content, node)
    };

    components.push(interfaceComponent);

    // Push interface context for nested components
    this.pushContext(interfaceComponent);

    // Process interface body directly
    const normalInterface = node.children?.normalInterfaceDeclaration?.[0];
    if (normalInterface?.children?.interfaceBody) {
      const interfaceBody = normalInterface.children.interfaceBody[0];
      if (interfaceBody) {
        this.processInterfaceBody(interfaceBody, components, filePath, content);
      }
    }

    // Restore previous context
    this.popContext();
  }

  /**
   * Process class body to extract methods, fields, etc.
   */
  private processClassBody(classBody: any, components: IComponent[], filePath: string, content: string): void {
    if (!classBody.children) return;

    // Look for classBodyDeclaration
    if (classBody.children.classBodyDeclaration && Array.isArray(classBody.children.classBodyDeclaration)) {
      classBody.children.classBodyDeclaration.forEach((bodyDecl: any) => {
        this.processClassBodyDeclaration(bodyDecl, components, filePath, content);
      });
    }
  }

  /**
   * Process interface body to extract methods
   */
  private processInterfaceBody(interfaceBody: any, components: IComponent[], filePath: string, content: string): void {
    if (!interfaceBody.children) return;

    // Look for interfaceBodyDeclaration
    if (interfaceBody.children.interfaceBodyDeclaration && Array.isArray(interfaceBody.children.interfaceBodyDeclaration)) {
      interfaceBody.children.interfaceBodyDeclaration.forEach((bodyDecl: any) => {
        this.processInterfaceBodyDeclaration(bodyDecl, components, filePath, content);
      });
    }
  }

  /**
   * Process class body declaration (methods, fields, constructors)
   */
  private processClassBodyDeclaration(bodyDecl: any, components: IComponent[], filePath: string, content: string): void {
    if (!bodyDecl.children) return;

    // Check for classMemberDeclaration
    if (bodyDecl.children.classMemberDeclaration) {
      const memberDecl = bodyDecl.children.classMemberDeclaration[0];
      if (memberDecl) {
        this.processClassMemberDeclaration(memberDecl, components, filePath, content);
      }
    }

    // Check for direct constructorDeclaration
    if (bodyDecl.children.constructorDeclaration) {
      const constructorDecl = bodyDecl.children.constructorDeclaration[0];
      if (constructorDecl) {
        this.extractConstructorComponent(constructorDecl, components, filePath, content);
      }
    }
  }

  /**
   * Process interface body declaration
   */
  private processInterfaceBodyDeclaration(bodyDecl: any, components: IComponent[], filePath: string, content: string): void {
    if (!bodyDecl.children) return;

    // Process interface method declarations
    if (bodyDecl.children.interfaceMemberDeclaration) {
      const memberDecl = bodyDecl.children.interfaceMemberDeclaration[0];
      if (memberDecl?.children?.interfaceMethodDeclaration) {
        const methodDecl = memberDecl.children.interfaceMethodDeclaration[0];
        if (methodDecl) {
          this.extractMethodComponent(methodDecl, components, filePath, content);
        }
      }
    }
  }

  /**
   * Process class member declaration (methods, fields, constructors)
   */
  private processClassMemberDeclaration(memberDecl: any, components: IComponent[], filePath: string, content: string): void {
    if (!memberDecl.children) return;

    // Check for method declaration
    if (memberDecl.children.methodDeclaration) {
      const methodDecl = memberDecl.children.methodDeclaration[0];
      if (methodDecl) {
        this.extractMethodComponent(methodDecl, components, filePath, content);
      }
    }

    // Check for constructor declaration
    if (memberDecl.children.constructorDeclaration) {
      const constructorDecl = memberDecl.children.constructorDeclaration[0];
      if (constructorDecl) {
        this.extractConstructorComponent(constructorDecl, components, filePath, content);
      }
    }

    // Check for field declaration
    if (memberDecl.children.fieldDeclaration) {
      const fieldDecl = memberDecl.children.fieldDeclaration[0];
      if (fieldDecl) {
        this.extractFieldComponent(fieldDecl, components, filePath, content);
      }
    }
  }

  /**
   * Extract enum component from AST
   */
  private extractEnumComponent(node: any, components: IComponent[], filePath: string, content: string): void {
    const enumName = this.extractSimpleName(node);
    if (!enumName) return;

    const location = this.getNodeLocation(node);
    const pkg = this.currentPackageName;
    const fullName = pkg ? `${pkg}.${enumName}` : enumName;

    const enumComponent: IComponent = {
      id: this.generateComponentId(filePath, enumName, ComponentType.CLASS),
      name: enumName,
      type: ComponentType.CLASS,
      language: this.language,
      filePath,
      location,
      metadata: {
        isExported: this.hasPublicModifier(node),
        package: pkg,
        fullName: fullName,
        modifiers: this.extractModifiers(node),
        isEnum: true,
        accessModifier: this.getAccessModifier(node)
      },
      code: this.extractSourceCodeFromNode(content, node)
    };

    components.push(enumComponent);
  }

  /**
   * Extract method component from AST
   */
  private extractMethodComponent(node: any, components: IComponent[], filePath: string, content: string): void {
    const methodName = this.extractSimpleName(node);
    if (!methodName) return;

    const location = this.getNodeLocation(node);

    const methodComponent: IComponent = {
      id: this.generateComponentId(filePath, methodName, ComponentType.METHOD),
      name: methodName,
      type: ComponentType.METHOD,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        className: this.context.componentStack.length > 0 ? this.context.componentStack[this.context.componentStack.length - 1].name : undefined,
        modifiers: this.extractModifiers(node),
        isStatic: this.hasModifier(node, 'static'),
        isAbstract: this.hasModifier(node, 'abstract'),
        isFinal: this.hasModifier(node, 'final'),
        returnType: this.extractReturnType(node),
        parameters: this.extractMethodParameters(node),
        accessModifier: this.getAccessModifier(node)
      },
      code: this.extractSourceCodeFromNode(content, node)
    };

    components.push(methodComponent);
  }

  /**
   * Extract constructor component from AST
   */
  private extractConstructorComponent(node: any, components: IComponent[], filePath: string, content: string): void {
    const constructorName = this.extractSimpleName(node) || 'constructor';
    const location = this.getNodeLocation(node);

    const constructorComponent: IComponent = {
      id: this.generateComponentId(filePath, constructorName, ComponentType.CONSTRUCTOR),
      name: constructorName,
      type: ComponentType.CONSTRUCTOR,
      language: this.language,
      filePath,
      location,
      parentId: this.getCurrentParentId(),
      metadata: {
        className: this.context.componentStack.length > 0 ? this.context.componentStack[this.context.componentStack.length - 1].name : undefined,
        modifiers: this.extractModifiers(node),
        isConstructor: true,
        parameters: this.extractMethodParameters(node),
        accessModifier: this.getAccessModifier(node)
      },
      code: this.extractSourceCodeFromNode(content, node)
    };

    components.push(constructorComponent);
  }

  /**
   * Extract field component from AST
   */
  private extractFieldComponent(node: any, components: IComponent[], filePath: string, content: string): void {
    const fieldNames = this.extractFieldNames(node);
    if (!fieldNames.length) return;

    const location = this.getNodeLocation(node);
    const fieldType = this.extractFieldType(node);

    for (const fieldName of fieldNames) {
      const fieldComponent: IComponent = {
        id: this.generateComponentId(filePath, fieldName, ComponentType.PROPERTY),
        name: fieldName,
        type: ComponentType.PROPERTY,
        language: this.language,
        filePath,
        location,
        parentId: this.getCurrentParentId(),
        metadata: {
          className: this.context.componentStack.length > 0 ? this.context.componentStack[this.context.componentStack.length - 1].name : undefined,
          modifiers: this.extractModifiers(node),
          isStatic: this.hasModifier(node, 'static'),
          isFinal: this.hasModifier(node, 'final'),
          type: fieldType,
          accessModifier: this.getAccessModifier(node)
        },
        code: this.extractSourceCodeFromNode(content, node)
      };

      components.push(fieldComponent);
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
      extension: '.java'
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
        encoding: 'utf-8'
      },
      code: content // No truncation - store full file content
    };
  }

  // Helper methods for AST extraction
  private getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || '';
  }

  private getNodeLocation(node: any): any {
    const loc = node.location;
    if (loc) {
      return this.createLocation(loc.startLine || 1, loc.endLine || loc.startLine || 1);
    }
    return this.createLocation(1, 1);
  }

  private extractPackageName(node: any): string | undefined {
    // For java-parser, package names are in Identifier array
    if (node.children?.Identifier && Array.isArray(node.children.Identifier)) {
      const parts: string[] = [];
      node.children.Identifier.forEach((id: any) => {
        if (id.image) {
          parts.push(id.image);
        }
      });
      return parts.join('.');
    }
    
    // Fallback for qualifiedName structure
    if (node.children?.qualifiedName) {
      return this.extractQualifiedName(node.children.qualifiedName);
    }
    
    return undefined;
  }

  private extractSimpleName(node: any): string | undefined {
    // For class/interface declarations, look in normalClassDeclaration/normalInterfaceDeclaration
    if (node.children?.normalClassDeclaration) {
      const normalClass = node.children.normalClassDeclaration[0];
      if (normalClass?.children?.typeIdentifier) {
        const typeId = normalClass.children.typeIdentifier[0];
        if (typeId?.children?.Identifier && Array.isArray(typeId.children.Identifier)) {
          return typeId.children.Identifier[0]?.image;
        }
      }
    }
    
    if (node.children?.normalInterfaceDeclaration) {
      const normalInterface = node.children.normalInterfaceDeclaration[0];
      if (normalInterface?.children?.typeIdentifier) {
        const typeId = normalInterface.children.typeIdentifier[0];
        if (typeId?.children?.Identifier && Array.isArray(typeId.children.Identifier)) {
          return typeId.children.Identifier[0]?.image;
        }
      }
    }
    
    // For method declarations - name is in methodHeader -> methodDeclarator -> Identifier
    if (node.children?.methodHeader) {
      const methodHeader = node.children.methodHeader[0];
      if (methodHeader?.children?.methodDeclarator) {
        const methodDeclarator = methodHeader.children.methodDeclarator[0];
        if (methodDeclarator?.children?.Identifier && Array.isArray(methodDeclarator.children.Identifier)) {
          return methodDeclarator.children.Identifier[0]?.image;
        }
      }
    }
    
    // For constructor declarations and other direct Identifier cases
    if (node.children?.Identifier && Array.isArray(node.children.Identifier)) {
      return node.children.Identifier[0]?.image;
    }
    
    // For variable declarators (field names)
    if (node.children?.variableDeclaratorId) {
      const varId = node.children.variableDeclaratorId[0];
      if (varId?.children?.Identifier && Array.isArray(varId.children.Identifier)) {
        return varId.children.Identifier[0]?.image;
      }
    }
    
    // Fallback for other node types
    if (node.children?.simpleName && Array.isArray(node.children.simpleName)) {
      const nameNode = node.children.simpleName[0];
      if (nameNode?.children?.Identifier && Array.isArray(nameNode.children.Identifier)) {
        return nameNode.children.Identifier[0]?.image;
      }
    }
    
    // Another fallback for typeIdentifier directly
    if (node.children?.typeIdentifier) {
      const typeId = node.children.typeIdentifier[0];
      if (typeId?.children?.Identifier && Array.isArray(typeId.children.Identifier)) {
        return typeId.children.Identifier[0]?.image;
      }
    }
    
    return undefined;
  }

  private extractQualifiedName(qualifiedNameNode: any): string {
    // Extract qualified name from AST structure
    if (Array.isArray(qualifiedNameNode)) {
      qualifiedNameNode = qualifiedNameNode[0];
    }
    
    const parts: string[] = [];
    if (qualifiedNameNode?.children?.Identifier && Array.isArray(qualifiedNameNode.children.Identifier)) {
      qualifiedNameNode.children.Identifier.forEach((id: any) => {
        if (id.image) {
          parts.push(id.image);
        }
      });
    }
    
    return parts.join('.');
  }

  private extractModifiers(node: any): string[] {
    const modifiers: string[] = [];
    if (node.children?.classModifier && Array.isArray(node.children.classModifier)) {
      node.children.classModifier.forEach((mod: any) => {
        Object.keys(mod.children || {}).forEach(key => {
          if (key !== 'annotation') {
            modifiers.push(key);
          }
        });
      });
    }
    return modifiers;
  }

  private hasModifier(node: any, modifier: string): boolean {
    return this.extractModifiers(node).includes(modifier);
  }

  private hasPublicModifier(node: any): boolean {
    return this.hasModifier(node, 'public');
  }

  private getAccessModifier(node: any): 'public' | 'private' | 'protected' | 'package' {
    const modifiers = this.extractModifiers(node);
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('protected')) return 'protected';
    return 'package';
  }

  private extractSuperClass(node: any): string | undefined {
    if (node.children?.superclass && Array.isArray(node.children.superclass)) {
      const superclass = node.children.superclass[0];
      if (superclass?.children?.classType) {
        return this.extractQualifiedName(superclass.children.classType);
      }
    }
    return undefined;
  }

  private extractInterfaces(node: any): string[] {
    const interfaces: string[] = [];
    if (node.children?.superinterfaces && Array.isArray(node.children.superinterfaces)) {
      // Extract interface names from AST
      // This is complex due to AST structure, simplified implementation
    }
    return interfaces;
  }

  private extractReturnType(node: any): string | undefined {
    if (node.children?.result && Array.isArray(node.children.result)) {
      const result = node.children.result[0];
      if (result?.children?.unannType) {
        return this.extractTypeName(result.children.unannType);
      }
    }
    return 'void';
  }

  private extractMethodParameters(node: any): Array<{name: string; type?: string}> {
    const parameters: Array<{name: string; type?: string}> = [];
    
    if (node.children?.formalParameterList && Array.isArray(node.children.formalParameterList)) {
      const paramList = node.children.formalParameterList[0];
      if (paramList?.children?.formalParameter && Array.isArray(paramList.children.formalParameter)) {
        paramList.children.formalParameter.forEach((param: any) => {
          const name = this.extractSimpleName(param);
          const type = this.extractTypeName(param.children?.unannType);
          if (name) {
            parameters.push({ name, type });
          }
        });
      }
    }
    
    return parameters;
  }

  private extractFieldNames(node: any): string[] {
    const names: string[] = [];
    
    // For java-parser, field declarations have variableDeclaratorList
    if (node.children?.variableDeclaratorList && Array.isArray(node.children.variableDeclaratorList)) {
      const varList = node.children.variableDeclaratorList[0];
      if (varList?.children?.variableDeclarator && Array.isArray(varList.children.variableDeclarator)) {
        varList.children.variableDeclarator.forEach((varDecl: any) => {
          if (varDecl?.children?.variableDeclaratorId && Array.isArray(varDecl.children.variableDeclaratorId)) {
            const varId = varDecl.children.variableDeclaratorId[0];
            if (varId?.children?.Identifier && Array.isArray(varId.children.Identifier)) {
              const name = varId.children.Identifier[0]?.image;
              if (name) {
                names.push(name);
              }
            }
          }
        });
      }
    }
    
    return names;
  }

  private extractFieldType(node: any): string | undefined {
    if (node.children?.unannType) {
      return this.extractTypeName(node.children.unannType);
    }
    return 'Object';
  }

  private extractTypeName(typeNode: any): string {
    if (!typeNode) return 'Object';
    
    if (Array.isArray(typeNode)) {
      typeNode = typeNode[0];
    }
    
    // Simplified type extraction - this would need more comprehensive implementation
    // for complex generic types, arrays, etc.
    if (typeNode.children?.classOrInterfaceType) {
      return this.extractQualifiedName(typeNode.children.classOrInterfaceType);
    }
    
    return 'Object';
  }

  private extractSourceCodeFromNode(content: string, node: any): string {
    // Extract source code segment based on node location
    if (node.location && node.location.startLine && node.location.endLine) {
      return this.extractSourceCodeByRange(content, node.location.startLine, node.location.endLine);
    }
    return '';
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

  private extractJavaInheritanceRelationships(components: IComponent[], relationships: IRelationship[]): void {
    const classComponents = components.filter(c => c.type === ComponentType.CLASS);
    
    for (const classComp of classComponents) {
      const extendsClass = classComp.metadata?.extends;
      if (extendsClass) {
        const parentClass = classComponents.find(c => c.name === extendsClass || c.metadata?.fullName === extendsClass);
        if (parentClass) {
          relationships.push({
            id: `${classComp.id}-extends-${parentClass.id}`,
            type: RelationshipType.EXTENDS,
            sourceId: classComp.id,
            targetId: parentClass.id,
            metadata: {
              relationship: 'class-extends-class',
              inheritanceType: 'extends'
            }
          });
        }
      }
    }
  }

  private extractJavaImplementationRelationships(components: IComponent[], relationships: IRelationship[]): void {
    const classComponents = components.filter(c => c.type === ComponentType.CLASS);
    const interfaceComponents = components.filter(c => c.type === ComponentType.INTERFACE);
    
    for (const classComp of classComponents) {
      const implementsInterfaces = classComp.metadata?.implements || [];
      for (const interfaceName of implementsInterfaces) {
        const interfaceComp = interfaceComponents.find(i => i.name === interfaceName || i.metadata?.fullName === interfaceName);
        if (interfaceComp) {
          relationships.push({
            id: `${classComp.id}-implements-${interfaceComp.id}`,
            type: RelationshipType.IMPLEMENTS,
            sourceId: classComp.id,
            targetId: interfaceComp.id,
            metadata: {
              relationship: 'class-implements-interface',
              implementationType: 'implements'
            }
          });
        }
      }
    }
  }
}
