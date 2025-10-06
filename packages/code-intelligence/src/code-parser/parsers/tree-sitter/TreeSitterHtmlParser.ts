/**
 * Native Tree-sitter HTML Parser
 */

import Parser from 'tree-sitter';
import HTML from 'tree-sitter-html';
import { TreeSitterStructuralParser } from './TreeSitterStructuralParser.js';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../../types.js';
import { ParseError } from '../../interfaces/ILanguageParser.js';

export class TreeSitterHtmlParser extends TreeSitterStructuralParser {
  private parser: Parser;

  constructor() {
    super('html', ['.html', '.htm', '.xhtml', '.vue']);
    this.parser = new Parser();
    this.parser.setLanguage(HTML);
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
    const extras = this.collectHtmlRelationships(content, filePath);
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
      case 'document':
      case 'fragment':
      case 'template_element':
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        return;

      case 'element': {
        const startTag = node.childForFieldName('start_tag');
        const tagName = this.extractTagName(startTag);
        const location = this.toLocation(node);
        const elementComponent: IComponent = {
          id: this.generateComponentId(filePath, `${tagName}_${node.startPosition.row}`, ComponentType.UNKNOWN),
          name: tagName,
          type: ComponentType.UNKNOWN,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            tagName,
            attributes: this.extractAttributes(startTag),
            selfClosing: node.childForFieldName('end_tag') === null,
            hasChildren: node.namedChildCount > 1
          }
        };
        components.push(elementComponent);
        this.pushContext(elementComponent);
        node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
        this.popContext();
        return;
      }

      case 'self_closing_tag': {
        const tagName = this.extractTagName(node);
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `${tagName}_${node.startPosition.row}`, ComponentType.UNKNOWN),
          name: tagName,
          type: ComponentType.UNKNOWN,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            tagName,
            attributes: this.extractAttributes(node),
            selfClosing: true,
            hasChildren: false
          }
        });
        return;
      }

      case 'script_element': {
        const scriptContent = node.childForFieldName('raw_text');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `script_${node.startPosition.row}`, ComponentType.MODULE),
          name: 'script',
          type: ComponentType.MODULE,
          language: this.language,
          filePath,
          location,
          code: scriptContent?.text || '',
          parentId: this.getCurrentParentId(),
          metadata: {
            type: this.getAttributeValue(node, 'type') || this.getScriptType(node),
            src: this.getAttributeValue(node, 'src')
          }
        });
        return;
      }

      case 'style_element': {
        const styleContent = node.childForFieldName('raw_text');
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `style_${node.startPosition.row}`, ComponentType.ANNOTATION),
          name: 'style',
          type: ComponentType.ANNOTATION,
          language: this.language,
          filePath,
          location,
          code: styleContent?.text || '',
          parentId: this.getCurrentParentId(),
          metadata: {
            type: this.getAttributeValue(node, 'type') || 'text/css'
          }
        });
        return;
      }

      case 'doctype': {
        const location = this.toLocation(node);
        components.push({
          id: this.generateComponentId(filePath, `doctype_${node.startPosition.row}`, ComponentType.ANNOTATION),
          name: 'DOCTYPE',
          type: ComponentType.ANNOTATION,
          language: this.language,
          filePath,
          location,
          code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
          parentId: this.getCurrentParentId(),
          metadata: {
            declaration: node.text
          }
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

  private collectHtmlRelationships(content: string, filePath: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const tree = this.parser.parse(content);
    this.walkRelationships(tree.rootNode, relationships, filePath);
    return relationships;
  }

  private walkRelationships(node: Parser.SyntaxNode, relationships: IRelationship[], filePath: string): void {
    if (node.type === 'element') {
      const startTag = node.childForFieldName('start_tag');
      const tagName = this.extractTagName(startTag);
      if (tagName === 'link') {
        const href = this.getAttributeValue(node, 'href');
        if (href) {
          relationships.push({
            id: `${filePath}:link:${href}`,
            type: RelationshipType.IMPORTS,
            sourceId: filePath,
            targetId: href,
            metadata: {
              line: node.startPosition.row + 1,
              rel: this.getAttributeValue(node, 'rel')
            }
          });
        }
      }
      if (tagName === 'script') {
        const src = this.getAttributeValue(node, 'src');
        if (src) {
          relationships.push({
            id: `${filePath}:script:${src}`,
            type: RelationshipType.IMPORTS,
            sourceId: filePath,
            targetId: src,
            metadata: {
              line: node.startPosition.row + 1,
              resourceType: 'script'
            }
          });
        }
      }
      if (tagName === 'img') {
        const src = this.getAttributeValue(node, 'src');
        if (src) {
          relationships.push({
            id: `${filePath}:img:${src}`,
            type: RelationshipType.REFERENCES,
            sourceId: filePath,
            targetId: src,
            metadata: {
              line: node.startPosition.row + 1,
              resourceType: 'image'
            }
          });
        }
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      this.walkRelationships(child, relationships, filePath);
    }
  }

  private extractTagName(node: Parser.SyntaxNode | null): string {
    if (!node) return 'unknown';
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'tag_name') {
        return child.text;
      }
    }
    return 'unknown';
  }

  private extractAttributes(node: Parser.SyntaxNode | null): Record<string, string> {
    const attributes: Record<string, string> = {};
    if (!node) return attributes;
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'attribute') {
        const nameNode = child.childForFieldName('name');
        const valueNode = child.childForFieldName('value');
        if (nameNode) {
          const name = nameNode.text;
          const value = valueNode ? valueNode.text.replace(/['"]/g, '') : '';
          attributes[name] = value;
        }
      }
    }
    return attributes;
  }

  private getAttributeValue(node: Parser.SyntaxNode, attrName: string): string | null {
    const startTag = node.childForFieldName('start_tag') || node;
    const attrs = this.extractAttributes(startTag);
    return attrs[attrName] || null;
  }

  private getScriptType(node: Parser.SyntaxNode): string {
    const typeAttr = this.getAttributeValue(node, 'type');
    if (typeAttr) return typeAttr;
    const srcAttr = this.getAttributeValue(node, 'src');
    if (srcAttr && srcAttr.endsWith('.mjs')) return 'module';
    return 'text/javascript';
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
        message: `HTML syntax error at line ${node.startPosition.row + 1}`,
        severity: 'error',
        source: 'html',
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
