/**
 * Native Tree-sitter C# Parser
 */

import Parser from 'tree-sitter';
import CSharp from 'tree-sitter-c-sharp';
import { TreeSitterStructuralParser } from './TreeSitterStructuralParser.js';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../../types.js';
import { ParseError } from '../../interfaces/ILanguageParser.js';

export class TreeSitterCSharpParser extends TreeSitterStructuralParser {
  private parser: Parser;

  constructor() {
    super('csharp', ['.cs']);
    this.parser = new Parser();
    this.parser.setLanguage(CSharp);
  }

  async detectComponents(content: string, filePath: string): Promise<IComponent[]> {
    const components: IComponent[] = [];
    const tree = this.parser.parse(content);

    this.beginFileContext(filePath, content, components);
    try {
      this.extractComponents(tree.rootNode, components, filePath, content);
    } finally {
      this.endFileContext();
    }

    return components;
  }

  async detectRelationships(components: IComponent[], content: string): Promise<IRelationship[]> {
    const filePath = components[0]?.filePath || '';
    const extras = this.collectCSharpRelationships(content, filePath);
    return this.collectStandardRelationships(components, content, [extras]);
  }

  async validateSyntax(content: string): Promise<ParseError[]> {
    const errors: ParseError[] = [];
    const tree = this.parser.parse(content);
    if (tree.rootNode.hasError) {
      this.collectErrors(tree.rootNode, errors, content);
    }
    return errors;
  }

  async parseCodeBlock(
    block: any,
    fullContent: string,
    filePath: string,
    options?: any
  ): Promise<{ components: IComponent[]; relationships: IRelationship[]; metadata?: any }> {
    const lines = fullContent.split('\n');
    const blockContent = lines.slice(block.startLine - 1, block.endLine).join('\n');
    const components: IComponent[] = [];

    this.beginFileContext(filePath, blockContent, components);
    try {
      const tree = this.parser.parse(blockContent);
      this.extractComponents(tree.rootNode, components, filePath, blockContent);
    } finally {
      this.endFileContext();
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
    switch (node.type) {
      case 'compilation_unit':
      case 'class_body':
      case 'interface_body':
      case 'enum_body':
      case 'namespace_body':
      case 'struct_body':
      case 'block':
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        return;

      case 'namespace_declaration': {
        const nameNode = node.childForFieldName('name');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, nameNode?.text || 'default', ComponentType.NAMESPACE),
          name: nameNode?.text || 'default',
          type: ComponentType.NAMESPACE,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {}
        });
        break;
      }

      case 'using_directive': {
        const nameNode = node.childForFieldName('name');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `using_${node.startPosition.row}`, ComponentType.MODULE),
          name: `using ${nameNode?.text || ''}`,
          type: ComponentType.MODULE,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            modulePath: nameNode?.text
          }
        });
        break;
      }

      case 'class_declaration': {
        const nameNode = node.childForFieldName('name');
        const basesNode = node.childForFieldName('bases');
        const className = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
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
            bases: basesNode?.text,
            abstract: node.children.some(child => child.type === 'abstract'),
            partial: node.children.some(child => child.type === 'partial'),
            visibility: this.extractVisibility(node)
          }
        };
        components.push(classComponent);
        this.pushContext(classComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'interface_declaration': {
        const nameNode = node.childForFieldName('name');
        const location = this.toLocation(node);
        const interfaceComponent: IComponent = {
          id: this.generateComponentId(filePath, nameNode?.text || 'anonymous', ComponentType.INTERFACE),
          name: nameNode?.text || 'anonymous',
          type: ComponentType.INTERFACE,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            visibility: this.extractVisibility(node)
          }
        };
        components.push(interfaceComponent);
        this.pushContext(interfaceComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'enum_declaration': {
        const nameNode = node.childForFieldName('name');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, nameNode?.text || 'enum', ComponentType.ENUM),
          name: nameNode?.text || 'enum',
          type: ComponentType.ENUM,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            visibility: this.extractVisibility(node)
          }
        });
        break;
      }

      case 'method_declaration': {
        const nameNode = node.childForFieldName('name');
        const returnTypeNode = node.childForFieldName('type');
        const paramsNode = node.childForFieldName('parameters');
        const methodName = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
        const methodComponent: IComponent = {
          id: this.generateComponentId(filePath, methodName, ComponentType.METHOD),
          name: methodName,
          type: ComponentType.METHOD,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            returnType: returnTypeNode?.text,
            async: node.children.some(child => child.type === 'async'),
            static: node.children.some(child => child.type === 'static'),
            visibility: this.extractVisibility(node),
            parameters: this.extractParameters(paramsNode)
          }
        };
        components.push(methodComponent);
        this.pushContext(methodComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'constructor_declaration': {
        const paramsNode = node.childForFieldName('parameters');
        const location = this.toLocation(node);
        const constructorComponent: IComponent = {
          id: this.generateComponentId(filePath, `ctor_${node.startPosition.row}`, ComponentType.CONSTRUCTOR),
          name: 'constructor',
          type: ComponentType.CONSTRUCTOR,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            visibility: this.extractVisibility(node),
            parameters: this.extractParameters(paramsNode)
          }
        };
        components.push(constructorComponent);
        this.pushContext(constructorComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'property_declaration': {
        const nameNode = node.childForFieldName('name');
        const typeNode = node.childForFieldName('type');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, nameNode?.text || 'property', ComponentType.PROPERTY),
          name: nameNode?.text || 'property',
          type: ComponentType.PROPERTY,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            type: typeNode?.text,
            visibility: this.extractVisibility(node)
          }
        });
        break;
      }

      case 'field_declaration': {
        const declaratorNode = node.childForFieldName('declarator');
        const typeNode = node.childForFieldName('type');
        if (declaratorNode) {
          const location = this.toLocation(node);
          components.push({
            id: this.generateComponentId(filePath, declaratorNode.text || 'field', ComponentType.FIELD),
            name: declaratorNode.text || 'field',
            type: ComponentType.FIELD,
            language: this.language,
            filePath,
            location,
            code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
            parentId: this.getCurrentParentId(),
            metadata: {
              type: typeNode?.text,
              visibility: this.extractVisibility(node)
            }
          });
        }
        break;
      }
    }

    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!child) continue;
      this.extractComponents(child, components, filePath, content);
    }
  }

  private collectCSharpRelationships(content: string, filePath: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const tree = this.parser.parse(content);
    this.walkRelationships(tree.rootNode, relationships, filePath);
    return relationships;
  }

  private walkRelationships(node: Parser.SyntaxNode, relationships: IRelationship[], filePath: string): void {
    switch (node.type) {
      case 'invocation_expression': {
        const functionNode = node.childForFieldName('function');
        if (functionNode) {
          relationships.push({
            id: `${filePath}:${node.startPosition.row}:calls:${functionNode.text}`,
            type: RelationshipType.CALLS,
            sourceId: `${filePath}:${node.startPosition.row}`,
            targetId: functionNode.text,
            metadata: {
              line: node.startPosition.row + 1
            }
          });
        }
        break;
      }
      case 'using_directive': {
        const nameNode = node.childForFieldName('name');
        relationships.push({
          id: `${filePath}:using:${nameNode?.text}`,
          type: RelationshipType.IMPORTS,
          sourceId: filePath,
          targetId: nameNode?.text || '',
          metadata: {
            line: node.startPosition.row + 1
          }
        });
        break;
      }
      case 'class_declaration': {
        const nameNode = node.childForFieldName('name');
        const basesNode = node.childForFieldName('bases');
        if (nameNode && basesNode) {
          const baseTypes = basesNode.text.split(',').map(s => s.trim()).filter(Boolean);
          baseTypes.forEach(base => {
            const relationType = base.startsWith('I') ? RelationshipType.IMPLEMENTS : RelationshipType.EXTENDS;
            relationships.push({
              id: `${filePath}:class:${nameNode.text}:${relationType}:${base}`,
              type: relationType,
              sourceId: `${filePath}:class:${nameNode.text}`,
              targetId: base,
              metadata: {
                line: node.startPosition.row + 1
              }
            });
          });
        }
        break;
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      this.walkRelationships(child, relationships, filePath);
    }
  }

  private extractParameters(paramsNode: Parser.SyntaxNode | null): string[] {
    if (!paramsNode) return [];
    const params: string[] = [];
    for (let i = 0; i < paramsNode.namedChildCount; i++) {
      const param = paramsNode.namedChild(i);
      if (!param || param.type !== 'parameter') continue;
      const nameNode = param.childForFieldName('name');
      if (nameNode) {
        params.push(nameNode.text);
      }
    }
    return params;
  }

  private extractVisibility(node: Parser.SyntaxNode): string {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      if (child.type === 'public' || child.type === 'private' || child.type === 'protected' || child.type === 'internal') {
        return child.type;
      }
    }
    return 'private';
  }

  private toLocation(node: Parser.SyntaxNode) {
    return this.createLocation(
      node.startPosition.row + 1,
      node.endPosition.row + 1,
      node.startPosition.column,
      node.endPosition.column
    );
  }

  private collectErrors(node: Parser.SyntaxNode, errors: ParseError[], content: string) {
    if (node.type === 'ERROR' || node.isMissing) {
      errors.push({
        message: `C# syntax error at line ${node.startPosition.row + 1}`,
        severity: 'error',
        source: 'csharp',
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
      if (!child) continue;
      this.collectErrors(child, errors, content);
    }
  }
}
