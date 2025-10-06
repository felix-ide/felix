/**
 * Native Tree-sitter JavaScript/TypeScript Parser
 * Supports both JavaScript and TypeScript using tree-sitter grammars
 */

import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
// @ts-ignore - TypeScript package exports both typescript and tsx
import TypeScriptModule from 'tree-sitter-typescript';
import { TreeSitterStructuralParser } from './TreeSitterStructuralParser.js';
import { IComponent, IRelationship, ComponentType } from '../../types.js';
import { ParseError } from '../../interfaces/ILanguageParser.js';
import { extname } from 'path';

const TypeScript = TypeScriptModule.typescript;
const TSX = TypeScriptModule.tsx;

export class TreeSitterJavaScriptParser extends TreeSitterStructuralParser {
  private jsParser: Parser;
  private tsParser: Parser;
  private tsxParser: Parser;

  constructor() {
    super('javascript', ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);

    // JavaScript parser
    this.jsParser = new Parser();
    this.jsParser.setLanguage(JavaScript);

    // TypeScript parser
    this.tsParser = new Parser();
    this.tsParser.setLanguage(TypeScript);

    // TSX parser
    this.tsxParser = new Parser();
    this.tsxParser.setLanguage(TSX);
  }

  private getParserForFile(filePath: string): Parser {
    const ext = extname(filePath).toLowerCase();
    if (ext === '.ts') return this.tsParser;
    if (ext === '.tsx') return this.tsxParser;
    return this.jsParser;
  }

  async detectComponents(content: string, filePath: string): Promise<IComponent[]> {
    const components: IComponent[] = [];
    const parser = this.getParserForFile(filePath);
    const tree = parser.parse(content);

    this.beginFileContext(filePath, content, components);

    try {
      this.extractComponents(tree.rootNode, components, filePath, content);
    } finally {
      this.endFileContext();
    }

    return components;
  }

  async detectRelationships(components: IComponent[], content: string): Promise<IRelationship[]> {
    // FALLBACK PARSER: Only lightweight structural relationships
    // This parser is used for multi-language file splitting, NOT primary parsing
    // Heavy semantic analysis happens in JavaScriptParser (primary)
    return this.collectStandardRelationships(components, content);
  }

  async validateSyntax(content: string, filePath?: string): Promise<ParseError[]> {
    const errors: ParseError[] = [];
    const parser = filePath ? this.getParserForFile(filePath) : this.jsParser;
    const tree = parser.parse(content);
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
    // Extract the block content from the full file content
    const lines = fullContent.split('\n');
    const blockContent = lines.slice(block.startLine - 1, block.endLine).join('\n');

    // Parse the block content with the appropriate parser
    const parser = this.getParserForFile(filePath);
    const tree = parser.parse(blockContent);

    const components: IComponent[] = [];

    this.beginFileContext(filePath, blockContent, components);
    try {
      this.extractComponents(tree.rootNode, components, filePath, blockContent);
    } finally {
      this.endFileContext();
    }

    const adjustedComponents = components.map(comp => ({
      ...comp,
      location: {
        ...comp.location,
        startLine: comp.location.startLine + block.startLine - 1,
        endLine: comp.location.endLine + block.startLine - 1
      }
    }));

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
  ) {
    // Function declarations
    if (node.type === 'function_declaration' || node.type === 'function_expression') {
      const nameNode = node.childForFieldName('name');

      const location = this.toLocation(node);
      const functionComponent: IComponent = {
        id: this.generateComponentId(filePath, nameNode?.text || 'anonymous', ComponentType.FUNCTION),
        name: nameNode?.text || 'anonymous',
        type: ComponentType.FUNCTION,
        filePath,
        language: this.language,
        location,
        code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
        parentId: this.getCurrentParentId(),
        metadata: {
          async: node.children.some(c => c.type === 'async'),
          generator: node.children.some(c => c.type === '*'),
          parameters: this.extractParameters(node.childForFieldName('parameters'))
        }
      };

      components.push(functionComponent);
      this.pushContext(functionComponent);
      node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
      this.popContext();
      return;
    }

    // Arrow functions
    if (node.type === 'arrow_function') {
      // Try to get name from variable declarator if assigned
      let name = 'anonymous';
      if (node.parent?.type === 'variable_declarator') {
        const nameNode = node.parent.childForFieldName('name');
        name = nameNode?.text || 'anonymous';
      }

      const location = this.toLocation(node);
      const arrowComponent: IComponent = {
        id: this.generateComponentId(filePath, `${name}_arrow_${location.startLine}`, ComponentType.FUNCTION),
        name,
        type: ComponentType.FUNCTION,
        filePath,
        language: this.language,
        location,
        code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
        parentId: this.getCurrentParentId(),
        metadata: {
          arrow: true,
          async: node.children.some(c => c.type === 'async'),
          parameters: this.extractParameters(node.childForFieldName('parameters'))
        }
      };

      components.push(arrowComponent);
      this.pushContext(arrowComponent);
      node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
      this.popContext();
      return;
    }

    // Classes
    if (node.type === 'class_declaration' || node.type === 'class_expression') {
      const nameNode = node.childForFieldName('name');

      // Find superclass in class_heritage
      let superclassName: string | undefined;
      const heritageNode = node.children.find(c => c.type === 'class_heritage');
      if (heritageNode) {
        // The superclass is the identifier after 'extends'
        for (let i = 0; i < heritageNode.childCount; i++) {
          const child = heritageNode.child(i);
          if (child && child.type === 'identifier') {
            superclassName = child.text;
            break;
          }
        }
      }

      const className = nameNode?.text || 'anonymous';
      const location = this.toLocation(node);
      const classComponent: IComponent = {
        id: this.generateComponentId(filePath, className, ComponentType.CLASS),
        name: className,
        type: ComponentType.CLASS,
        filePath,
        language: this.language,
        location,
        code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
        parentId: this.getCurrentParentId(),
        metadata: {
          superClass: superclassName,
          decorators: this.extractDecorators(node)
        }
      };

      components.push(classComponent);
      this.pushContext(classComponent);
      node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
      this.popContext();
      return;
    }

    // Methods
    if (node.type === 'method_definition') {
      const nameNode = node.childForFieldName('name');
      const isConstructor = nameNode?.text === 'constructor';
      const location = this.toLocation(node);
      const methodComponent: IComponent = {
        id: this.generateComponentId(filePath, nameNode?.text || 'anonymous', isConstructor ? ComponentType.CONSTRUCTOR : ComponentType.METHOD),
        name: nameNode?.text || 'anonymous',
        type: isConstructor ? ComponentType.CONSTRUCTOR : ComponentType.METHOD,
        filePath,
        language: this.language,
        location,
        code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
        parentId: this.getCurrentParentId(),
        metadata: {
          async: node.children.some(c => c.type === 'async'),
          static: node.children.some(c => c.type === 'static'),
          generator: node.children.some(c => c.type === '*'),
          parameters: this.extractParameters(node.childForFieldName('parameters')),
          visibility: 'public'
        }
      };

      if (this.context.componentStack.length > 0) {
        const parent = this.context.componentStack[this.context.componentStack.length - 1];
        if (parent) {
          methodComponent.metadata = {
            ...methodComponent.metadata,
            className: parent.name
          };
        }
      }

      components.push(methodComponent);
      this.pushContext(methodComponent);
      node.namedChildren.forEach(child => this.extractComponents(child, components, filePath, content));
      this.popContext();
      return;
    }

    // Variables/Constants
    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name');
      const valueNode = node.childForFieldName('value');

      // Check parent for const/let/var
      let kind = 'var';
      if (node.parent?.type === 'lexical_declaration') {
        kind = node.parent.children[0]?.text || 'let';
      }

      const location = this.toLocation(node);
      components.push({
        id: this.generateComponentId(filePath, nameNode?.text || 'anonymous', ComponentType.VARIABLE),
        name: nameNode?.text || 'anonymous',
        type: ComponentType.VARIABLE,
        filePath,
        language: this.language,
        location,
        code: this.extractSourceCodeByRange(content, location.startLine, location.endLine),
        parentId: this.getCurrentParentId(),
        metadata: {
          kind,
          exported: this.isComponentExported(nameNode?.text || ''),
          type: valueNode ? this.inferType(valueNode) : undefined
        }
      });
      return;
    }

    // Recurse through children
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      this.extractComponents(child, components, filePath, content);
    }
  }

  private extractParameters(paramsNode: Parser.SyntaxNode | null): string[] {
    if (!paramsNode) return [];

    const params: string[] = [];
    for (let i = 0; i < paramsNode.namedChildCount; i++) {
      const param = paramsNode.namedChild(i);
      if (param && param.type !== ',') {
        params.push(param.text);
      }
    }
    return params;
  }

  private toLocation(node: Parser.SyntaxNode) {
    return this.createLocation(
      node.startPosition.row + 1,
      node.endPosition.row + 1,
      node.startPosition.column,
      node.endPosition.column
    );
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

  private inferType(valueNode: Parser.SyntaxNode): string {
    switch (valueNode.type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'true':
      case 'false': return 'boolean';
      case 'array': return 'array';
      case 'object': return 'object';
      case 'arrow_function':
      case 'function_expression': return 'function';
      case 'new_expression': {
        const constructor = valueNode.childForFieldName('constructor');
        return constructor ? constructor.text : 'object';
      }
      default: return 'any';
    }
  }

  private isComponentExported(name: string): boolean {
    // Simple check - would need more sophisticated logic in real implementation
    return false;
  }

  private collectErrors(node: Parser.SyntaxNode, errors: ParseError[], content: string) {
    if (node.type === 'ERROR' || node.isMissing) {
      errors.push({
        message: `Syntax error at line ${node.startPosition.row + 1}`,
        severity: 'error',
        source: 'javascript',
        location: {
          startLine: node.startPosition.row + 1,
          startColumn: node.startPosition.column,
          endLine: node.endPosition.row + 1,
          endColumn: node.endPosition.column
        }
      });
    }

    for (let i = 0; i < node.childCount; i++) {
      this.collectErrors(node.child(i)!, errors, content);
    }
  }
}
