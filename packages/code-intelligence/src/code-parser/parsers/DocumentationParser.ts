/**
 * Documentation Parser - Comprehensive documentation analysis
 * 
 * This parser analyzes documentation files (Markdown, HTML, structured docs)
 * to extract structural elements, code blocks, links, and create a documentation AST.
 */

import { BaseLanguageParser } from './BaseLanguageParser.js';
import type { ParseError, ParserOptions } from '../interfaces/ILanguageParser.js';
import { 
  IComponent, 
  IRelationship, 
  ComponentType, 
  RelationshipType 
} from '../types.js';

/**
 * Documentation element types
 */
interface DocElement {
  type: 'heading' | 'paragraph' | 'codeblock' | 'link' | 'image' | 'table' | 
        'list' | 'blockquote' | 'frontmatter' | 'toc' | 'section';
  level?: number; // For headings
  title?: string;
  content: string;
  language?: string; // For code blocks
  url?: string; // For links and images
  alt?: string; // For images
  startLine: number;
  endLine: number;
  id?: string; // Anchor ID
  children?: DocElement[];
  metadata?: Record<string, any>; // For frontmatter
}

/**
 * Table of contents entry
 */
interface TocEntry {
  title: string;
  anchor: string;
  level: number;
  children: TocEntry[];
}

/**
 * Documentation parser for various formats
 */
export class DocumentationParser extends BaseLanguageParser {
  private currentFormat: 'markdown' | 'html' | 'mdx' | 'rst' | 'unknown' = 'unknown';
  
  constructor() {
    super('documentation', ['.md', '.markdown', '.mdx', '.html', '.htm', '.rst', '.txt']);
  }

  /**
   * Detect documentation format
   */
  private detectFormat(content: string, filePath: string): 'markdown' | 'html' | 'mdx' | 'rst' | 'unknown' {
    const ext = filePath.toLowerCase().split('.').pop();
    
    // Check by extension first
    if (ext === 'md' || ext === 'markdown') return 'markdown';
    if (ext === 'mdx') return 'mdx';
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'rst') return 'rst';
    
    // Check by content patterns
    if (content.includes('<!DOCTYPE html>') || content.includes('<html')) return 'html';
    if (content.includes('```') || /^#{1,6}\s/m.test(content)) return 'markdown';
    if (content.includes('.. code-block::') || /^={3,}$/m.test(content)) return 'rst';
    
    return 'unknown';
  }

  /**
   * Validate documentation syntax
   */
  validateSyntax(content: string): ParseError[] {
    const errors: ParseError[] = [];
    const lines = content.split('\n');
    
    // Detect format if not already set
    if (this.currentFormat === 'unknown') {
      this.currentFormat = this.detectFormat(content, 'unknown.md');
    }
    
    try {
      // Format-specific validation
      switch (this.currentFormat) {
        case 'markdown':
          this.validateMarkdownSyntax(content, lines, errors);
          break;
        case 'html':
          this.validateHtmlSyntax(content, lines, errors);
          break;
        case 'mdx':
          this.validateMdxSyntax(content, lines, errors);
          break;
        case 'rst':
          this.validateRstSyntax(content, lines, errors);
          break;
      }
      
      // Common validations
      this.validateLinks(content, lines, errors);
      this.validateCodeBlocks(content, lines, errors);
      
    } catch (error) {
      errors.push(this.createParseError(
        `Documentation parsing failed: ${error}`,
        undefined,
        'PARSE_ERROR',
        'error'
      ));
    }
    
    return errors;
  }

  /**
   * Detect components in documentation
   */
  detectComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    // Detect format
    this.currentFormat = this.detectFormat(content, filePath);
    
    try {
      // Add file component
      const fileComponent = this.createFileComponent(filePath, content);
      fileComponent.metadata.format = this.currentFormat;
      components.push(fileComponent);
      
      // Parse documentation elements
      const elements = this.parseDocumentElements(content);
      
      // Extract frontmatter if present
      const frontmatter = this.extractFrontmatter(content);
      if (frontmatter) {
        fileComponent.metadata.frontmatter = frontmatter.metadata;
      }
      
      // Generate table of contents
      const toc = this.generateTableOfContents(elements);
      if (toc.length > 0) {
        fileComponent.metadata.tableOfContents = toc;
      }
      
      // Convert elements to components
      this.convertElementsToComponents(elements, components, filePath, content);
      
      // Extract search index
      const searchIndex = this.createSearchIndex(elements);
      if (searchIndex.length > 0) {
        fileComponent.metadata.searchIndex = searchIndex;
      }
      
    } catch (error) {
      // If parsing fails, still return file component
      components.push(this.createFileComponent(filePath, content));
    }
    
    return components;
  }

  /**
   * Detect relationships between components
   */
  detectRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    try {
      // Extract containment relationships
      const containmentRelationships = this.extractContainmentRelationships(components);
      relationships.push(...containmentRelationships);
      
      // Extract link relationships
      this.extractLinkRelationships(components, content, relationships);
      
      // Extract code reference relationships
      this.extractCodeReferenceRelationships(components, content, relationships);
      
      // Extract section hierarchy
      this.extractSectionHierarchy(components, relationships);
      
    } catch (error) {
      console.warn(`Failed to extract documentation relationships: ${error}`);
    }
    
    return relationships;
  }

  /**
   * Parse documentation elements based on format
   */
  private parseDocumentElements(content: string): DocElement[] {
    switch (this.currentFormat) {
      case 'markdown':
      case 'mdx':
        return this.parseMarkdownElements(content);
      case 'html':
        return this.parseHtmlElements(content);
      case 'rst':
        return this.parseRstElements(content);
      default:
        return this.parseGenericElements(content);
    }
  }

  /**
   * Parse Markdown elements
   */
  private parseMarkdownElements(content: string): DocElement[] {
    const elements: DocElement[] = [];
    const lines = content.split('\n');
    let currentElement: DocElement | null = null;
    let inCodeBlock = false;
    let codeBlockStart = 0;
    let codeBlockLang = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // Code blocks
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = i;
          codeBlockLang = line.slice(3).trim();
        } else {
          inCodeBlock = false;
          elements.push({
            type: 'codeblock',
            content: lines.slice(codeBlockStart + 1, i).join('\n'),
            language: codeBlockLang,
            startLine: codeBlockStart + 1,
            endLine: i + 1
          });
        }
        continue;
      }
      
      if (inCodeBlock) continue;
      
      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = headingMatch[1].length;
        const title = headingMatch[2];
        const anchor = this.generateAnchor(title);
        
        elements.push({
          type: 'heading',
          level,
          title,
          content: line,
          id: anchor,
          startLine: i + 1,
          endLine: i + 1
        });
        continue;
      }
      
      // Links
      const linkMatches = line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of linkMatches) {
        if (match[1] && match[2] && match[0]) {
          elements.push({
            type: 'link',
            title: match[1],
            url: match[2],
            content: match[0],
            startLine: i + 1,
            endLine: i + 1
          });
        }
      }
      
      // Images
      const imageMatches = line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
      for (const match of imageMatches) {
        if (match[1] !== undefined && match[2] && match[0]) {
          elements.push({
            type: 'image',
            alt: match[1],
            url: match[2],
            content: match[0],
            startLine: i + 1,
            endLine: i + 1
          });
        }
      }
      
      // Tables (simple detection)
      const nextLineForTable = lines[i + 1];
      if (line.includes('|') && i + 1 < lines.length && nextLineForTable && nextLineForTable.match(/^\|?[\s-:|]+\|$/)) {
        const tableStart = i;
        let tableEnd = i + 1;
        
        // Find table end
        while (tableEnd < lines.length) {
          const tableLine = lines[tableEnd];
          if (tableLine && tableLine.includes('|')) {
            tableEnd++;
          } else {
            break;
          }
        }
        
        elements.push({
          type: 'table',
          content: lines.slice(tableStart, tableEnd).join('\n'),
          startLine: tableStart + 1,
          endLine: tableEnd
        });
        
        i = tableEnd - 1; // Skip processed lines
        continue;
      }
      
      // Lists
      if (line.match(/^[\s]*[-*+]\s+/) || line.match(/^[\s]*\d+\.\s+/)) {
        const listStart = i;
        let listEnd = i + 1;
        
        // Find list end
        while (listEnd < lines.length) {
          const listLine = lines[listEnd];
          if (listLine &&
              (listLine.match(/^[\s]*[-*+]\s+/) || 
               listLine.match(/^[\s]*\d+\.\s+/) ||
               listLine.match(/^[\s]+/))) {
            listEnd++;
          } else {
            break;
          }
        }
        
        elements.push({
          type: 'list',
          content: lines.slice(listStart, listEnd).join('\n'),
          startLine: listStart + 1,
          endLine: listEnd
        });
        
        i = listEnd - 1;
        continue;
      }
      
      // Blockquotes
      if (line.startsWith('>')) {
        const quoteStart = i;
        let quoteEnd = i + 1;
        
        while (quoteEnd < lines.length) {
          const quoteLine = lines[quoteEnd];
          if (quoteLine && quoteLine.startsWith('>')) {
            quoteEnd++;
          } else {
            break;
          }
        }
        
        elements.push({
          type: 'blockquote',
          content: lines.slice(quoteStart, quoteEnd)
            .map(l => l.replace(/^>\s?/, '')).join('\n'),
          startLine: quoteStart + 1,
          endLine: quoteEnd
        });
        
        i = quoteEnd - 1;
        continue;
      }
      
      // Paragraphs
      if (line.trim() && !line.match(/^[-=]+$/)) {
        const paraStart = i;
        let paraEnd = i + 1;
        
        while (paraEnd < lines.length) {
          const paraLine = lines[paraEnd];
          if (paraLine &&
              paraLine.trim() && 
              !paraLine.match(/^#{1,6}\s/) &&
              !paraLine.startsWith('```') &&
              !paraLine.match(/^[-*+]\s+/) &&
              !paraLine.startsWith('>')) {
            paraEnd++;
          } else {
            break;
          }
        }
        
        if (paraEnd > paraStart + 1 || line.length > 20) {
          elements.push({
            type: 'paragraph',
            content: lines.slice(paraStart, paraEnd).join(' '),
            startLine: paraStart + 1,
            endLine: paraEnd
          });
          
          i = paraEnd - 1;
        }
      }
    }
    
    return elements;
  }

  /**
   * Parse HTML elements
   */
  private parseHtmlElements(content: string): DocElement[] {
    const elements: DocElement[] = [];
    // Simplified HTML parsing - in production, use a proper HTML parser
    
    // Extract headings
    const headingMatches = content.matchAll(/<h([1-6])(?:\s+id="([^"]*)")?[^>]*>([^<]+)<\/h\1>/gi);
    for (const match of headingMatches) {
      if (match[1] && match[3] && match[0] && match.index !== undefined) {
        const level = parseInt(match[1]);
        const id = match[2] || this.generateAnchor(match[3]);
        elements.push({
          type: 'heading',
          level,
          title: match[3],
          content: match[0],
          id,
          startLine: this.getLineNumber(content, match.index),
          endLine: this.getLineNumber(content, match.index + match[0].length)
        });
      }
    }
    
    // Extract code blocks
    const codeMatches = content.matchAll(/<pre><code(?:\s+class="language-(\w+)")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi);
    for (const match of codeMatches) {
      if (match[2] && match[0] && match.index !== undefined) {
        elements.push({
          type: 'codeblock',
          language: match[1] || 'text',
          content: this.unescapeHtml(match[2]),
          startLine: this.getLineNumber(content, match.index),
          endLine: this.getLineNumber(content, match.index + match[0].length)
        });
      }
    }
    
    // Extract links
    const linkMatches = content.matchAll(/<a\s+href="([^"]*)"[^>]*>([^<]+)<\/a>/gi);
    for (const match of linkMatches) {
      if (match[1] && match[2] && match[0] && match.index !== undefined) {
        elements.push({
          type: 'link',
          url: match[1],
          title: match[2],
          content: match[0],
          startLine: this.getLineNumber(content, match.index),
          endLine: this.getLineNumber(content, match.index + match[0].length)
        });
      }
    }
    
    return elements;
  }

  /**
   * Parse RST elements
   */
  private parseRstElements(content: string): DocElement[] {
    const elements: DocElement[] = [];
    // Simplified RST parsing
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1] || '';
      
      // RST headings (underlined)
      if (line && nextLine && nextLine.match(/^[=\-~`'"^_*+#]+$/) && nextLine.length >= line.length) {
        const level = this.getRstHeadingLevel(nextLine[0] || '=');
        elements.push({
          type: 'heading',
          level,
          title: line,
          content: line + '\n' + nextLine,
          id: this.generateAnchor(line),
          startLine: i + 1,
          endLine: i + 2
        });
        i++; // Skip underline
        continue;
      }
      
      // RST code blocks
      if (line && line.startsWith('.. code-block::')) {
        const language = line.split('::')[1]?.trim() || 'text';
        const codeStart = i + 2; // Skip directive and blank line
        let codeEnd = codeStart;
        
        // Find end of indented block
        while (codeEnd < lines.length) {
          const codeLine = lines[codeEnd];
          if (codeLine && codeLine.match(/^\s+/)) {
            codeEnd++;
          } else {
            break;
          }
        }
        
        elements.push({
          type: 'codeblock',
          language,
          content: lines.slice(codeStart, codeEnd).map(l => l.slice(4)).join('\n'),
          startLine: codeStart + 1,
          endLine: codeEnd
        });
        
        i = codeEnd - 1;
      }
    }
    
    return elements;
  }

  /**
   * Parse generic text elements
   */
  private parseGenericElements(content: string): DocElement[] {
    const elements: DocElement[] = [];
    const lines = content.split('\n');
    
    // Simple paragraph detection
    let paraStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line && line.trim()) {
        if (paraStart === -1) paraStart = i;
      } else if (paraStart !== -1) {
        elements.push({
          type: 'paragraph',
          content: lines.slice(paraStart, i).join(' '),
          startLine: paraStart + 1,
          endLine: i
        });
        paraStart = -1;
      }
    }
    
    // Handle last paragraph
    if (paraStart !== -1) {
      elements.push({
        type: 'paragraph',
        content: lines.slice(paraStart).join(' '),
        startLine: paraStart + 1,
        endLine: lines.length
      });
    }
    
    return elements;
  }

  /**
   * Extract frontmatter from content
   */
  private extractFrontmatter(content: string): DocElement | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match || !match[1]) return null;
    
    try {
      // Parse YAML frontmatter (simplified)
      const frontmatterContent = match[1];
      const metadata: Record<string, any> = {};
      
      const lines = frontmatterContent.split('\n');
      for (const line of lines) {
        const kvMatch = line.match(/^(\w+):\s*(.+)$/);
        if (kvMatch && kvMatch[1] && kvMatch[2]) {
          metadata[kvMatch[1]] = kvMatch[2].trim();
        }
      }
      
      return {
        type: 'frontmatter',
        content: frontmatterContent,
        metadata,
        startLine: 1,
        endLine: match[0].split('\n').length
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate table of contents from elements
   */
  private generateTableOfContents(elements: DocElement[]): TocEntry[] {
    const toc: TocEntry[] = [];
    const stack: { entry: TocEntry; level: number }[] = [];
    
    for (const element of elements) {
      if (element.type === 'heading' && element.level && element.title) {
        const entry: TocEntry = {
          title: element.title,
          anchor: element.id || this.generateAnchor(element.title),
          level: element.level,
          children: []
        };
        
        // Find parent
        while (stack.length > 0) {
          const last = stack[stack.length - 1];
          if (last && last.level >= element.level) {
            stack.pop();
          } else {
            break;
          }
        }
        
        if (stack.length === 0) {
          toc.push(entry);
        } else {
          const parent = stack[stack.length - 1];
          if (parent) {
            parent.entry.children.push(entry);
          }
        }
        
        stack.push({ entry, level: element.level });
      }
    }
    
    return toc;
  }

  /**
   * Create search index from elements
   */
  private createSearchIndex(elements: DocElement[]): Array<{
    type: string;
    content: string;
    anchor?: string;
    keywords: string[];
  }> {
    const index: Array<{
      type: string;
      content: string;
      anchor?: string;
      keywords: string[];
    }> = [];
    
    for (const element of elements) {
      if (element.type === 'heading' || element.type === 'paragraph') {
        const keywords = this.extractKeywords(element.content);
        if (keywords.length > 0) {
          index.push({
            type: element.type,
            content: element.content.substring(0, 200),
            anchor: element.id,
            keywords
          });
        }
      }
    }
    
    return index;
  }

  /**
   * Convert documentation elements to components
   */
  private convertElementsToComponents(
    elements: DocElement[],
    components: IComponent[],
    filePath: string,
    content: string
  ): void {
    // Group elements into sections
    const sections = this.groupIntoSections(elements);
    
    for (const section of sections) {
      const sectionComponent: IComponent = {
        id: this.generateComponentId(filePath, section.title || 'section', ComponentType.DOC_SECTION),
        name: section.title || `Section at line ${section.startLine}`,
        type: ComponentType.DOC_SECTION,
        language: this.language,
        filePath,
        location: this.createLocation(section.startLine, section.endLine),
        metadata: {
          level: section.level,
          anchor: section.anchor,
          hasCodeExamples: section.elements.some(e => e.type === 'codeblock'),
          elementCount: section.elements.length,
          format: this.currentFormat
        },
        code: this.extractSourceCodeByRange(content, section.startLine, section.endLine)
      };
      
      components.push(sectionComponent);
      
      // Add code blocks as separate components
      for (const element of section.elements) {
        if (element.type === 'codeblock' && element.language) {
          const codeComponent: IComponent = {
            id: this.generateComponentId(filePath, `code-${element.language}-${element.startLine}`, ComponentType.FUNCTION),
            name: `${element.language} example at line ${element.startLine}`,
            type: ComponentType.FUNCTION,
            language: element.language,
            filePath,
            location: this.createLocation(element.startLine, element.endLine),
            metadata: {
              isExample: true,
              parentSection: sectionComponent.id,
              codeLanguage: element.language,
              codeContent: element.content
            },
            code: element.content
          };
          
          components.push(codeComponent);
        }
      }
    }
  }

  /**
   * Group elements into logical sections
   */
  private groupIntoSections(elements: DocElement[]): Array<{
    title?: string;
    level?: number;
    anchor?: string;
    startLine: number;
    endLine: number;
    elements: DocElement[];
  }> {
    const sections: Array<{
      title?: string;
      level?: number;
      anchor?: string;
      startLine: number;
      endLine: number;
      elements: DocElement[];
    }> = [];
    
    let currentSection: typeof sections[0] | null = null;
    
    for (const element of elements) {
      if (element.type === 'heading') {
        // Start new section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          title: element.title,
          level: element.level,
          anchor: element.id,
          startLine: element.startLine,
          endLine: element.endLine,
          elements: [element]
        };
      } else if (currentSection) {
        // Add to current section
        currentSection.elements.push(element);
        currentSection.endLine = element.endLine;
      } else {
        // Create anonymous section
        currentSection = {
          startLine: element.startLine,
          endLine: element.endLine,
          elements: [element]
        };
      }
    }
    
    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Extract link relationships
   */
  private extractLinkRelationships(
    components: IComponent[],
    content: string,
    relationships: IRelationship[]
  ): void {
    const linkElements = this.parseDocumentElements(content)
      .filter(e => e.type === 'link' && e.url);
    
    for (const link of linkElements) {
      // Find containing section
      const section = components.find(c => 
        c.type === ComponentType.DOC_SECTION &&
        c.location.startLine <= link.startLine &&
        c.location.endLine >= link.endLine
      );
      
      if (section) {
        // Internal link
        if (link.url && link.url.startsWith('#')) {
          const targetSection = components.find(c =>
            c.type === ComponentType.DOC_SECTION &&
            c.metadata.anchor === link.url!.slice(1)
          );
          
          if (targetSection) {
            relationships.push({
              id: `${section.id}-references-${targetSection.id}`,
              sourceId: section.id,
              targetId: targetSection.id,
              type: RelationshipType.REFERENCES,
              metadata: {
                linkText: link.title,
                linkType: 'internal'
              }
            });
          }
        }
        // External link
        else if (link.url) {
          relationships.push({
            id: `${section.id}-references-external-${link.url}`,
            sourceId: section.id,
            targetId: `external:${link.url}`,
            type: RelationshipType.REFERENCES,
            metadata: {
              linkText: link.title,
              linkType: 'external',
              url: link.url
            }
          });
        }
      }
    }
  }

  /**
   * Extract code reference relationships
   */
  private extractCodeReferenceRelationships(
    components: IComponent[],
    content: string,
    relationships: IRelationship[]
  ): void {
    // Find code blocks that reference functions/classes
    const codeComponents = components.filter(c => 
      c.type === ComponentType.FUNCTION && c.metadata.isExample
    );
    
    for (const codeComp of codeComponents) {
      const parentSection = components.find(c => 
        c.id === codeComp.metadata.parentSection
      );
      
      if (parentSection) {
        relationships.push({
          id: `${parentSection.id}-contains-${codeComp.id}`,
          sourceId: parentSection.id,
          targetId: codeComp.id,
          type: RelationshipType.CONTAINS,
          metadata: {
            containmentType: 'code_example',
            language: codeComp.metadata.codeLanguage
          }
        });
      }
    }
  }

  /**
   * Extract section hierarchy relationships
   */
  private extractSectionHierarchy(
    components: IComponent[],
    relationships: IRelationship[]
  ): void {
    const sections = components.filter(c => c.type === ComponentType.DOC_SECTION);
    
    // Sort by location
    sections.sort((a, b) => a.location.startLine - b.location.startLine);
    
    // Build hierarchy based on heading levels
    const stack: IComponent[] = [];
    
    for (const section of sections) {
      const level = section.metadata.level || 0;
      
      // Find parent section
      while (stack.length > 0) {
        const lastSection = stack[stack.length - 1];
        if (lastSection && lastSection.metadata.level >= level) {
          stack.pop();
        } else {
          break;
        }
      }
      
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (parent) {
          relationships.push({
            id: `${parent.id}-contains-${section.id}`,
            sourceId: parent.id,
            targetId: section.id,
            type: RelationshipType.CONTAINS,
            metadata: {
              containmentType: 'subsection',
              parentLevel: parent.metadata.level,
              childLevel: level
            }
          });
        }
      }
      
      stack.push(section);
    }
  }

  // Validation helper methods
  private validateMarkdownSyntax(content: string, lines: string[], errors: ParseError[]): void {
    // Check for unclosed code blocks
    let inCodeBlock = false;
    let codeBlockLine = 0;
    
    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLine = index + 1;
        } else {
          inCodeBlock = false;
        }
      }
    });
    
    if (inCodeBlock) {
      errors.push(this.createParseError(
        'Unclosed code block',
        this.createLocation(codeBlockLine, codeBlockLine),
        'MD_UNCLOSED_CODE_BLOCK',
        'error'
      ));
    }
  }

  private validateHtmlSyntax(content: string, lines: string[], errors: ParseError[]): void {
    // Basic HTML tag matching
    const openTags: Array<{ tag: string; line: number }> = [];
    
    lines.forEach((line, index) => {
      const openMatches = line.matchAll(/<([a-zA-Z]+)(?:\s[^>]*)?\s*>/g);
      for (const match of openMatches) {
        if (match[1]) {
          openTags.push({ tag: match[1].toLowerCase(), line: index + 1 });
        }
      }
      
      const closeMatches = line.matchAll(/<\/([a-zA-Z]+)>/g);
      for (const match of closeMatches) {
        if (!match[1]) continue;
        const tag = match[1].toLowerCase();
        const lastOpen = openTags.findIndex(t => t.tag === tag);
        
        if (lastOpen === -1) {
          errors.push(this.createParseError(
            `Closing tag </${tag}> has no matching opening tag`,
            this.createLocation(index + 1, index + 1),
            'HTML_UNMATCHED_CLOSING_TAG',
            'warning'
          ));
        } else {
          openTags.splice(lastOpen, 1);
        }
      }
    });
  }

  private validateMdxSyntax(content: string, lines: string[], errors: ParseError[]): void {
    // Validate JSX components
    this.validateMarkdownSyntax(content, lines, errors);
    
    // Check for JSX syntax
    lines.forEach((line, index) => {
      if (line.includes('<') && line.includes('>') && !line.includes('```')) {
        const jsxMatch = line.match(/<([A-Z]\w+)/);
        if (jsxMatch) {
          // Basic JSX validation
          const componentName = jsxMatch[1];
          if (!line.includes(`</${componentName}>`) && !line.includes('/>')) {
            errors.push(this.createParseError(
              `Unclosed JSX component <${componentName}>`,
              this.createLocation(index + 1, index + 1),
              'MDX_UNCLOSED_COMPONENT',
              'warning'
            ));
          }
        }
      }
    });
  }

  private validateRstSyntax(content: string, lines: string[], errors: ParseError[]): void {
    // Check for proper heading underlines
    lines.forEach((line, index) => {
      const nextLine = lines[index + 1] || '';
      
      if (line.trim() && nextLine.match(/^[=\-~`'"^_*+#]+$/)) {
        if (nextLine.length < line.length) {
          errors.push(this.createParseError(
            'RST heading underline too short',
            this.createLocation(index + 2, index + 2),
            'RST_HEADING_UNDERLINE',
            'warning'
          ));
        }
      }
    });
  }

  private validateLinks(content: string, lines: string[], errors: ParseError[]): void {
    // Check for broken link syntax
    lines.forEach((line, index) => {
      // Markdown links
      if (line.includes('[') && !line.includes('](')) {
        const match = line.match(/\[[^\]]+\]/);
        if (match && !line.includes(`${match[0]}(`)) {
          errors.push(this.createParseError(
            'Malformed link syntax',
            this.createLocation(index + 1, index + 1),
            'BROKEN_LINK_SYNTAX',
            'warning'
          ));
        }
      }
    });
  }

  private validateCodeBlocks(content: string, lines: string[], errors: ParseError[]): void {
    // Validate code block languages
    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        const lang = line.slice(3).trim();
        if (lang && !this.isKnownLanguage(lang)) {
          errors.push(this.createParseError(
            `Unknown code block language: ${lang}`,
            this.createLocation(index + 1, index + 1),
            'UNKNOWN_CODE_LANGUAGE',
            'warning'
          ));
        }
      }
    });
  }

  // Helper methods
  private generateAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  private getRstHeadingLevel(char: string): number {
    const levels: Record<string, number> = {
      '=': 1, '-': 2, '~': 3, '`': 4, "'": 5, '"': 6,
      '^': 7, '_': 8, '*': 9, '+': 10, '#': 11
    };
    return levels[char] || 12;
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length;
  }

  private unescapeHtml(html: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };
    
    return html.replace(/&[a-z]+;/g, match => entities[match] || match);
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'it', 'from', 'be', 'are', 'was', 'were', 'been'
    ]);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit keywords
  }

  private isKnownLanguage(lang: string): boolean {
    const knownLanguages = new Set([
      'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'java',
      'c', 'cpp', 'c++', 'csharp', 'cs', 'php', 'ruby', 'rb', 'go',
      'rust', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl',
      'bash', 'sh', 'shell', 'powershell', 'sql', 'html', 'css',
      'scss', 'sass', 'less', 'xml', 'json', 'yaml', 'yml', 'toml',
      'ini', 'dockerfile', 'makefile', 'markdown', 'md', 'text', 'txt'
    ]);
    
    return knownLanguages.has(lang.toLowerCase());
  }
}