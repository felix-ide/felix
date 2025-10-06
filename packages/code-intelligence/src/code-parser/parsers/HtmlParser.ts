/**
 * HTML Parser - Parses HTML files and detects embedded languages
 */

import { BaseLanguageParser } from './BaseLanguageParser.js';
import { ParseError, LanguageBoundary } from '../interfaces/ILanguageParser.js';
import { IComponent, IRelationship, ComponentType, RelationshipType } from '../types.js';

/**
 * HTML parser that detects embedded JavaScript, CSS, and PHP
 */
export class HtmlParser extends BaseLanguageParser {
  constructor() {
    super('html', ['.html', '.htm', '.xhtml', '.vue']);
  }

  /**
   * Get HTML specific ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [
      ...this.getBaseIgnorePatterns()
    ];
  }

  /**
   * Validate that content is valid HTML
   */
  validateContent(content: string): boolean {
    // Basic HTML validation - check for HTML patterns
    const htmlPatterns = [
      /<\s*html/i,
      /<\s*head/i,
      /<\s*body/i,
      /<\s*div/i,
      /<\s*span/i,
      /<\s*p\b/i,
      /<\s*h[1-6]/i,
      /<!DOCTYPE\s+html/i
    ];
    
    return htmlPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate HTML syntax
   */
  validateSyntax(content: string): ParseError[] {
    const errors: ParseError[] = [];
    const lines = content.split('\n');
    
    // Basic tag matching
    const openTags: Array<{ tag: string; line: number }> = [];
    
    lines.forEach((line, index) => {
      // Find opening tags
      const openTagMatches = line.matchAll(/<\s*([a-zA-Z]+)(?:\s+[^>]*)?\s*>/g);
      for (const match of openTagMatches) {
        const tagName = match[1]?.toLowerCase();
        if (!tagName) continue;
        if (!this.isSelfClosingTag(tagName)) {
          openTags.push({ tag: tagName, line: index + 1 });
        }
      }
      
      // Find closing tags
      const closeTagMatches = line.matchAll(/<\s*\/\s*([a-zA-Z]+)\s*>/g);
      for (const match of closeTagMatches) {
        const tagName = match[1]?.toLowerCase();
        if (!tagName) continue;
        const lastOpen = openTags.map((tag, idx) => tag.tag === tagName ? idx : -1).filter(idx => idx !== -1).pop() ?? -1;
        
        if (lastOpen === -1) {
          errors.push(this.createParseError(
            `Closing tag </${tagName}> has no matching opening tag`,
            this.createLocation(index + 1, index + 1),
            'HTML_UNMATCHED_CLOSING_TAG',
            'warning'
          ));
        } else {
          openTags.splice(lastOpen, 1);
        }
      }
    });
    
    // Check for unclosed tags
    openTags.forEach(({ tag, line }) => {
      errors.push(this.createParseError(
        `Opening tag <${tag}> is not closed`,
        this.createLocation(line, line),
        'HTML_UNCLOSED_TAG',
        'warning'
      ));
    });
    
    return errors;
  }

  /**
   * Detect components in HTML content
   */
  detectComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    // Add file component
    components.push(this.createFileComponent(filePath, content));
    
    const lines = content.split('\n');
    
    // Extract major HTML sections
    this.extractHtmlSections(content, lines, filePath, components);
    
    // Extract script tags
    this.extractScriptTags(content, lines, filePath, components);
    
    // Extract style tags
    this.extractStyleTags(content, lines, filePath, components);
    
    // Extract inline event handlers
    this.extractInlineEventHandlers(content, lines, filePath, components);
    
    return components;
  }

  /**
   * Detect relationships between HTML components
   */
  detectRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    // Use base parser's containment detection
    relationships.push(...this.extractContainmentRelationships(components));
    
    // Add HTML-specific relationships (like script loading)
    this.extractScriptDependencies(components, content, relationships);
    
    return relationships;
  }

  /**
   * Detect language boundaries in HTML files
   */
  detectLanguageBoundaries(content: string, filePath: string): LanguageBoundary[] {
    const boundaries: LanguageBoundary[] = [];
    const lines = content.split('\n');
    
    // Default HTML boundary
    boundaries.push({
      language: 'html',
      startLine: 1,
      startColumn: 0,
      endLine: lines.length,
      endColumn: lines[lines.length - 1]?.length || 0,
      scope: 'text.html'
    });
    
    // Detect script tags
    const scriptRegex = /<script(?:\s+[^>]*)?>[\s\S]*?<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(content)) !== null) {
      const startPos = this.getLineAndColumn(content, scriptMatch.index);
      const endPos = this.getLineAndColumn(content, scriptMatch.index + scriptMatch[0].length);
      
      // Find actual content boundaries (after > and before </script>)
      const openTagEnd = scriptMatch[0].indexOf('>') + 1;
      const closeTagStart = scriptMatch[0].lastIndexOf('</script>');
      
      if (openTagEnd < closeTagStart) {
        const contentStartPos = this.getLineAndColumn(content, scriptMatch.index + openTagEnd);
        const contentEndPos = this.getLineAndColumn(content, scriptMatch.index + closeTagStart);
        
        boundaries.push({
          language: 'javascript',
          startLine: contentStartPos.line,
          startColumn: contentStartPos.column,
          endLine: contentEndPos.line,
          endColumn: contentEndPos.column,
          scope: 'source.js.embedded.html'
        });
      }
    }
    
    // Detect style tags
    const styleRegex = /<style(?:\s+[^>]*)?>[\s\S]*?<\/style>/gi;
    let styleMatch;
    while ((styleMatch = styleRegex.exec(content)) !== null) {
      const startPos = this.getLineAndColumn(content, styleMatch.index);
      const endPos = this.getLineAndColumn(content, styleMatch.index + styleMatch[0].length);
      
      // Find actual content boundaries
      const openTagEnd = styleMatch[0].indexOf('>') + 1;
      const closeTagStart = styleMatch[0].lastIndexOf('</style>');
      
      if (openTagEnd < closeTagStart) {
        const contentStartPos = this.getLineAndColumn(content, styleMatch.index + openTagEnd);
        const contentEndPos = this.getLineAndColumn(content, styleMatch.index + closeTagStart);
        
        boundaries.push({
          language: 'css',
          startLine: contentStartPos.line,
          startColumn: contentStartPos.column,
          endLine: contentEndPos.line,
          endColumn: contentEndPos.column,
          scope: 'source.css.embedded.html'
        });
      }
    }
    
    // Detect PHP tags
    const phpRegex = /<\?(?:php|=)[\s\S]*?\?>/gi;
    let phpMatch;
    while ((phpMatch = phpRegex.exec(content)) !== null) {
      const startPos = this.getLineAndColumn(content, phpMatch.index);
      const endPos = this.getLineAndColumn(content, phpMatch.index + phpMatch[0].length);
      
      boundaries.push({
        language: 'php',
        startLine: startPos.line,
        startColumn: startPos.column,
        endLine: endPos.line,
        endColumn: endPos.column,
        scope: 'source.php.embedded.html'
      });
    }
    
    return boundaries;
  }

  /**
   * Extract major HTML sections (head, body)
   */
  private extractHtmlSections(content: string, lines: string[], filePath: string, components: IComponent[]): void {
    // Extract <head> section
    const headMatch = content.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (headMatch) {
      const startLine = this.getLineNumber(content, headMatch.index!);
      const endLine = this.getLineNumber(content, headMatch.index! + headMatch[0].length);
      
      components.push({
        id: this.generateComponentId(filePath, 'head', ComponentType.SECTION),
        name: 'head',
        type: ComponentType.SECTION,
        language: this.language,
        filePath,
        location: this.createLocation(startLine, endLine),
        parentId: this.getCurrentParentId(),
        metadata: {
          sectionType: 'head',
          documentation: 'HTML document head section'
        }
      });
    }
    
    // Extract <body> section
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const startLine = this.getLineNumber(content, bodyMatch.index!);
      const endLine = this.getLineNumber(content, bodyMatch.index! + bodyMatch[0].length);
      
      components.push({
        id: this.generateComponentId(filePath, 'body', ComponentType.SECTION),
        name: 'body',
        type: ComponentType.SECTION,
        language: this.language,
        filePath,
        location: this.createLocation(startLine, endLine),
        parentId: this.getCurrentParentId(),
        metadata: {
          sectionType: 'body',
          documentation: 'HTML document body section'
        }
      });
    }
  }

  /**
   * Extract script tags
   */
  private extractScriptTags(content: string, lines: string[], filePath: string, components: IComponent[]): void {
    const scriptRegex = /<script(?:\s+([^>]*))?>[\s\S]*?<\/script>/gi;
    let match;
    let scriptIndex = 0;
    
    while ((match = scriptRegex.exec(content)) !== null) {
      const attributes = this.parseAttributes(match[1] || '');
      const startLine = this.getLineNumber(content, match.index);
      const endLine = this.getLineNumber(content, match.index + match[0].length);
      
      const scriptName = attributes.id || `script_${scriptIndex++}`;
      
      components.push({
        id: this.generateComponentId(filePath, scriptName, ComponentType.EMBEDDED_SCRIPT),
        name: scriptName,
        type: ComponentType.EMBEDDED_SCRIPT,
        language: 'javascript',
        filePath,
        location: this.createLocation(startLine, endLine),
        code: match[0],
        parentId: this.getCurrentParentId(),
        metadata: {
          src: attributes.src,
          type: attributes.type || 'text/javascript',
          async: 'async' in attributes,
          defer: 'defer' in attributes,
          module: attributes.type === 'module'
        }
      });
    }
  }

  /**
   * Extract style tags
   */
  private extractStyleTags(content: string, lines: string[], filePath: string, components: IComponent[]): void {
    const styleRegex = /<style(?:\s+([^>]*))?>[\s\S]*?<\/style>/gi;
    let match;
    let styleIndex = 0;
    
    while ((match = styleRegex.exec(content)) !== null) {
      const attributes = this.parseAttributes(match[1] || '');
      const startLine = this.getLineNumber(content, match.index);
      const endLine = this.getLineNumber(content, match.index + match[0].length);
      
      const styleName = attributes.id || `style_${styleIndex++}`;
      
      components.push({
        id: this.generateComponentId(filePath, styleName, ComponentType.EMBEDDED_STYLE),
        name: styleName,
        type: ComponentType.EMBEDDED_STYLE,
        language: 'css',
        filePath,
        location: this.createLocation(startLine, endLine),
        code: match[0],
        parentId: this.getCurrentParentId(),
        metadata: {
          type: attributes.type || 'text/css',
          media: attributes.media,
          scoped: 'scoped' in attributes
        }
      });
    }
  }

  /**
   * Extract inline event handlers
   */
  private extractInlineEventHandlers(content: string, lines: string[], filePath: string, components: IComponent[]): void {
    const eventHandlerRegex = /\bon\w+\s*=\s*["']([^"']+)["']/gi;
    let match;
    let handlerIndex = 0;
    
    while ((match = eventHandlerRegex.exec(content)) !== null) {
      const handlerCode = match[1];
      const line = this.getLineNumber(content, match.index);
      
      components.push({
        id: this.generateComponentId(filePath, `inline_handler_${handlerIndex++}`, ComponentType.FUNCTION),
        name: `inline_handler_${line}`,
        type: ComponentType.FUNCTION,
        language: 'javascript',
        filePath,
        location: this.createLocation(line, line),
        code: handlerCode,
        parentId: this.getCurrentParentId(),
        metadata: {
          isInlineHandler: true,
          eventType: match[0].match(/on(\w+)/i)?.[1]?.toLowerCase()
        }
      });
    }
  }

  /**
   * Extract script dependencies
   */
  private extractScriptDependencies(components: IComponent[], content: string, relationships: IRelationship[]): void {
    const scriptComponents = components.filter(c => c.type === ComponentType.EMBEDDED_SCRIPT);
    
    scriptComponents.forEach((script, index) => {
      if (script.metadata.src) {
        // External script dependency
        relationships.push({
          id: this.generateRelationshipId(script.id, script.metadata.src, 'includes'),
          type: RelationshipType.INCLUDES,
          sourceId: script.id,
          targetId: `EXTERNAL:${script.metadata.src}`,
          metadata: {
            resourceType: 'script',
            url: script.metadata.src,
            async: script.metadata.async,
            defer: script.metadata.defer
          }
        });
      }
      
      // Script load order relationships
      if (index > 0 && !script.metadata.async && !script.metadata.defer) {
        const previousScript = scriptComponents[index - 1];
        if (previousScript && !previousScript.metadata.async && !previousScript.metadata.defer) {
          relationships.push({
            id: this.generateRelationshipId(previousScript.id, script.id, 'flows_to'),
            type: RelationshipType.FLOWS_TO,
            sourceId: previousScript.id,
            targetId: script.id,
            metadata: {
              flowType: 'script_load_order',
              sequential: true
            }
          });
        }
      }
    });
  }

  /**
   * Parse HTML attributes
   */
  private parseAttributes(attributeString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attrRegex = /(\w+)(?:\s*=\s*["']([^"']*)["'])?/g;
    let match;
    
    while ((match = attrRegex.exec(attributeString)) !== null) {
      if (match[1]) {
        attributes[match[1]] = match[2] || 'true';
      }
    }
    
    return attributes;
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Get line and column from character index
   */
  private getLineAndColumn(content: string, index: number): { line: number; column: number } {
    const lines = content.substring(0, index).split('\n');
    const lastLine = lines[lines.length - 1];
    return {
      line: lines.length,
      column: lastLine ? lastLine.length : 0
    };
  }

  /**
   * Check if a tag is self-closing
   */
  private isSelfClosingTag(tagName: string): boolean {
    const selfClosingTags = [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr'
    ];
    return selfClosingTags.includes(tagName.toLowerCase());
  }
}