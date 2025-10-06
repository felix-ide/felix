/**
 * Markdown Parser - Comprehensive documentation and content analysis
 * 
 * This parser analyzes Markdown documents to extract structural elements,
 * code blocks, links, and other documentation components for indexing.
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
 * Markdown structural elements
 */
interface MarkdownElement {
  type: 'heading' | 'codeblock' | 'link' | 'image' | 'table' | 'list' | 'blockquote' | 'paragraph' | 'index';
  level?: number; // For headings
  title?: string;
  content: string;
  language?: string; // For code blocks
  url?: string; // For links and images
  alt?: string; // For images
  startLine: number;
  endLine: number;
  id?: string;
  children?: MarkdownElement[];
  // Special index block properties
  indexSections?: IndexSection[];
}

/**
 * Special Felix index section
 */
interface IndexSection {
  name: string;
  entries: IndexEntry[];
  startLine: number;
  endLine: number;
}

/**
 * Individual index entry within a section
 */
interface IndexEntry {
  id: string;
  name: string;
  description?: string;
  references: IndexReference[];
  type: 'file_path' | 'system' | 'electron_api' | 'critical_interface' | 'problem_area' | 'pipeline_flow' | 'code_snippet' | 'docs_section' | 'context_link';
  lineNumber: number;
}

/**
 * File/line reference within an index entry
 */
interface IndexReference {
  fileId: string;
  lineRange?: string; // e.g., "42-50" or "42"
  description?: string;
  isExpandable?: boolean; // @CODE@ or @MARKDOWN@
  expandType?: 'code' | 'markdown';
}

/**
 * Code block with language information
 */
interface CodeBlock {
  language: string;
  content: string;
  startLine: number;
  endLine: number;
  title?: string;
}

/**
 * Link or reference in markdown
 */
interface MarkdownLink {
  text: string;
  url: string;
  title?: string;
  startLine: number;
  type: 'inline' | 'reference' | 'image';
}

/**
 * Markdown parser for documentation analysis
 */
export class MarkdownParser extends BaseLanguageParser {
  constructor() {
    super('markdown', ['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.mdx']);
  }

  /**
   * Get Markdown specific ignore patterns
   */
  getIgnorePatterns(): string[] {
    return [
      ...this.getBaseIgnorePatterns()
    ];
  }

  /**
   * Validate Markdown syntax (basic checks)
   */
  validateSyntax(content: string): ParseError[] {
    const errors: ParseError[] = [];
    const lines = content.split('\n');
    
    try {
      // Check for common Markdown issues
      this.checkLinkSyntax(content, lines, errors);
      this.checkCodeBlockSyntax(content, lines, errors);
      this.checkImageSyntax(content, lines, errors);
      this.checkTableSyntax(content, lines, errors);
    } catch (error) {
      errors.push(this.createParseError(
        `Markdown parsing failed: ${error}`,
        undefined,
        'PARSE_ERROR',
        'error'
      ));
    }
    
    return errors;
  }

  /**
   * Detect components in Markdown content
   */
  detectComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      // Add file component
      components.push(this.createFileComponent(filePath, content));
      
      // Parse Markdown elements
      const elements = this.parseMarkdownElements(content);
      
      // Convert elements to components
      this.convertElementsToComponents(elements, components, filePath, content);

      // Ensure components form a tree so containment relationships stay bounded
      this.assignComponentHierarchy(components);
      
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
      // === COMPOSE BASE PARSER RELATIONSHIP EXTRACTION METHODS ===
      
      // 1. Base parser's usage relationships (function calls, property access, variable references)
      const usageRelationships = this.extractUsageRelationships(components, content);
      relationships.push(...usageRelationships);
      
      // 2. Base parser's inheritance relationships (might catch some patterns)
      const inheritanceRelationships = this.extractInheritanceRelationships(components, content);
      relationships.push(...inheritanceRelationships);
      
      // 3. Base parser's import/export relationships
      const importExportRelationships = this.extractImportExportRelationships(components, content);
      relationships.push(...importExportRelationships);
      
      // 4. Base parser's smart containment detection (file->component, section->subsection)
      const containmentRelationships = this.extractContainmentRelationships(components);
      relationships.push(...containmentRelationships);
      
      // === ADD MARKDOWN-SPECIFIC ENHANCEMENTS ===
      
      // 5. Markdown-specific link relationships
      this.extractLinkRelationships(components, content, relationships);
      
      // 6. Markdown-specific reference relationships
      this.extractReferenceRelationships(components, content, relationships);
      
      // 7. Index block relationships (if using special markdown syntax)
      this.extractIndexBlockRelationships(components, relationships);
      
    } catch (error) {
      console.warn(`Failed to extract Markdown relationships: ${error}`);
    }
    
    return relationships;
  }

  /**
   * Ensure every markdown component has a parent so we can form a proper tree.
   */
  private assignComponentHierarchy(components: IComponent[]): void {
    if (components.length === 0) return;

    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) {
      return;
    }

    const componentById = new Map<string, IComponent>();
    components.forEach(component => componentById.set(component.id, component));

    // First, honour explicit parent pointers emitted by specialized blocks (index sections/entries).
    for (const component of components) {
      if (component.parentId) continue;
      const metadata = component.metadata || {};

      const explicitParentId = typeof metadata.parentIndexId === 'string'
        ? metadata.parentIndexId
        : typeof metadata.parentSectionId === 'string'
          ? metadata.parentSectionId
          : undefined;

      if (explicitParentId && componentById.has(explicitParentId)) {
        component.parentId = explicitParentId;
      }
    }

    // Walk components in source order, maintaining the heading stack to determine structure.
    const headingStack: Array<{ component: IComponent; level: number }> = [];
    const orderedComponents = components
      .filter(component => component.id !== fileComponent.id)
      .sort((a, b) => {
        const lineDelta = this.getComponentStartLine(a) - this.getComponentStartLine(b);
        if (lineDelta !== 0) return lineDelta;
        if (a.type === ComponentType.SECTION && b.type !== ComponentType.SECTION) return -1;
        if (b.type === ComponentType.SECTION && a.type !== ComponentType.SECTION) return 1;
        return a.id.localeCompare(b.id);
      });

    for (const component of orderedComponents) {
      if (component.type === ComponentType.SECTION) {
        const level = this.getHeadingLevel(component);

        while (headingStack.length > 0 && headingStack[headingStack.length - 1]!.level >= level) {
          headingStack.pop();
        }

        if (!component.parentId) {
          const parent = headingStack.length > 0 ? headingStack[headingStack.length - 1]!.component : fileComponent;
          component.parentId = parent.id;
        }

        headingStack.push({ component, level });
        continue;
      }

      if (component.parentId) {
        // Respect explicit parent assignments.
        continue;
      }

      const parent = headingStack.length > 0 ? headingStack[headingStack.length - 1]!.component : fileComponent;
      component.parentId = parent.id;
    }

    // Fallback: anything still without a parent becomes a direct child of the file component.
    for (const component of components) {
      if (component.type === ComponentType.FILE) continue;
      if (!component.parentId) {
        component.parentId = fileComponent.id;
      }
    }
  }

  private getComponentStartLine(component: IComponent): number {
    const location = component.location;
    return location?.startLine ?? Number.MAX_SAFE_INTEGER;
  }

  private getHeadingLevel(component: IComponent): number {
    const level = component.metadata?.level;
    if (typeof level === 'number' && Number.isFinite(level)) {
      return level;
    }
    return 1;
  }

  /**
   * Parse Markdown elements from content
   */
  private parseMarkdownElements(content: string): MarkdownElement[] {
    const elements: MarkdownElement[] = [];
    const lines = content.split('\n');

    let currentElement: MarkdownElement | null = null;
    let lineIndex = 0;
    
    while (lineIndex < lines.length) {
      const line = lines[lineIndex]!;
      const trimmed = line?.trim() || '';
      
      // Parse headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        if (currentElement && currentElement.type === 'paragraph') {
          currentElement.endLine = lineIndex;
          elements.push(currentElement);
        }
        
        currentElement = {
          type: 'heading',
          level: headingMatch[1]!.length,
          title: headingMatch[2]!.trim(),
          content: headingMatch[2]!.trim(),
          startLine: lineIndex + 1,
          endLine: lineIndex + 1,
          id: this.generateHeadingId(headingMatch[2]!.trim()),
          children: []
        };
        elements.push(currentElement);
        currentElement = null;
        lineIndex++;
        continue;
      }

      // Parse explicit component id references: [[id:...]] or @component(id="...")
      const idRefMatch = line.match(/\[\[id:([^\]]+)\]\]/i) || line.match(/@component\(\s*id\s*=\s*"([^"]+)"\s*\)/i);
      if (idRefMatch) {
        const startLine = lineIndex + 1;
        elements.push({
          type: 'paragraph',
          content: `[[id:${idRefMatch[1]!.trim()}]]`,
          startLine,
          endLine: startLine,
          id: `ref-${startLine}`
        });
        lineIndex++;
        continue;
      }

      // Parse code blocks
      const codeBlockMatch = line.match(/^```(\w+)?(.*)$/);
      if (codeBlockMatch) {
        if (currentElement && currentElement.type === 'paragraph') {
          currentElement.endLine = lineIndex;
          elements.push(currentElement);
          currentElement = null;
        }
        
        const language = codeBlockMatch[1] || 'text';
        const title = codeBlockMatch[2]?.trim() || '';
        let codeContent = '';
        lineIndex++;
        const codeStartLine = lineIndex + 1;
        
        // Find end of code block
        while (lineIndex < lines.length && !lines[lineIndex]!.startsWith('```')) {
          codeContent += lines[lineIndex]! + '\n';
          lineIndex++;
        }
        
        // Check if this is a special index block
        if (language === 'index') {
          const indexSections = this.parseIndexSections(codeContent, codeStartLine - 1);
          elements.push({
            type: 'index',
            content: codeContent.trim(),
            language: 'index',
            ...(title && { title }),
            startLine: codeStartLine - 1,
            endLine: lineIndex + 1,
            indexSections: indexSections
          });
        } else {
          elements.push({
            type: 'codeblock',
            content: codeContent.trim(),
            language: language,
            ...(title && { title }),
            startLine: codeStartLine - 1,
            endLine: lineIndex + 1
          });
        }
        
        lineIndex++; // Skip closing ```
        continue;
      }
      
      // Parse blockquotes
      if (line.startsWith('>')) {
        if (currentElement && currentElement.type === 'paragraph') {
          currentElement.endLine = lineIndex;
          elements.push(currentElement);
          currentElement = null;
        }
        
        let blockquoteContent = line.substring(1).trim();
        const startLine = lineIndex + 1;
        lineIndex++;
        
        // Continue reading blockquote
        while (lineIndex < lines.length && lines[lineIndex]!.startsWith('>')) {
          blockquoteContent += '\n' + lines[lineIndex]!.substring(1).trim();
          lineIndex++;
        }
        
        elements.push({
          type: 'blockquote',
          content: blockquoteContent,
          startLine: startLine,
          endLine: lineIndex
        });
        continue;
      }
      
      // Parse lists
      const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        if (currentElement && currentElement.type === 'paragraph') {
          currentElement.endLine = lineIndex;
          elements.push(currentElement);
          currentElement = null;
        }
        
        let listContent = listMatch[3] || '';
        const startLine = lineIndex + 1;
        lineIndex++;
        
        // Continue reading list items
        while (lineIndex < lines.length) {
          const nextLine = lines[lineIndex]!;
          const nextListMatch = nextLine.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
          if (nextListMatch || nextLine.trim() === '') {
            if (nextListMatch) {
              listContent += '\n' + (nextListMatch[3] || '');
            }
            lineIndex++;
          } else {
            break;
          }
        }
        
        elements.push({
          type: 'list',
          content: listContent,
          startLine: startLine,
          endLine: lineIndex
        });
        continue;
      }
      
      // Parse tables
      if (line.includes('|') && lines[lineIndex + 1]?.includes('|') && lines[lineIndex + 1]!.includes('-')) {
        if (currentElement && currentElement.type === 'paragraph') {
          currentElement.endLine = lineIndex;
          elements.push(currentElement);
          currentElement = null;
        }
        
        let tableContent = line;
        const startLine = lineIndex + 1;
        lineIndex++;
        
        // Continue reading table
        while (lineIndex < lines.length && lines[lineIndex]!.includes('|')) {
          tableContent += '\n' + lines[lineIndex]!;
          lineIndex++;
        }
        
        elements.push({
          type: 'table',
          content: tableContent,
          startLine: startLine,
          endLine: lineIndex
        });
        continue;
      }
      
      // Parse regular paragraphs
      if (trimmed.length > 0 && !currentElement) {
        currentElement = {
          type: 'paragraph',
          content: line,
          startLine: lineIndex + 1,
          endLine: lineIndex + 1
        };
      } else if (trimmed.length > 0 && currentElement && currentElement.type === 'paragraph') {
        currentElement.content += '\n' + line;
        currentElement.endLine = lineIndex + 1;
      } else if (trimmed.length === 0 && currentElement && currentElement.type === 'paragraph') {
        elements.push(currentElement);
        currentElement = null;
      }
      
      lineIndex++;
    }
    
    // Add final element if exists
    if (currentElement) {
      elements.push(currentElement);
    }
    
    return elements;
  }

  /**
   * Convert Markdown elements to components
   */
  private convertElementsToComponents(elements: MarkdownElement[], components: IComponent[], filePath: string, content: string): void {
    for (const element of elements) {
      switch (element.type) {
        case 'heading':
          this.addHeadingComponent(element, components, filePath, content);
          break;
        case 'codeblock':
          this.addCodeBlockComponent(element, components, filePath, content);
          break;
        case 'table':
          this.addTableComponent(element, components, filePath, content);
          break;
        case 'list':
          this.addListComponent(element, components, filePath, content);
          break;
        case 'blockquote':
          this.addBlockquoteComponent(element, components, filePath);
          break;
        case 'paragraph':
          this.addParagraphComponent(element, components, filePath);
          break;
        case 'index':
          this.addIndexBlockComponent(element, components, filePath);
          break;
      }
    }
    
    // Extract links and images separately
    this.extractLinksAndImages(content, components, filePath);
  }

  /**
   * Add heading component
   */
  private addHeadingComponent(element: MarkdownElement, components: IComponent[], filePath: string, content: string): void {
    const component: IComponent = {
      id: this.generateComponentId(filePath, element.id || element.title || '', ComponentType.SECTION),
      name: element.title || element.content,
      type: ComponentType.SECTION,
      language: this.language,
      filePath,
      location: this.createLocation(element.startLine, element.endLine),
      metadata: {
        level: element.level,
        headingId: element.id,
        headingText: element.title || element.content,
        isHeading: true,
        isExported: true
      },
      code: this.extractSourceCodeByRange(content, element.startLine, element.endLine)
    };
    
    components.push(component);
  }

  /**
   * Add code block component
   */
  private addCodeBlockComponent(element: MarkdownElement, components: IComponent[], filePath: string, content: string): void {
    const componentName = element.title || `code-block-${element.language}-${element.startLine}`;
    
    const component: IComponent = {
      id: this.generateComponentId(filePath, componentName, ComponentType.FUNCTION),
      name: componentName,
      type: ComponentType.FUNCTION,
      language: element.language || 'text',
      filePath,
      location: this.createLocation(element.startLine, element.endLine),
      metadata: {
        isCodeBlock: true,
        codeLanguage: element.language,
        codeContent: element.content,
        ...(element.title && { title: element.title }),
        isExample: true,
        isExported: true
      },
      code: this.extractSourceCodeByRange(content, element.startLine, element.endLine)
    };
    
    components.push(component);
  }

  /**
   * Add table component
   */
  private addTableComponent(element: MarkdownElement, components: IComponent[], filePath: string, content: string): void {
    const componentName = `table-${element.startLine}`;
    
    const component: IComponent = {
      id: this.generateComponentId(filePath, componentName, ComponentType.INTERFACE),
      name: componentName,
      type: ComponentType.INTERFACE,
      language: this.language,
      filePath,
      location: this.createLocation(element.startLine, element.endLine),
      metadata: {
        isTable: true,
        tableContent: element.content,
        rowCount: element.content.split('\n').length,
        isStructuredData: true,
        isExported: true
      },
      code: this.extractSourceCodeByRange(content, element.startLine, element.endLine)
    };
    
    components.push(component);
  }

  /**
   * Add list component
   */
  private addListComponent(element: MarkdownElement, components: IComponent[], filePath: string, content: string): void {
    if (!this.shouldMaterializeNarrative(element.content)) {
      return;
    }

    const componentName = `list-${element.startLine}`;
    
    const component: IComponent = {
      id: this.generateComponentId(filePath, componentName, ComponentType.VARIABLE),
      name: componentName,
      type: ComponentType.VARIABLE,
      language: this.language,
      filePath,
      location: this.createLocation(element.startLine, element.endLine),
      metadata: {
        isList: true,
        listContent: element.content,
        itemCount: element.content.split('\n').length,
        isExported: true
      },
      code: this.extractSourceCodeByRange(content, element.startLine, element.endLine)
    };
    
    components.push(component);
  }

  /**
   * Add blockquote component
   */
  private addBlockquoteComponent(element: MarkdownElement, components: IComponent[], filePath: string): void {
    if (!this.shouldMaterializeNarrative(element.content)) {
      return;
    }

    const componentName = `quote-${element.startLine}`;
    
    const component: IComponent = {
      id: this.generateComponentId(filePath, componentName, ComponentType.CONSTANT),
      name: componentName,
      type: ComponentType.CONSTANT,
      language: this.language,
      filePath,
      location: this.createLocation(element.startLine, element.endLine),
      metadata: {
        isBlockquote: true,
        quoteContent: element.content,
        isExported: true
      }
    };
    
    components.push(component);
  }

  /**
   * Add paragraph component
   */
  private addParagraphComponent(element: MarkdownElement, components: IComponent[], filePath: string): void {
    if (!this.shouldMaterializeNarrative(element.content)) {
      return;
    }

    const componentName = `paragraph-${element.startLine}`;
    
    const component: IComponent = {
      id: this.generateComponentId(filePath, componentName, ComponentType.COMMENT),
      name: componentName,
      type: ComponentType.COMMENT,
      language: this.language,
      filePath,
      location: this.createLocation(element.startLine, element.endLine),
      metadata: {
        isParagraph: true,
        content: element.content,
        refComponentId: element.content.startsWith('[[id:') ? element.content.replace(/^\[\[id:([^\]]+)\]\].*$/i,'$1') : undefined,
        wordCount: element.content.split(/\s+/).length,
        isExported: true
      }
    };

    components.push(component);
  }

  private shouldMaterializeNarrative(raw: string | undefined): boolean {
    if (!raw) return false;
    const trimmed = raw.trim();
    if (!trimmed) {
      return false;
    }

    if (/\[\[id:[^\]]+\]\]/i.test(trimmed) || /@component\(/i.test(trimmed)) {
      return true;
    }

    if (/\b(Task|Rule|Note):/i.test(trimmed)) {
      return true;
    }

    if (/`[^`]+`/.test(trimmed) || /\[[^\]]+\]\([^)]+\)/.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * Add special index block component
   */
  private addIndexBlockComponent(element: MarkdownElement, components: IComponent[], filePath: string): void {
    const componentName = `index-block-${element.startLine}`;
    
    // Add the main index block component
    const indexComponent: IComponent = {
      id: this.generateComponentId(filePath, componentName, ComponentType.MODULE),
      name: componentName,
      type: ComponentType.MODULE,
      language: 'index',
      filePath,
      location: this.createLocation(element.startLine, element.endLine),
      metadata: {
        isIndexBlock: true,
        indexContent: element.content,
        sectionCount: element.indexSections?.length || 0,
        isSpecialMarkdown: true,
        isExported: true
      }
    };
    
    components.push(indexComponent);
    
    // Add components for each index section
    if (element.indexSections) {
      for (const section of element.indexSections) {
          this.addIndexSectionComponent(section, components, filePath, indexComponent.id);
      }
    }
  }

  /**
   * Add component for an index section
   */
  private addIndexSectionComponent(section: IndexSection, components: IComponent[], filePath: string, parentId: string): void {
    const sectionComponent: IComponent = {
      id: this.generateComponentId(filePath, `index-section-${section.name.toLowerCase()}`, ComponentType.CLASS),
      name: section.name,
      type: ComponentType.CLASS,
      language: 'index',
      filePath,
      location: this.createLocation(section.startLine, section.endLine),
      metadata: {
        isIndexSection: true,
        sectionName: section.name,
        entryCount: section.entries.length,
        parentIndexId: parentId,
        isSpecialMarkdown: true,
        isExported: true
      }
    };
    
    const normalizedEntries = section.entries.map(entry => this.normalizeIndexEntry(entry));
    sectionComponent.metadata = {
      ...sectionComponent.metadata,
      indexEntries: normalizedEntries
    };

    components.push(sectionComponent);
    
    // Add components for each entry in the section
    for (const entry of section.entries) {
      if (!this.shouldDeferIndexEntry(entry)) {
        this.addIndexEntryComponent(entry, components, filePath, sectionComponent.id);
      }
    }
  }

  /**
   * Add component for an index entry
   */
  private addIndexEntryComponent(entry: IndexEntry, components: IComponent[], filePath: string, parentSectionId: string): void {
    const entryType = this.getComponentTypeForIndexEntry(entry.type);
    
    const entryComponent: IComponent = {
      id: this.generateComponentId(filePath, `index-entry-${entry.id}`, entryType),
      name: `${entry.id}:${entry.name}`,
      type: entryType,
      language: 'index',
      filePath,
      location: this.createLocation(entry.lineNumber, entry.lineNumber),
      metadata: {
        isIndexEntry: true,
        entryId: entry.id,
        entryName: entry.name,
        entryType: entry.type,
        entryDescription: entry.description,
        referenceCount: entry.references.length,
        references: entry.references,
        parentSectionId: parentSectionId,
        isSpecialMarkdown: true,
        isExported: true
      }
    };
    
    components.push(entryComponent);
  }

  /**
   * Parse index sections from index block content
   */
  private parseIndexSections(content: string, startLine: number): IndexSection[] {
    const sections: IndexSection[] = [];
    const lines = content.split('\n');
    
    let currentSection: IndexSection | null = null;
    let lineOffset = startLine;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      lineOffset++;
      
      // Check for section header (starts with #)
      const sectionMatch = line.match(/^#\s+([A-Z_]+)$/);
      if (sectionMatch) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.endLine = lineOffset - 1;
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          name: sectionMatch[1]!,
          entries: [],
          startLine: lineOffset,
          endLine: lineOffset
        };
        continue;
      }
      
      // Skip empty lines or lines without current section
      if (!line || !currentSection) {
        continue;
      }
      
      // Parse entry based on section type
      const entry = this.parseIndexEntry(line, lineOffset, currentSection.name);
      if (entry) {
        currentSection.entries.push(entry);
        currentSection.endLine = lineOffset;
      }
    }
    
    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Parse individual index entry
   */
  private parseIndexEntry(line: string, lineNumber: number, sectionName: string): IndexEntry | null {
    const entryType = this.getIndexEntryType(sectionName);
    
    // Handle FILE_PATHS format: F1:/path/to/file.js
    if (sectionName === 'FILE_PATHS') {
      const filePathMatch = line.match(/^([A-Z]+\d+):(.+)$/);
      if (filePathMatch) {
        return {
          id: filePathMatch[1]!,
          name: filePathMatch[2]!,
          description: `File path: ${filePathMatch[2]!}`,
          references: [],
          type: entryType,
          lineNumber
        };
      }
    }
    
    // Handle main entry format: ID:NAME|Description|
    const mainEntryMatch = line.match(/^([A-Z]+\d+):([^|]+)\|([^|]*)\|?$/);
    if (mainEntryMatch) {
      return {
        id: mainEntryMatch[1]!,
        name: mainEntryMatch[2]!,
        ...(mainEntryMatch[3] && { description: mainEntryMatch[3] }),
        references: [],
        type: entryType,
        lineNumber
      };
    }
    
    // Handle reference format: F1>42-50:Description or F1>42-50:@CODE@
    const refMatch = line.match(/^([A-Z]+\d+)>([\d-,]+):(.+)$/);
    if (refMatch) {
      const fileId = refMatch[1]!;
      const lineRange = refMatch[2]!;
      const description = refMatch[3]!;
      
      // Check for expandable content
      const isExpandable = description === '@CODE@' || description === '@MARKDOWN@';
      const expandType = description === '@CODE@' ? 'code' : description === '@MARKDOWN@' ? 'markdown' : undefined;
      
      return {
        id: `${fileId}-${lineRange}`,
        name: `${fileId}>${lineRange}`,
        description: isExpandable ? `Expandable ${expandType} content` : description,
        references: [{
          fileId,
          lineRange,
          ...(isExpandable ? {} : { description }),
          ...(isExpandable && { isExpandable }),
          ...(expandType && { expandType })
        }],
        type: 'file_path', // References are always file-based
        lineNumber
      };
    }
    
    // Handle pipeline flow format: PF1:FLOW_NAME|F1>Component1>F2>Component2>F4>Component3
    if (sectionName === 'PIPELINE_FLOWS') {
      const pipelineMatch = line.match(/^([A-Z]+\d+):([^|]+)\|(.+)$/);
      if (pipelineMatch) {
        return {
          id: pipelineMatch[1]!,
          name: pipelineMatch[2]!,
          description: `Pipeline: ${pipelineMatch[3]!}`,
          references: [],
          type: entryType,
          lineNumber
        };
      }
    }
    
    // Handle context links format: CL1:CONCEPT_NAME|Brief description|
    if (sectionName === 'CONTEXT_LINKS') {
      const contextMatch = line.match(/^([A-Z]+\d+):([^|]+)\|([^|]*)\|?$/);
      if (contextMatch) {
        return {
          id: contextMatch[1]!,
          name: contextMatch[2]!,
          ...(contextMatch[3] && { description: contextMatch[3] }),
          references: [],
          type: entryType,
          lineNumber
        };
      }
      
      // Handle context link references: S2:Related system
      const contextRefMatch = line.match(/^([A-Z]+\d+):(.+)$/);
      if (contextRefMatch) {
        return {
          id: contextRefMatch[1]!,
          name: contextRefMatch[2]!,
          description: `Reference: ${contextRefMatch[2]!}`,
          references: [],
          type: 'context_link',
          lineNumber
        };
      }
    }
    
    return null;
  }

  /**
   * Get index entry type from section name
   */
  private getIndexEntryType(sectionName: string): IndexEntry['type'] {
    const typeMap: Record<string, IndexEntry['type']> = {
      'FILE_PATHS': 'file_path',
      'SYSTEMS': 'system',
      'ELECTRON_APIS': 'electron_api',
      'CRITICAL_INTERFACES': 'critical_interface',
      'PROBLEM_AREAS': 'problem_area',
      'PIPELINE_FLOWS': 'pipeline_flow',
      'CODE_SNIPPETS': 'code_snippet',
      'DOCS_SECTIONS': 'docs_section',
      'CONTEXT_LINKS': 'context_link'
    };
    
    return typeMap[sectionName] || 'file_path';
  }

  /**
   * Get component type for index entry type
   */
  private getComponentTypeForIndexEntry(entryType: IndexEntry['type']): ComponentType {
    const typeMap: Record<IndexEntry['type'], ComponentType> = {
      'file_path': ComponentType.FILE,
      'system': ComponentType.MODULE,
      'electron_api': ComponentType.INTERFACE,
      'critical_interface': ComponentType.INTERFACE,
      'problem_area': ComponentType.COMMENT,
      'pipeline_flow': ComponentType.FUNCTION,
      'code_snippet': ComponentType.FUNCTION,
      'docs_section': ComponentType.COMMENT,
      'context_link': ComponentType.IMPORT
    };
    
    return typeMap[entryType] || ComponentType.VARIABLE;
  }

  /**
   * Extract links and images from content
   */
  private extractLinksAndImages(content: string, components: IComponent[], filePath: string): void {
    const lines = content.split('\n');
    
    // Extract inline links: [text](url)
    const inlineLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = inlineLinkPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const linkText = match[1]!;
      const linkUrl = match[2]!;
      
      const component: IComponent = {
        id: this.generateComponentId(filePath, `link-${linkText}-${lineNumber}`, ComponentType.IMPORT),
        name: linkText,
        type: ComponentType.IMPORT,
        language: this.language,
        filePath,
        location: this.createLocation(lineNumber, lineNumber),
        metadata: {
          isLink: true,
          linkText: linkText,
          linkUrl: linkUrl,
          linkType: 'inline',
          isExternal: this.isExternalUrl(linkUrl),
          isExported: true
        }
      };
      
      components.push(component);
    }
    
    // Extract images: ![alt](url)
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    
    while ((match = imagePattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const altText = match[1] || '';
      const imageUrl = match[2]!;
      
      const component: IComponent = {
        id: this.generateComponentId(filePath, `image-${altText || 'unnamed'}-${lineNumber}`, ComponentType.IMPORT),
        name: altText || `image-${lineNumber}`,
        type: ComponentType.IMPORT,
        language: this.language,
        filePath,
        location: this.createLocation(lineNumber, lineNumber),
        metadata: {
          isImage: true,
          altText: altText,
          imageUrl: imageUrl,
          linkType: 'image',
          isExternal: this.isExternalUrl(imageUrl),
          isExported: true
        }
      };
      
      components.push(component);
    }
    
    // Extract reference links: [text][ref]
    const referenceLinkPattern = /\[([^\]]+)\]\[([^\]]+)\]/g;
    
    while ((match = referenceLinkPattern.exec(content)) !== null) {
      const lineNumber = this.getLineNumber(content, match.index);
      const linkText = match[1]!;
      const linkRef = match[2]!;
      
      const component: IComponent = {
        id: this.generateComponentId(filePath, `ref-link-${linkText}-${lineNumber}`, ComponentType.IMPORT),
        name: linkText,
        type: ComponentType.IMPORT,
        language: this.language,
        filePath,
        location: this.createLocation(lineNumber, lineNumber),
        metadata: {
          isLink: true,
          linkText: linkText,
          linkRef: linkRef,
          linkType: 'reference',
          isExported: true
        }
      };
      
      components.push(component);
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
      extension: '.md'
    };

    // Extract document title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const documentTitle = titleMatch ? titleMatch[1] : this.getFileName(filePath);

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
        encoding: 'utf-8',
        documentTitle: documentTitle,
        wordCount: content.split(/\s+/).length,
        headingCount: (content.match(/^#+\s+/gm) || []).length,
        linkCount: (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
        imageCount: (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length,
        codeBlockCount: (content.match(/^```/gm) || []).length / 2
      },
      code: content // No truncation - store full file content
    };
  }

  // Helper methods
  private generateHeadingId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  private isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url) || /^ftp:\/\//.test(url);
  }

  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length;
  }

  private getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1]!;
  }

  // Syntax validation methods
  private checkLinkSyntax(content: string, lines: string[], errors: ParseError[]): void {
    // Check for malformed links
    const malformedLinkPattern = /\[[^\]]*\]\([^)]*$/;
    
    lines.forEach((line, index) => {
      if (malformedLinkPattern.test(line)) {
        errors.push(this.createParseError(
          'Malformed link - missing closing parenthesis',
          this.createLocation(index + 1, index + 1),
          'SYNTAX_ERROR',
          'warning'
        ));
      }
      
      // Check for links with empty URLs
      const emptyLinkPattern = /\[[^\]]+\]\(\s*\)/;
      if (emptyLinkPattern.test(line)) {
        errors.push(this.createParseError(
          'Link with empty URL',
          this.createLocation(index + 1, index + 1),
          'SYNTAX_ERROR',
          'warning'
        ));
      }
    });
  }

  private checkCodeBlockSyntax(content: string, lines: string[], errors: ParseError[]): void {
    let inCodeBlock = false;
    let codeBlockStartLine = -1;
    
    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStartLine = index + 1;
        } else {
          inCodeBlock = false;
        }
      }
    });
    
    // Check for unclosed code blocks
    if (inCodeBlock) {
      errors.push(this.createParseError(
        'Unclosed code block',
        this.createLocation(codeBlockStartLine, codeBlockStartLine),
        'SYNTAX_ERROR',
        'error'
      ));
    }
  }

  private checkImageSyntax(content: string, lines: string[], errors: ParseError[]): void {
    // Check for malformed images
    const malformedImagePattern = /!\[[^\]]*\]\([^)]*$/;
    
    lines.forEach((line, index) => {
      if (malformedImagePattern.test(line)) {
        errors.push(this.createParseError(
          'Malformed image - missing closing parenthesis',
          this.createLocation(index + 1, index + 1),
          'SYNTAX_ERROR',
          'warning'
        ));
      }
    });
  }

  private checkTableSyntax(content: string, lines: string[], errors: ParseError[]): void {
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]!;

      if (!this.isLikelyTableRow(line)) {
        continue;
      }

      const nextLine = index + 1 < lines.length ? lines[index + 1]! : '';

      // If the next line is a proper divider row, treat this as a valid table and skip additional checks.
      if (nextLine && this.isLikelyTableDivider(nextLine)) {
        // Skip the divider row so subsequent iterations analyse the remaining table rows.
        index++;
        continue;
      }

      // If both lines look like table rows but the divider is missing, surface a warning.
      if (this.isLikelyTableRow(nextLine)) {
        errors.push(this.createParseError(
          'Table missing header separator row',
          this.createLocation(index + 2, index + 2),
          'SYNTAX_ERROR',
          'warning'
        ));
      }
    }
  }

  private isLikelyTableRow(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.includes('|')) {
      return false;
    }

    // Require either a leading pipe or at least one instance of ` | ` to avoid false positives
    if (!(trimmed.startsWith('|') || /\s\|\s/.test(trimmed))) {
      return false;
    }

    const pipeCount = (trimmed.match(/\|/g) || []).length;
    return pipeCount >= 2;
  }

  private isLikelyTableDivider(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) {
      return false;
    }

    const normalised = trimmed.replace(/\s+/g, '');
    return /^\|?:?-{3,}:?(\|:?-{3,}:?)*\|?$/.test(normalised);
  }

  private normalizeIndexEntry(entry: IndexEntry): {
    id: string;
    name: string;
    description?: string;
    type: IndexEntry['type'];
    lineNumber: number;
    references: Array<{
      fileId: string;
      lineRange?: string;
      description?: string;
      isExpandable?: boolean;
      expandType?: IndexReference['expandType'];
    }>;
  } {
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description,
      type: entry.type,
      lineNumber: entry.lineNumber,
      references: entry.references?.map(ref => ({
        fileId: ref.fileId,
        lineRange: ref.lineRange,
        description: ref.description,
        isExpandable: ref.isExpandable,
        expandType: ref.expandType
      })) ?? []
    };
  }

  private shouldDeferIndexEntry(entry: IndexEntry): boolean {
    return entry.type === 'file_path' || entry.type === 'docs_section';
  }

  // Relationship extraction methods
  extractContainmentRelationships(components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];
    const componentById = new Map<string, IComponent>();
    const seenIds = new Set<string>();

    for (const component of components) {
      componentById.set(component.id, component);
    }

    for (const component of components) {
      if (!component.parentId) continue;
      const parent = componentById.get(component.parentId);
      if (!parent) continue;

      const relationshipId = `${parent.id}-contains-${component.id}`;
      if (seenIds.has(relationshipId)) continue;
      seenIds.add(relationshipId);

      relationships.push({
        id: relationshipId,
        type: RelationshipType.CONTAINS,
        sourceId: parent.id,
        targetId: component.id,
        metadata: {
          relationship: 'document-contains-component',
          parentType: parent.type,
          childType: component.type
        }
      });
    }

    return relationships;
  }

  private extractLinkRelationships(components: IComponent[], content: string, relationships: IRelationship[]): void {
    const linkComponents = components.filter(c => c.metadata?.isLink);
    const sectionComponents = components.filter(c => c.type === ComponentType.SECTION);
    
    for (const linkComp of linkComponents) {
      const linkUrl = linkComp.metadata?.linkUrl as string;
      
      // Check for internal links to sections
      if (linkUrl && linkUrl.startsWith('#')) {
        const targetId = linkUrl.substring(1);
        const targetSection = sectionComponents.find(c => c.metadata?.headingId === targetId);
        
        if (targetSection) {
          relationships.push({
            id: `${linkComp.id}-links-to-${targetSection.id}`,
            type: RelationshipType.REFERENCES,
            sourceId: linkComp.id,
            targetId: targetSection.id,
            metadata: {
              relationship: 'link-references-section'
            }
          });
        }
      }
    }
  }

  private extractReferenceRelationships(components: IComponent[], content: string, relationships: IRelationship[]): void {
    // Extract relationships between referenced links and their definitions
    const refLinkComponents = components.filter(c => c.metadata?.linkType === 'reference');
    
    // Look for link definitions: [ref]: url
    const linkDefinitionPattern = /^\s*\[([^\]]+)\]:\s*(.+)$/gm;
    let match;
    
    while ((match = linkDefinitionPattern.exec(content)) !== null) {
      const refName = match[1]!;
      const refUrl = match[2]!;
      
      // Find reference links that use this definition
      const referencingLinks = refLinkComponents.filter(c => c.metadata?.linkRef === refName);
      
      for (const refLink of referencingLinks) {
        // Create a relationship indicating this link uses this definition
        relationships.push({
          id: `${refLink.id}-uses-definition-${refName}`,
          type: RelationshipType.USES,
          sourceId: refLink.id,
          targetId: refLink.id, // Self-reference for simplicity
          metadata: {
            relationship: 'reference-link-uses-definition',
            definitionName: refName,
            definitionUrl: refUrl
          }
        });
      }
    }
  }

  /**
   * Extract relationships within index blocks
   */
  private extractIndexBlockRelationships(components: IComponent[], relationships: IRelationship[]): void {
    const indexBlocks = components.filter(c => c.metadata?.isIndexBlock);
    const indexSections = components.filter(c => c.metadata?.isIndexSection);
    const indexEntries = components.filter(c => c.metadata?.isIndexEntry);
    
    // Index block contains sections
    for (const indexBlock of indexBlocks) {
      const relatedSections = indexSections.filter(s => s.metadata?.parentIndexId === indexBlock.id);
      
      for (const section of relatedSections) {
        relationships.push({
          id: `${indexBlock.id}-contains-${section.id}`,
          type: RelationshipType.CONTAINS,
          sourceId: indexBlock.id,
          targetId: section.id,
          metadata: {
            relationship: 'index-contains-section',
            sectionName: section.metadata?.sectionName
          }
        });
      }
    }
    
    // Index sections contain entries
    for (const section of indexSections) {
      const relatedEntries = indexEntries.filter(e => e.metadata?.parentSectionId === section.id);
      
      for (const entry of relatedEntries) {
        relationships.push({
          id: `${section.id}-contains-${entry.id}`,
          type: RelationshipType.CONTAINS,
          sourceId: section.id,
          targetId: entry.id,
          metadata: {
            relationship: 'section-contains-entry',
            entryType: entry.metadata?.entryType,
            entryId: entry.metadata?.entryId
          }
        });
      }
    }
    
    // Extract cross-references between entries
    this.extractIndexCrossReferences(indexEntries, relationships);
    
    // Extract file references from index entries
    this.extractIndexFileReferences(indexEntries, relationships);
  }
  
  /**
   * Extract cross-references between index entries
   */
  private extractIndexCrossReferences(indexEntries: IComponent[], relationships: IRelationship[]): void {
    // Find context link entries that reference other entries
    const contextLinkEntries = indexEntries.filter(e => e.metadata?.entryType === 'context_link');
    
    for (const contextLink of contextLinkEntries) {
      const references = contextLink.metadata?.references as IndexReference[] || [];
      
      for (const ref of references) {
        // Find the referenced entry
        const referencedEntry = indexEntries.find(e => e.metadata?.entryId === ref.fileId);
        
        if (referencedEntry) {
          relationships.push({
            id: `${contextLink.id}-references-${referencedEntry.id}`,
            type: RelationshipType.REFERENCES,
            sourceId: contextLink.id,
            targetId: referencedEntry.id,
            metadata: {
              relationship: 'context-link-references',
              referenceType: ref.expandType || 'general'
            }
          });
        }
      }
    }
  }
  
  /**
   * Enhanced AST tracking: Extract all variable declarations with scope and type info
   * For Markdown, this means extracting code variables from code blocks
   */
  extractVariableComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      const codeBlocks = this.extractCodeBlocks(content);
      
      for (const codeBlock of codeBlocks) {
        if (['javascript', 'typescript', 'python', 'java', 'php'].includes(codeBlock.language)) {
          const variables = this.extractVariablesFromCodeBlock(codeBlock, filePath);
          components.push(...variables);
        }
      }
    } catch (error) {
      console.warn(`Failed to extract Markdown variables: ${error}`);
    }
    
    return components;
  }

  /**
   * Enhanced AST tracking: Extract constructor examples from code blocks
   */
  extractConstructorComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      const codeBlocks = this.extractCodeBlocks(content);
      
      for (const codeBlock of codeBlocks) {
        const constructors = this.extractConstructorsFromCodeBlock(codeBlock, filePath);
        components.push(...constructors);
      }
    } catch (error) {
      console.warn(`Failed to extract Markdown constructors: ${error}`);
    }
    
    return components;
  }

  /**
   * Enhanced AST tracking: Extract getter/setter examples and property accessors
   */
  extractAccessorComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      const codeBlocks = this.extractCodeBlocks(content);
      
      for (const codeBlock of codeBlocks) {
        const accessors = this.extractAccessorsFromCodeBlock(codeBlock, filePath);
        components.push(...accessors);
      }
    } catch (error) {
      console.warn(`Failed to extract Markdown accessors: ${error}`);
    }
    
    return components;
  }

  /**
   * Enhanced AST tracking: Extract property assignments from code examples
   */
  extractPropertyAssignments(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      const codeBlocks = this.extractCodeBlocks(content);
      
      for (const codeBlock of codeBlocks) {
        const properties = this.extractPropertiesFromCodeBlock(codeBlock, filePath);
        components.push(...properties);
      }
    } catch (error) {
      console.warn(`Failed to extract Markdown property assignments: ${error}`);
    }
    
    return components;
  }

  /**
   * Enhanced AST tracking: Extract usage relationships from code examples
   */
  extractUsageRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    
    try {
      const codeBlocks = this.extractCodeBlocks(content);
      
      for (const codeBlock of codeBlocks) {
        const usageRels = this.extractUsageFromCodeBlock(codeBlock, components);
        relationships.push(...usageRels);
      }
    } catch (error) {
      console.warn(`Failed to extract Markdown usage relationships: ${error}`);
    }
    
    return relationships;
  }

  /**
   * Enhanced AST tracking: Extract framework components from documentation
   */
  detectFrameworkComponents(content: string, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    try {
      // Extract framework mentions from headings and content
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!.trim();
        
        // Find framework-specific headings
        const frameworkHeading = line.match(/^#+\s*.*(React|Vue|Angular|Django|Flask|Laravel|Symfony|Spring|Express).*$/i);
        if (frameworkHeading) {
          const framework = frameworkHeading[1]!;
          
          const component: IComponent = {
            id: this.generateComponentId(filePath, `${framework.toLowerCase()}_section_${i + 1}`, ComponentType.MODULE),
            name: `${framework} Documentation Section`,
            type: ComponentType.MODULE,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              isFrameworkDocumentation: true,
              framework: framework,
              documentationType: 'heading',
              headingText: line
            }
          };
          components.push(component);
        }
        
        // Find API documentation patterns
        const apiPattern = line.match(/^#+\s*.*(API|Endpoint|Route).*([A-Z]+)\s+(\/\S+)/);
        if (apiPattern) {
          const method = apiPattern[2]!;
          const endpoint = apiPattern[3]!;
          
          const component: IComponent = {
            id: this.generateComponentId(filePath, `api_${method.toLowerCase()}_${endpoint.replace(/\//g, '_')}`, ComponentType.FUNCTION),
            name: `${method} ${endpoint}`,
            type: ComponentType.FUNCTION,
            language: this.language,
            filePath,
            location: this.createLocation(i + 1, i + 1),
            metadata: {
              isAPIDocumentation: true,
              httpMethod: method,
              endpoint: endpoint,
              documentationType: 'api_endpoint'
            }
          };
          components.push(component);
        }
      }
      
      // Extract framework components from code blocks
      const codeBlocks = this.extractCodeBlocks(content);
      for (const codeBlock of codeBlocks) {
        const frameworkComponents = this.extractFrameworkFromCodeBlock(codeBlock, filePath);
        components.push(...frameworkComponents);
      }
      
    } catch (error) {
      console.warn(`Failed to extract Markdown framework components: ${error}`);
    }
    
    return components;
  }

  /**
   * Enhanced AST tracking: Extract import/export relationships from markdown
   */
  extractImportExportRelationships(components: IComponent[], content: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const fileComponent = components.find(c => c.type === ComponentType.FILE);
    if (!fileComponent) return relationships;
    
    try {
      // Extract imports from code blocks
      const codeBlocks = this.extractCodeBlocks(content);
      
      for (const codeBlock of codeBlocks) {
        const importRels = this.extractImportsFromCodeBlock(codeBlock, fileComponent.id);
        relationships.push(...importRels);
      }
      
      // Extract cross-references between markdown files
      const linkComponents = components.filter(c => c.metadata?.isLink && !c.metadata?.isExternal);
      
      for (const linkComp of linkComponents) {
        const linkUrl = linkComp.metadata?.linkUrl as string;
        
        if (linkUrl && (linkUrl.endsWith('.md') || linkUrl.includes('.md#'))) {
          relationships.push({
            id: `${fileComponent.id}-references-${linkUrl}`,
            type: RelationshipType.REFERENCES,
            sourceId: fileComponent.id,
            targetId: `MARKDOWN:${linkUrl}`,
            metadata: {
              relationship: 'markdown-references-markdown',
              linkUrl: linkUrl,
              linkText: linkComp.metadata?.linkText
            }
          });
        }
      }
      
    } catch (error) {
      console.warn(`Failed to extract Markdown import relationships: ${error}`);
    }
    
    return relationships;
  }

  // Helper methods for enhanced extraction
  private extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const codeBlockMatch = line.match(/^```(\w+)?(.*)$/);
      
      if (codeBlockMatch) {
        const language = codeBlockMatch[1] || 'text';
        const title = codeBlockMatch[2]?.trim() || '';
        let codeContent = '';
        const startLine = i + 1;
        i++;
        
        // Find end of code block
        while (i < lines.length && !lines[i]!.startsWith('```')) {
          codeContent += lines[i]! + '\n';
          i++;
        }
        
        codeBlocks.push({
          language,
          content: codeContent.trim(),
          startLine,
          endLine: i + 1,
          ...(title && { title })
        });
      }
    }
    
    return codeBlocks;
  }

  private extractVariablesFromCodeBlock(codeBlock: CodeBlock, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    const lines = codeBlock.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      let varMatch: RegExpMatchArray | null = null;
      
      // JavaScript/TypeScript variable patterns
      if (['javascript', 'typescript', 'js', 'ts'].includes(codeBlock.language)) {
        varMatch = line.match(/(const|let|var)\s+(\w+)\s*=\s*(.+);?/);
      }
      // Python variable patterns
      else if (codeBlock.language === 'python') {
        varMatch = line.match(/(\w+)\s*=\s*(.+)/);
      }
      // Java variable patterns
      else if (codeBlock.language === 'java') {
        varMatch = line.match(/(\w+)\s+(\w+)\s*=\s*(.+);/);
      }
      // PHP variable patterns
      else if (codeBlock.language === 'php') {
        varMatch = line.match(/\$(\w+)\s*=\s*(.+);/);
      }
      
      if (varMatch) {
        const varName = varMatch[2] || varMatch[1]!;
        const value = varMatch[3] || varMatch[2]!;
        
        const component: IComponent = {
          id: this.generateComponentId(filePath, `code_var_${varName}_${codeBlock.startLine + i}`, ComponentType.VARIABLE),
          name: varName,
          type: ComponentType.VARIABLE,
          language: codeBlock.language,
          filePath,
          location: this.createLocation(codeBlock.startLine + i, codeBlock.startLine + i),
          metadata: {
            isCodeExample: true,
            codeBlockLanguage: codeBlock.language,
            assignedValue: value,
            scope: 'example',
            ...(codeBlock.title && { codeBlockTitle: codeBlock.title })
          }
        };
        
        components.push(component);
      }
    }
    
    return components;
  }

  private extractConstructorsFromCodeBlock(codeBlock: CodeBlock, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    const lines = codeBlock.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      let constructorMatch: RegExpMatchArray | null = null;
      
      // JavaScript/TypeScript constructor patterns
      if (['javascript', 'typescript', 'js', 'ts'].includes(codeBlock.language)) {
        constructorMatch = line.match(/constructor\s*\(([^)]*)\)/) || 
                          line.match(/class\s+(\w+).*\{/);
      }
      // Python __init__ patterns
      else if (codeBlock.language === 'python') {
        constructorMatch = line.match(/def\s+__init__\s*\(([^)]*)\):/);
      }
      // Java constructor patterns
      else if (codeBlock.language === 'java') {
        constructorMatch = line.match(/public\s+(\w+)\s*\(([^)]*)\)/);
      }
      // PHP __construct patterns
      else if (codeBlock.language === 'php') {
        constructorMatch = line.match(/function\s+__construct\s*\(([^)]*)\)/);
      }
      
      if (constructorMatch) {
        const constructorName = constructorMatch[1] || 'constructor';
        
        const component: IComponent = {
          id: this.generateComponentId(filePath, `code_constructor_${constructorName}_${codeBlock.startLine + i}`, ComponentType.CONSTRUCTOR),
          name: constructorName,
          type: ComponentType.CONSTRUCTOR,
          language: codeBlock.language,
          filePath,
          location: this.createLocation(codeBlock.startLine + i, codeBlock.startLine + i),
          metadata: {
            isCodeExample: true,
            codeBlockLanguage: codeBlock.language,
            isConstructor: true,
            ...(codeBlock.title && { codeBlockTitle: codeBlock.title })
          }
        };
        
        components.push(component);
      }
    }
    
    return components;
  }

  private extractAccessorsFromCodeBlock(codeBlock: CodeBlock, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    const lines = codeBlock.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      
      // Find getter/setter patterns across languages
      const getterMatch = line.match(/(get|getter|@property)\s+(\w+)/) ||
                         line.match(/function\s+(get\w+)\s*\(/) ||
                         line.match(/def\s+(\w+)\s*\(.*\):/) && line.includes('@property');
      
      const setterMatch = line.match(/(set|setter)\s+(\w+)/) ||
                         line.match(/function\s+(set\w+)\s*\(/) ||
                         line.match(/@(\w+)\.setter/);
      
      if (getterMatch || setterMatch) {
        const isGetter = !!getterMatch;
        let methodName = 'unknown';
        const match = getterMatch || setterMatch;
        if (match && Array.isArray(match)) {
          methodName = match[2] || match[1] || 'unknown';
        }
        
        const component: IComponent = {
          id: this.generateComponentId(filePath, `code_accessor_${methodName}_${codeBlock.startLine + i}`, ComponentType.METHOD),
          name: methodName,
          type: ComponentType.METHOD,
          language: codeBlock.language,
          filePath,
          location: this.createLocation(codeBlock.startLine + i, codeBlock.startLine + i),
          metadata: {
            isCodeExample: true,
            codeBlockLanguage: codeBlock.language,
            isAccessor: true,
            isGetter: isGetter,
            isSetter: !isGetter,
            ...(codeBlock.title && { codeBlockTitle: codeBlock.title })
          }
        };
        
        components.push(component);
      }
    }
    
    return components;
  }

  private extractPropertiesFromCodeBlock(codeBlock: CodeBlock, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    const lines = codeBlock.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      
      // Find property assignment patterns
      const propertyMatch = line.match(/(\w+)\.(\w+)\s*=\s*(.+)/) ||
                           line.match(/this\.(\w+)\s*=\s*(.+)/) ||
                           line.match(/self\.(\w+)\s*=\s*(.+)/) ||
                           line.match(/\$this->(\w+)\s*=\s*(.+)/);
      
      if (propertyMatch) {
        const objectName = propertyMatch[1] === 'this' || propertyMatch[1] === 'self' ? 'this' : propertyMatch[1]!;
        const propertyName = propertyMatch[2] || propertyMatch[1]!;
        const value = propertyMatch[3] || propertyMatch[2]!;
        
        const component: IComponent = {
          id: this.generateComponentId(filePath, `code_property_${propertyName}_${codeBlock.startLine + i}`, ComponentType.PROPERTY),
          name: `${objectName}.${propertyName}`,
          type: ComponentType.PROPERTY,
          language: codeBlock.language,
          filePath,
          location: this.createLocation(codeBlock.startLine + i, codeBlock.startLine + i),
          metadata: {
            isCodeExample: true,
            codeBlockLanguage: codeBlock.language,
            objectName: objectName,
            propertyName: propertyName,
            assignedValue: value,
            isAssignment: true,
            ...(codeBlock.title && { codeBlockTitle: codeBlock.title })
          }
        };
        
        components.push(component);
      }
    }
    
    return components;
  }

  private extractUsageFromCodeBlock(codeBlock: CodeBlock, components: IComponent[]): IRelationship[] {
    const relationships: IRelationship[] = [];
    const lines = codeBlock.content.split('\n');
    
    // Find function calls and method invocations in the code block
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      
      // Find function calls
      const functionCalls = line.matchAll(/(\w+)\s*\(/g);
      for (const match of functionCalls) {
        const functionName = match[1]!;
        const calledComponent = components.find(c => c.name === functionName);
        
        if (calledComponent) {
          relationships.push({
            id: `code_block_calls_${functionName}_${codeBlock.startLine + i}`,
            type: RelationshipType.CALLS,
            sourceId: `CODE_BLOCK:${codeBlock.startLine}`,
            targetId: calledComponent.id,
            metadata: {
              relationship: 'code-example-calls-function',
              calledFunction: functionName,
              line: codeBlock.startLine + i,
              codeLanguage: codeBlock.language
            }
          });
        }
      }
    }
    
    return relationships;
  }

  private extractFrameworkFromCodeBlock(codeBlock: CodeBlock, filePath: string): IComponent[] {
    const components: IComponent[] = [];
    
    // Check for framework-specific patterns in code blocks
    const frameworkPatterns = {
      'React': /import.*from\s+['"]react['"]/,
      'Vue': /import.*from\s+['"]vue['"]/,
      'Angular': /@Component|@Injectable|@NgModule/,
      'Django': /from django|import django/,
      'Flask': /from flask|import flask/,
      'Laravel': /use Illuminate|Illuminate\\/,
      'Spring': /@SpringBootApplication|@RestController|@Component/,
      'Express': /require\(['"]express['"]/
    };
    
    for (const [framework, pattern] of Object.entries(frameworkPatterns)) {
      if (pattern.test(codeBlock.content)) {
        const component: IComponent = {
          id: this.generateComponentId(filePath, `framework_${framework.toLowerCase()}_${codeBlock.startLine}`, ComponentType.MODULE),
          name: `${framework} Example`,
          type: ComponentType.MODULE,
          language: codeBlock.language,
          filePath,
          location: this.createLocation(codeBlock.startLine, codeBlock.endLine),
          metadata: {
            isFrameworkExample: true,
            framework: framework,
            codeBlockLanguage: codeBlock.language,
            ...(codeBlock.title && { codeBlockTitle: codeBlock.title })
          }
        };
        
        components.push(component);
      }
    }
    
    return components;
  }

  private extractImportsFromCodeBlock(codeBlock: CodeBlock, fileComponentId: string): IRelationship[] {
    const relationships: IRelationship[] = [];
    const lines = codeBlock.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      
      // JavaScript/TypeScript import patterns
      const jsImportMatch = line.match(/import\s+.*from\s+['"]([^'"]+)['"]/); 
      if (jsImportMatch) {
        const importPath = jsImportMatch[1]!;
        
        relationships.push({
          id: `${fileComponentId}-example-imports-${importPath}-${codeBlock.startLine + i}`,
          type: RelationshipType.IMPORTS_FROM,
          sourceId: fileComponentId,
          targetId: `MODULE:${importPath}`,
          metadata: {
            relationship: 'code-example-imports',
            importPath: importPath,
            language: codeBlock.language,
            line: codeBlock.startLine + i
          }
        });
      }
      
      // Python import patterns
      const pythonImportMatch = line.match(/from\s+(\S+)\s+import|import\s+(\S+)/);
      if (pythonImportMatch) {
        const importPath = pythonImportMatch[1] || pythonImportMatch[2]!;
        
        relationships.push({
          id: `${fileComponentId}-example-imports-${importPath}-${codeBlock.startLine + i}`,
          type: RelationshipType.IMPORTS_FROM,
          sourceId: fileComponentId,
          targetId: `MODULE:${importPath}`,
          metadata: {
            relationship: 'code-example-imports',
            importPath: importPath,
            language: codeBlock.language,
            line: codeBlock.startLine + i
          }
        });
      }
    }
    
    return relationships;
  }

  /**
   * Extract file references from index entries
   */
  private extractIndexFileReferences(indexEntries: IComponent[], relationships: IRelationship[]): void {
    // Group entries that reference the same files
    const fileReferences = new Map<string, IComponent[]>();
    
    for (const entry of indexEntries) {
      const references = entry.metadata?.references as IndexReference[] || [];
      
      for (const ref of references) {
        if (!fileReferences.has(ref.fileId)) {
          fileReferences.set(ref.fileId, []);
        }
        fileReferences.get(ref.fileId)!.push(entry);
      }
    }
    
    // Create relationships between entries that reference the same files
    for (const [fileId, entries] of fileReferences) {
      if (entries.length > 1) {
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            const sourceEntry = entries[i];
            const targetEntry = entries[j];
            
            relationships.push({
              id: `${sourceEntry!.id}-shares-file-${targetEntry!.id}`,
              type: RelationshipType.USES,
              sourceId: sourceEntry!.id,
              targetId: targetEntry!.id,
              metadata: {
                relationship: 'shares-file-reference',
                sharedFileId: fileId,
                sourceType: sourceEntry!.metadata?.entryType,
                targetType: targetEntry!.metadata?.entryType
              }
            });
          }
        }
      }
    }
  }
}
