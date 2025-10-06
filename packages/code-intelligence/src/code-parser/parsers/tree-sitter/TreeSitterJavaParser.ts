/**
 * Native Tree-sitter Java Parser
 */

import Parser from 'tree-sitter';
import Java from 'tree-sitter-java';
import { TreeSitterStructuralParser } from './TreeSitterStructuralParser.js';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../../types.js';
import { ParseError } from '../../interfaces/ILanguageParser.js';

export class TreeSitterJavaParser extends TreeSitterStructuralParser {
  private parser: Parser;

  constructor() {
    super('java', ['.java']);
    this.parser = new Parser();
    this.parser.setLanguage(Java);
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
    const javaExtras = this.collectJavaRelationships(content, filePath);
    return this.collectStandardRelationships(components, content, [javaExtras]);
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
      case 'constructor_body':
      case 'block':
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        return;

      case 'package_declaration': {
        const nameNode = node.children.find(c => c.type === 'scoped_identifier' || c.type === 'identifier');
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

      case 'import_declaration': {
        const importNode = node.children.find(c =>
          c.type === 'scoped_identifier' || c.type === 'identifier' || c.type === 'asterisk'
        );
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `import_${node.startPosition.row}`, ComponentType.MODULE),
          name: `import ${importNode?.text || ''}`,
          type: ComponentType.MODULE,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            modulePath: importNode?.text,
            static: node.children.some(child => child.type === 'static')
          }
        });
        break;
      }

      case 'class_declaration': {
        const nameNode = node.childForFieldName('name');
        const superclassNode = node.childForFieldName('superclass');
        const interfacesNode = node.childForFieldName('interfaces');
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
            extends: superclassNode?.text,
            implements: this.extractInterfaceList(interfacesNode),
            abstract: this.hasModifier(node, 'abstract'),
            final: this.hasModifier(node, 'final'),
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
        const extendsNode = node.childForFieldName('extends');
        const interfaceName = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
        const interfaceComponent: IComponent = {
          id: this.generateComponentId(filePath, interfaceName, ComponentType.INTERFACE),
          name: interfaceName,
          type: ComponentType.INTERFACE,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            extends: this.extractInterfaceList(extendsNode)
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
        const enumName = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
        const enumComponent: IComponent = {
          id: this.generateComponentId(filePath, enumName, ComponentType.ENUM),
          name: enumName,
          type: ComponentType.ENUM,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            visibility: this.extractVisibility(node)
          }
        };
        components.push(enumComponent);
        this.pushContext(enumComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'method_declaration': {
        const nameNode = node.childForFieldName('name');
        const paramsNode = node.childForFieldName('parameters');
        const returnTypeNode = node.childForFieldName('type');
        const methodName = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
        const methodType = this.getMethodType(node);
        const methodComponent: IComponent = {
          id: this.generateComponentId(filePath, methodName, methodType),
          name: methodName,
          type: methodType,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            parameters: this.extractParameters(paramsNode),
            returnType: returnTypeNode?.text || 'void',
            visibility: this.extractVisibility(node),
            static: this.hasModifier(node, 'static'),
            abstract: this.hasModifier(node, 'abstract'),
            final: this.hasModifier(node, 'final'),
            synchronized: this.hasModifier(node, 'synchronized')
          }
        };
        components.push(methodComponent);
        this.pushContext(methodComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'constructor_declaration': {
        const nameNode = node.childForFieldName('name');
        const paramsNode = node.childForFieldName('parameters');
        const constructorName = nameNode?.text || 'constructor';
        const location = this.toLocation(node);
        const constructorComponent: IComponent = {
          id: this.generateComponentId(filePath, constructorName, ComponentType.CONSTRUCTOR),
          name: constructorName,
          type: ComponentType.CONSTRUCTOR,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            parameters: this.extractParameters(paramsNode),
            visibility: this.extractVisibility(node)
          }
        };
        components.push(constructorComponent);
        this.pushContext(constructorComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'field_declaration': {
        const typeNode = node.childForFieldName('type');
        const declaratorNode = node.childForFieldName('declarator');
        if (declaratorNode) {
          const nameNode = declaratorNode.childForFieldName('name') || declaratorNode;
          const location = this.toLocation(node);
          components.push({
            id: this.generateComponentId(filePath, nameNode?.text || 'field', this.getFieldType(node)),
            name: nameNode?.text || 'field',
            type: this.getFieldType(node),
            language: this.language,
            filePath,
            location,
            code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
            parentId: this.getCurrentParentId(),
            metadata: {
              type: typeNode?.text,
              visibility: this.extractVisibility(node),
              static: this.hasModifier(node, 'static'),
              final: this.hasModifier(node, 'final'),
              transient: this.hasModifier(node, 'transient'),
              volatile: this.hasModifier(node, 'volatile')
            }
          });
        }
        break;
      }

      case 'annotation': {
        const nameNode = node.childForFieldName('name');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `annotation_${node.startPosition.row}`, ComponentType.ANNOTATION),
          name: `@${nameNode?.text || 'unknown'}`,
          type: ComponentType.ANNOTATION,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {}
        });
        break;
      }
    }

    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!child) continue;
      this.extractComponents(child, components, filePath, content);
    }
  }

  private collectJavaRelationships(content: string, filePath: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const tree = this.parser.parse(content);
    this.walkRelationships(tree.rootNode, relationships, filePath);
    return relationships;
  }

  private walkRelationships(node: Parser.SyntaxNode, relationships: IRelationship[], filePath: string): void {
    switch (node.type) {
      case 'method_invocation': {
        const nameNode = node.childForFieldName('name');
        const objectNode = node.childForFieldName('object');
        if (nameNode) {
          relationships.push({
            id: `${filePath}:${node.startPosition.row}:calls:${nameNode.text}`,
            type: RelationshipType.CALLS,
            sourceId: `${filePath}:${node.startPosition.row}`,
            targetId: nameNode.text,
            metadata: {
              line: node.startPosition.row + 1,
              receiver: objectNode?.text
            }
          });
        }
        break;
      }
      case 'import_declaration': {
        const importNode = node.children.find(c =>
          c.type === 'scoped_identifier' ||
          c.type === 'identifier' ||
          c.type === 'asterisk'
        );
        if (importNode) {
          const importPath = importNode.text;
          relationships.push({
            id: `${filePath}:import:${importPath}`,
            type: RelationshipType.IMPORTS,
            sourceId: filePath,
            targetId: importPath,
            metadata: {
              line: node.startPosition.row + 1,
              static: node.children.some(child => child.type === 'static'),
              wildcard: importNode.type === 'asterisk'
            }
          });
        }
        break;
      }
      case 'class_declaration': {
        const nameNode = node.childForFieldName('name');
        const superclassNode = node.childForFieldName('superclass');
        const interfacesNode = node.childForFieldName('interfaces');
        if (nameNode && superclassNode) {
          relationships.push({
            id: `${filePath}:class:${nameNode.text}:extends:${superclassNode.text}`,
            type: RelationshipType.EXTENDS,
            sourceId: `${filePath}:class:${nameNode.text}`,
            targetId: superclassNode.text,
            metadata: {
              line: node.startPosition.row + 1
            }
          });
        }
        if (nameNode && interfacesNode) {
          const interfaces = this.extractInterfaceList(interfacesNode);
          interfaces.forEach(iface => {
            relationships.push({
              id: `${filePath}:class:${nameNode.text}:implements:${iface}`,
              type: RelationshipType.IMPLEMENTS,
              sourceId: `${filePath}:class:${nameNode.text}`,
              targetId: iface,
              metadata: {
                line: node.startPosition.row + 1
              }
            });
          });
        }
        break;
      }
      case 'annotation': {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          relationships.push({
            id: `${filePath}:annotation:${nameNode.text}:${node.startPosition.row}`,
            type: RelationshipType.ANNOTATES,
            sourceId: `${filePath}:${node.startPosition.row}`,
            targetId: nameNode.text,
            metadata: {
              line: node.startPosition.row + 1
            }
          });
        }
        break;
      }
      case 'object_creation_expression': {
        const typeNode = node.childForFieldName('type');
        if (typeNode) {
          relationships.push({
            id: `${filePath}:creates:${typeNode.text}:${node.startPosition.row}`,
            type: RelationshipType.INSTANTIATES,
            sourceId: `${filePath}:${node.startPosition.row}`,
            targetId: typeNode.text,
            metadata: {
              line: node.startPosition.row + 1
            }
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
      if (!param || param.type !== 'formal_parameter') continue;
      const nameNode = param.childForFieldName('name');
      const typeNode = param.childForFieldName('type');
      if (nameNode) {
        params.push(`${typeNode?.text || 'Object'} ${nameNode.text}`);
      }
    }
    return params;
  }

  private extractInterfaceList(interfacesNode: Parser.SyntaxNode | null): string[] {
    if (!interfacesNode) return [];
    const interfaces: string[] = [];
    for (let i = 0; i < interfacesNode.namedChildCount; i++) {
      const iface = interfacesNode.namedChild(i);
      if (iface && iface.type === 'type_identifier') {
        interfaces.push(iface.text);
      }
    }
    return interfaces;
  }

  private extractVisibility(node: Parser.SyntaxNode): string {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      if (child.type === 'modifiers') {
        for (let j = 0; j < child.childCount; j++) {
          const modifier = child.child(j);
          if (!modifier) continue;
          if (modifier.type === 'public' || modifier.type === 'private' || modifier.type === 'protected') {
            return modifier.type;
          }
        }
      }
      if (child.type === 'public' || child.type === 'private' || child.type === 'protected') {
        return child.type;
      }
    }
    return 'package-private';
  }

  private hasModifier(node: Parser.SyntaxNode, modifier: string): boolean {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      if (child.type === modifier) {
        return true;
      }
      if (child.type === 'modifiers') {
        for (let j = 0; j < child.childCount; j++) {
          const modChild = child.child(j);
          if (modChild && modChild.type === modifier) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private getMethodType(node: Parser.SyntaxNode): ComponentType {
    if (this.hasModifier(node, 'abstract')) return ComponentType.ABSTRACT_METHOD;
    if (this.hasModifier(node, 'static')) return ComponentType.STATIC_METHOD;
    const visibility = this.extractVisibility(node);
    if (visibility === 'private') return ComponentType.PRIVATE_METHOD;
    if (visibility === 'protected') return ComponentType.PROTECTED_METHOD;
    if (visibility === 'public') return ComponentType.PUBLIC_METHOD;
    return ComponentType.METHOD;
  }

  private getFieldType(node: Parser.SyntaxNode): ComponentType {
    const visibility = this.extractVisibility(node);
    const isStatic = this.hasModifier(node, 'static');
    const isFinal = this.hasModifier(node, 'final');
    if (isStatic && isFinal) return ComponentType.CONSTANT;
    if (isStatic) return ComponentType.STATIC_PROPERTY;
    if (visibility === 'private') return ComponentType.PRIVATE_PROPERTY;
    if (visibility === 'protected') return ComponentType.PROTECTED_PROPERTY;
    if (visibility === 'public') return ComponentType.PUBLIC_PROPERTY;
    return ComponentType.PROPERTY;
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
        message: `Java syntax error at line ${node.startPosition.row + 1}`,
        severity: 'error',
        source: 'java',
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
