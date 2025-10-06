/**
 * Native Tree-sitter Python Parser
 * Uses native Node bindings instead of WASM - much simpler!
 */

import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
import { PythonStructuralParser } from '../PythonStructuralParser.js';
import { IComponent, IRelationship, ComponentType } from '../../types.js';
import { ParseError } from '../../interfaces/ILanguageParser.js';

export class TreeSitterPythonParser extends PythonStructuralParser {
  private parser: Parser;

  constructor() {
    super('python', ['.py', '.pyw', '.pyi']);
    this.parser = new Parser();
    this.parser.setLanguage(Python);
  }

  async detectComponents(content: string, filePath: string): Promise<IComponent[]> {
    this.clearContext();
    const components: IComponent[] = [];
    const { moduleComponent } = this.beginFileModuleContext(filePath, content, components);

    try {
      const tree = this.parser.parse(content);
      this.extractComponents(tree.rootNode, components, filePath, content);
    } finally {
      this.endFileModuleContext();
    }

    if (moduleComponent && !components.includes(moduleComponent)) {
      components.push(moduleComponent);
    }

    return components;
  }

  async detectRelationships(components: IComponent[], content: string): Promise<IRelationship[]> {
    // FALLBACK PARSER: Only lightweight structural relationships
    // This parser is used for multi-language file splitting, NOT primary parsing
    // Heavy semantic analysis happens in PythonParser (primary)
    const relationships: IRelationship[] = [];
    const seen = new Set<string>();
    const push = (rels: IRelationship[]) => {
      for (const rel of rels) {
        if (!rel.id) {
          rel.id = this.generateRelationshipId(rel.sourceId, rel.targetId, rel.type as string);
        }
        if (seen.has(rel.id)) continue;
        seen.add(rel.id);
        relationships.push(rel);
      }
    };

    push(this.extractUsageRelationships(components, content));
    push(this.extractInheritanceRelationships(components, content));
    push(this.extractImportExportRelationships(components, content));
    push(this.extractContainmentRelationships(components));
    push(this.linkModuleContainment(components));
    push(this.linkPythonInheritanceRelationships(components));

    return relationships;
  }

  async validateSyntax(content: string): Promise<ParseError[]> {
    const errors: ParseError[] = [];
    const tree = this.parser.parse(content);
    if (tree.rootNode.hasError) {
      this.collectErrors(tree.rootNode, errors, content);
    }
    return errors;
  }

  /**
   * Parse a specific code block with offset adjustment
   * Required for integration with BlockScanner segmentation
   */
  async parseCodeBlock(
    block: any,
    fullContent: string,
    filePath: string,
    options?: any
  ): Promise<{ components: IComponent[]; relationships: IRelationship[]; metadata?: any }> {
    const lines = fullContent.split('\n');
    const blockContent = lines.slice(block.startLine - 1, block.endLine).join('\n');

    this.clearContext();
    const components: IComponent[] = [];
    const { moduleComponent } = this.beginFileModuleContext(filePath, blockContent, components);

    try {
      const tree = this.parser.parse(blockContent);
      this.extractComponents(tree.rootNode, components, filePath, blockContent);
    } finally {
      this.endFileModuleContext();
    }

    if (moduleComponent && !components.includes(moduleComponent)) {
      components.push(moduleComponent);
    }

    const adjustedComponents = components.map(component => {
      if (!component.location) return component;
      return {
        ...component,
        location: {
          ...component.location,
          startLine: component.location.startLine + block.startLine - 1,
          endLine: component.location.endLine + block.startLine - 1
        }
      };
    });

    const relationships = await this.detectRelationships(adjustedComponents, blockContent);

    return {
      components: adjustedComponents,
      relationships,
      metadata: {
        parsingLevel: 'structural',
        backend: 'tree-sitter',
        capabilities: {
          symbols: true,
          relationships: true,
          ranges: true,
          types: true,
          controlFlow: false,
          incremental: false
        }
      }
    };
  }

  private extractComponents(
    node: Parser.SyntaxNode,
    components: IComponent[],
    filePath: string,
    content: string
  ): void {
    if (!node) return;

    switch (node.type) {
      case 'module':
      case 'block':
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        return;
      case 'class_definition': {
        const nameNode = node.childForFieldName('name');
        const className = nameNode?.text || 'AnonymousClass';
        const location = this.toLocation(node);
        const moduleName = this.currentModuleName;
        const fullName = this.buildFullName(moduleName, className);
        const parentId = this.getCurrentParentId();
        const baseClasses = this.extractSuperclasses(node.childForFieldName('superclasses'));

        const classComponent: IComponent = {
          id: this.generateComponentId(filePath, className, ComponentType.CLASS),
          name: className,
          type: ComponentType.CLASS,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId,
          metadata: {
            baseClasses,
            decorators: this.extractDecorators(node),
            isAbstract: false
          }
        };

        this.stampModuleMetadata(classComponent, moduleName, fullName);
        components.push(classComponent);
        this.pushContext(classComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }
      case 'function_definition': {
        const nameNode = node.childForFieldName('name');
        const functionName = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
        const parentComponent = this.context.componentStack[this.context.componentStack.length - 1];
        const isMethod = parentComponent?.type === ComponentType.CLASS;
        const componentType = isMethod ? ComponentType.METHOD : ComponentType.FUNCTION;
        const moduleName = this.currentModuleName;
        const parentFullName = parentComponent?.metadata?.fullName as string | undefined ||
          (parentComponent ? this.buildFullName(moduleName, parentComponent.name) : undefined);
        const fullName = isMethod
          ? this.buildFullName(parentFullName, functionName)
          : this.buildFullName(moduleName, functionName);

        const metadata: Record<string, unknown> = {
          parameters: this.extractParameters(node.childForFieldName('parameters')),
          returnType: node.childForFieldName('return_type')?.text,
          decorators: this.extractDecorators(node),
          isAsync: node.children.some(child => child.type === 'async')
        };

        if (isMethod && parentComponent) {
          metadata.className = parentComponent.name;
          metadata.classFullName = parentComponent.metadata?.fullName || parentFullName;
        }

        const functionComponent: IComponent = {
          id: this.generateComponentId(filePath, functionName, componentType),
          name: functionName,
          type: componentType,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata
        };

        this.stampModuleMetadata(functionComponent, moduleName, fullName);
        components.push(functionComponent);
        this.pushContext(functionComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }
      case 'lambda': {
        const location = this.toLocation(node);
        const moduleName = this.currentModuleName;
        const parentComponent = this.context.componentStack[this.context.componentStack.length - 1];
        const parentFullName = parentComponent?.metadata?.fullName as string | undefined ||
          (parentComponent ? this.buildFullName(moduleName, parentComponent.name) : undefined);
        const fullName = this.buildFullName(parentFullName || moduleName, 'lambda');

        const lambdaComponent: IComponent = {
          id: this.generateComponentId(filePath, `lambda_${location.startLine}_${location.startColumn}`, ComponentType.FUNCTION),
          name: 'lambda',
          type: ComponentType.FUNCTION,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            lambda: true,
            parameters: this.extractParameters(node.childForFieldName('parameters'))
          }
        };

        this.stampModuleMetadata(lambdaComponent, moduleName, fullName);
        components.push(lambdaComponent);
        return;
      }
      case 'assignment': {
        const leftNode = node.childForFieldName('left');
        const rightNode = node.childForFieldName('right');
        if (!leftNode || leftNode.type !== 'identifier') break;

        const parentComponent = this.context.componentStack[this.context.componentStack.length - 1];
        const parentType = parentComponent?.type;
        const isModuleLevel = parentType === ComponentType.FILE || parentType === ComponentType.MODULE;
        const isClassLevel = parentType === ComponentType.CLASS;
        if (!isModuleLevel && !isClassLevel) break;

        const variableName = leftNode.text;
        const location = this.toLocation(node);
        const moduleName = this.currentModuleName;
        const parentFullName = parentComponent?.metadata?.fullName as string | undefined ||
          (parentComponent ? this.buildFullName(moduleName, parentComponent.name) : undefined);
        const fullName = isClassLevel
          ? this.buildFullName(parentFullName, variableName)
          : this.buildFullName(moduleName, variableName);

        const componentType = isClassLevel ? ComponentType.PROPERTY : ComponentType.VARIABLE;

        const variableComponent: IComponent = {
          id: this.generateComponentId(filePath, variableName, componentType),
          name: variableName,
          type: componentType,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            constant: this.isConstantName(variableName),
            type: this.inferType(rightNode),
            isModuleLevel,
            isClassLevel
          }
        };

        if (isClassLevel && parentComponent) {
          variableComponent.metadata = {
            ...variableComponent.metadata,
            className: parentComponent.name,
            classFullName: parentComponent.metadata?.fullName || parentFullName
          };
        }

        this.stampModuleMetadata(variableComponent, moduleName, fullName);
        components.push(variableComponent);
        return;
      }
      default:
        break;
    }

    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) {
        this.extractComponents(child, components, filePath, content);
      }
    }
  }

  private toLocation(node: Parser.SyntaxNode) {
    return this.createLocation(
      node.startPosition.row + 1,
      node.endPosition.row + 1,
      node.startPosition.column,
      node.endPosition.column
    );
  }

  private extractParameters(paramsNode: Parser.SyntaxNode | null): string[] {
    if (!paramsNode) return [];

    const params: string[] = [];
    for (let i = 0; i < paramsNode.namedChildCount; i++) {
      const param = paramsNode.namedChild(i);
      if (!param) continue;
      if (param.type === 'identifier' || param.type === 'typed_parameter') {
        const name = param.type === 'typed_parameter'
          ? param.childForFieldName('name')?.text || param.text
          : param.text;
        if (name && !params.includes(name)) {
          params.push(name);
        }
      }
    }
    return params;
  }

  private extractSuperclasses(superclassesNode: Parser.SyntaxNode | null): string[] {
    if (!superclassesNode) return [];

    const superclasses: string[] = [];
    for (let i = 0; i < superclassesNode.namedChildCount; i++) {
      const superclass = superclassesNode.namedChild(i);
      if (superclass && superclass.text) {
        superclasses.push(superclass.text);
      }
    }
    return superclasses;
  }

  private extractDecorators(node: Parser.SyntaxNode): string[] {
    const decorators: string[] = [];
    let sibling = node.previousSibling;
    while (sibling && sibling.type === 'decorator') {
      const decoratorName = sibling.child(1)?.text;
      if (decoratorName) {
        decorators.unshift(`@${decoratorName}`);
      }
      sibling = sibling.previousSibling;
    }
    return decorators;
  }

  private inferType(valueNode: Parser.SyntaxNode | null): string {
    if (!valueNode) return 'any';

    switch (valueNode.type) {
      case 'string': return 'str';
      case 'integer': return 'int';
      case 'float': return 'float';
      case 'true':
      case 'false': return 'bool';
      case 'list': return 'list';
      case 'dictionary': return 'dict';
      case 'tuple': return 'tuple';
      case 'set': return 'set';
      case 'lambda': return 'function';
      case 'none': return 'None';
      case 'call': {
        const func = valueNode.childForFieldName('function');
        return func ? func.text : 'object';
      }
      default: return 'any';
    }
  }

  private isConstantName(name: string): boolean {
    return name === name.toUpperCase() && /[A-Z]/.test(name);
  }

  private collectErrors(node: Parser.SyntaxNode, errors: ParseError[], content: string) {
    if (node.type === 'ERROR' || node.isMissing) {
      errors.push({
        message: `Python syntax error at line ${node.startPosition.row + 1}`,
        severity: 'error',
        source: 'python',
        location: {
          startLine: node.startPosition.row + 1,
          startColumn: node.startPosition.column,
          endLine: node.endPosition.row + 1,
          endColumn: node.endPosition.column
        }
      });
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.collectErrors(child, errors, content);
      }
    }
  }
}
