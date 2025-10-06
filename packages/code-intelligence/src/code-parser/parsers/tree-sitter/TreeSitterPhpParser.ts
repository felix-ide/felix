/**
 * Native Tree-sitter PHP Parser
 */

import Parser from 'tree-sitter';
import PHPModule from 'tree-sitter-php';
import { TreeSitterStructuralParser } from './TreeSitterStructuralParser.js';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../../types.js';
import { ParseError } from '../../interfaces/ILanguageParser.js';

const PHP = (PHPModule as any).php;

export class TreeSitterPhpParser extends TreeSitterStructuralParser {
  private parser: Parser;

  constructor() {
    super('php', ['.php', '.php3', '.php4', '.php5', '.phtml']);
    this.parser = new Parser();
    this.parser.setLanguage(PHP);
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
    const extras = this.collectPhpRelationships(content, filePath);
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
      case 'program':
      case 'compound_statement':
      case 'class_declaration_list':
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        return;

      case 'namespace_definition': {
        const nameNode = node.childForFieldName('name');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, nameNode?.text || '\\', ComponentType.NAMESPACE),
          name: nameNode?.text || '\\',
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

      case 'function_definition': {
        const nameNode = node.childForFieldName('name');
        const paramsNode = node.childForFieldName('parameters');
        const returnTypeNode = node.childForFieldName('return_type');
        const functionName = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
        const functionComponent: IComponent = {
          id: this.generateComponentId(filePath, functionName, ComponentType.FUNCTION),
          name: functionName,
          type: ComponentType.FUNCTION,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            parameters: this.extractParameters(paramsNode),
            returnType: returnTypeNode?.text,
            visibility: 'public'
          }
        };
        components.push(functionComponent);
        this.pushContext(functionComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'class_declaration': {
        const nameNode = node.childForFieldName('name');
        const baseClauseNode = node.childForFieldName('base_clause');
        const className = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
        const baseInfo = this.extractBaseClasses(baseClauseNode);
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
            extends: baseInfo.filter(b => b.relation === RelationshipType.EXTENDS).map(b => b.name),
            implements: baseInfo.filter(b => b.relation === RelationshipType.IMPLEMENTS).map(b => b.name),
            abstract: node.children.some(child => child.type === 'abstract_modifier'),
            final: node.children.some(child => child.type === 'final_modifier')
          }
        };
        components.push(classComponent);
        this.pushContext(classComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'method_declaration': {
        const nameNode = node.childForFieldName('name');
        const paramsNode = node.childForFieldName('parameters');
        const returnTypeNode = node.childForFieldName('return_type');
        const methodName = nameNode?.text || 'anonymous';
        const location = this.toLocation(node);
        const methodComponent: IComponent = {
          id: this.generateComponentId(filePath, methodName, ComponentType.METHOD),
          name: methodName,
          type: this.getMethodType(node),
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            parameters: this.extractParameters(paramsNode),
            returnType: returnTypeNode?.text,
            visibility: this.getVisibility(node)
          }
        };
        components.push(methodComponent);
        this.pushContext(methodComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'property_declaration': {
        const nameNode = node.childForFieldName('name');
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
            visibility: this.getVisibility(node)
          }
        });
        return;
      }

      case 'constant_declaration': {
        const nameNode = node.childForFieldName('name');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, nameNode?.text || 'constant', ComponentType.CONSTANT),
          name: nameNode?.text || 'constant',
          type: ComponentType.CONSTANT,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {}
        });
        return;
      }
    }

    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (!child) continue;
      this.extractComponents(child, components, filePath, content);
    }
  }

  private collectPhpRelationships(content: string, filePath: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const tree = this.parser.parse(content);
    this.walkRelationships(tree.rootNode, relationships, filePath);
    const baseInfo = this.extractBaseClassesFromTree(tree.rootNode, filePath);
    relationships.push(...baseInfo);
    return relationships;
  }

  private walkRelationships(node: Parser.SyntaxNode, relationships: IRelationship[], filePath: string): void {
    switch (node.type) {
      case 'qualified_name': {
        // noop - handled via parent constructs
        break;
      }
      case 'function_call_expression': {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          relationships.push({
            id: `${filePath}:call:${nameNode.text}:${node.startPosition.row}`,
            type: RelationshipType.CALLS,
            sourceId: `${filePath}:${node.startPosition.row}`,
            targetId: nameNode.text,
            metadata: {
              line: node.startPosition.row + 1
            }
          });
        }
        break;
      }
      case 'namespace_use_declaration': {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          relationships.push({
            id: `${filePath}:use:${nameNode.text}`,
            type: RelationshipType.IMPORTS,
            sourceId: filePath,
            targetId: nameNode.text,
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
      if (!param || param.type !== 'parameter') continue;
      const nameNode = param.childForFieldName('name');
      if (nameNode) {
        params.push(nameNode.text);
      }
    }
    return params;
  }

  private extractBaseClasses(baseClauseNode: Parser.SyntaxNode | null): Array<{ name: string; relation: RelationshipType }> {
    const bases: Array<{ name: string; relation: RelationshipType }> = [];
    if (!baseClauseNode) return bases;
    let currentRelation: RelationshipType = RelationshipType.IMPLEMENTS;
    for (let i = 0; i < baseClauseNode.childCount; i++) {
      const child = baseClauseNode.child(i);
      if (!child) continue;
      if (child.type === 'extends') {
        currentRelation = RelationshipType.EXTENDS;
      } else if (child.type === 'implements') {
        currentRelation = RelationshipType.IMPLEMENTS;
      } else if (child.type === 'qualified_name') {
        bases.push({ name: child.text, relation: currentRelation });
      }
    }
    return bases;
  }

  private extractBaseClassesFromTree(root: Parser.SyntaxNode, filePath: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const visit = (node: Parser.SyntaxNode) => {
      if (node.type === 'class_declaration') {
        const nameNode = node.childForFieldName('name');
        const baseClauseNode = node.childForFieldName('base_clause');
        if (nameNode && baseClauseNode) {
          const bases = this.extractBaseClasses(baseClauseNode);
          bases.forEach(base => {
            relationships.push({
              id: `${filePath}:class:${nameNode.text}:${base.relation}:${base.name}`,
              type: base.relation,
              sourceId: `${filePath}:class:${nameNode.text}`,
              targetId: base.name,
              metadata: {
                line: node.startPosition.row + 1
              }
            });
          });
        }
      }
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (!child) continue;
        visit(child);
      }
    };
    visit(root);
    return relationships;
  }

  private getMethodType(node: Parser.SyntaxNode): ComponentType {
    const visibility = this.getVisibility(node);
    if (node.children.some(child => child.type === 'static_modifier')) {
      return ComponentType.STATIC_METHOD;
    }
    if (visibility === 'private') return ComponentType.PRIVATE_METHOD;
    if (visibility === 'protected') return ComponentType.PROTECTED_METHOD;
    return ComponentType.METHOD;
  }

  private getVisibility(node: Parser.SyntaxNode): string {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      if (child.type === 'visibility_modifier') {
        return child.text;
      }
    }
    return 'public';
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
        message: `PHP syntax error at line ${node.startPosition.row + 1}`,
        severity: 'error',
        source: 'php',
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
