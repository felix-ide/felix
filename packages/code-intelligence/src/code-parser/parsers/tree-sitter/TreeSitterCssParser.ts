/**
 * Native Tree-sitter CSS Parser
 */

import Parser from 'tree-sitter';
import CSS from 'tree-sitter-css';
import { TreeSitterStructuralParser } from './TreeSitterStructuralParser.js';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../../types.js';
import { ParseError } from '../../interfaces/ILanguageParser.js';

export class TreeSitterCssParser extends TreeSitterStructuralParser {
  private parser: Parser;

  constructor() {
    super('css', ['.css', '.scss', '.sass', '.less']);
    this.parser = new Parser();
    this.parser.setLanguage(CSS);
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
    const cssImports = this.extractCssImportRelationships(components);
    return this.collectStandardRelationships(components, content, [cssImports]);
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
      case 'stylesheet':
      case 'block':
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        return;

      case 'rule_set': {
        const selectorsNode = node.childForFieldName('selectors');
        const selector = selectorsNode?.text || 'unknown';
        const location = this.toLocation(node);
        const component: IComponent = {
          id: this.generateComponentId(filePath, selector, ComponentType.DECORATOR),
          name: selector,
          type: ComponentType.DECORATOR,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            selector,
            ruleType: this.getRuleType(selector)
          }
        };
        components.push(component);
        this.pushContext(component);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'media_statement': {
        const queryNode = node.childForFieldName('query');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `media_${node.startPosition.row}`, ComponentType.ANNOTATION),
          name: `@media ${queryNode?.text || ''}`,
          type: ComponentType.ANNOTATION,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            query: queryNode?.text
          }
        });
        break;
      }

      case 'keyframes_statement': {
        const nameNode = node.childForFieldName('name');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `keyframes_${nameNode?.text || 'anonymous'}`, ComponentType.ANNOTATION),
          name: `@keyframes ${nameNode?.text || 'anonymous'}`,
          type: ComponentType.ANNOTATION,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            animationName: nameNode?.text
          }
        });
        break;
      }

      case 'import_statement': {
        const uriNode = node.childForFieldName('uri');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `import_${node.startPosition.row}`, ComponentType.MODULE),
          name: `@import ${uriNode?.text || ''}`,
          type: ComponentType.MODULE,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            uri: uriNode?.text?.replace(/url\((.*)\)/, '$1')
          }
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

  private extractCssImportRelationships(components: IComponent[]): IRelationship[] {
    const fileComponent = components.find(component => component.type === ComponentType.FILE);
    if (!fileComponent) return [];

    const relationships: IRelationship[] = [];
    for (const component of components) {
      if (component.type !== ComponentType.MODULE) continue;
      const uri = component.metadata?.uri as string | undefined;
      if (!uri) continue;
      const normalized = uri.replace(/['"]/g, '').trim();
      if (!normalized) continue;
      relationships.push({
        id: this.generateRelationshipId(fileComponent.id, normalized, RelationshipType.IMPORTS),
        type: RelationshipType.IMPORTS,
        sourceId: fileComponent.id,
        targetId: normalized,
        metadata: {
          syntax: 'css_import',
          line: component.location?.startLine
        }
      });
    }
    return relationships;
  }

  private getRuleType(selector: string): string {
    if (selector.startsWith('.')) return 'class';
    if (selector.startsWith('#')) return 'id';
    if (selector.includes(':')) return 'pseudo';
    if (selector.includes('@')) return 'at-rule';
    return 'element';
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
        message: `CSS syntax error at line ${node.startPosition.row + 1}`,
        severity: 'error',
        source: 'css',
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
