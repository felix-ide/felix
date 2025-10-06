import {
  ComponentType,
  IComponent
} from '../../types.js';
import type { IndexEntry, IndexReference, MarkdownElement, ComponentBuilderDeps, IndexSection } from './types.js';
import {
  parseIndexSections,
  parseIndexEntry,
  getIndexEntryType,
  getComponentTypeForIndexEntry
} from './indexSections.js';

interface BuildParams {
  filePath: string;
  name: string;
  idSeed?: string;
  type: ComponentType;
  language: string;
  startLine: number;
  endLine: number;
  metadata: Record<string, unknown>;
  code?: string;
}

export interface MarkdownComponentBuilder {
  convertElementsToComponents(
    elements: MarkdownElement[],
    components: IComponent[],
    filePath: string,
    content: string
  ): number[];
  extractLinksAndImages(
    content: string,
    components: IComponent[],
    filePath: string,
    lineStarts: number[]
  ): void;
}

export function createMarkdownComponentBuilder(deps: ComponentBuilderDeps): MarkdownComponentBuilder {
  function buildComponent(params: BuildParams): IComponent {
    const {
      filePath,
      name,
      idSeed,
      type,
      language,
      startLine,
      endLine,
      metadata,
      code
    } = params;

    const component: IComponent = {
      id: deps.generateComponentId(filePath, idSeed ?? name, type),
      name,
      type,
      language,
      filePath,
      location: deps.createLocation(startLine, endLine),
      metadata
    };

    if (code !== undefined) {
      component.code = code;
    }

    return component;
  }

  function extractSnippet(lines: string[], startLine: number, endLine: number): string {
    if (lines.length === 0) {
      return '';
    }

    const startIndex = Math.max(0, startLine - 1);
    const endIndex = Math.min(lines.length, Math.max(startIndex, endLine));

    return lines.slice(startIndex, endIndex).join('\n');
  }

  function buildLineStarts(content: string): number[] {
    const lineStarts: number[] = [0];
    for (let index = 0; index < content.length; index++) {
      if (content.charCodeAt(index) === 10) {
        lineStarts.push(index + 1);
      }
    }
    return lineStarts;
  }

  function getLineNumber(lineStarts: number[], position: number): number {
    let low = 0;
    let high = lineStarts.length - 1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      if (lineStarts[mid] <= position) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return high + 1;
  }

  function addHeadingComponent(
    element: MarkdownElement,
    components: IComponent[],
    filePath: string,
    lines: string[]
  ): void {
    const componentName = element.title || element.content;
    const idSeed = element.id || componentName;

    components.push(buildComponent({
      filePath,
      name: componentName,
      idSeed,
      type: ComponentType.SECTION,
      language: deps.language,
      startLine: element.startLine,
      endLine: element.endLine,
      metadata: {
        level: element.level,
        headingId: element.id,
        headingText: element.title || element.content,
        isHeading: true,
        isExported: true
      },
      code: extractSnippet(lines, element.startLine, element.endLine)
    }));
  }

  function addCodeBlockComponent(
    element: MarkdownElement,
    components: IComponent[],
    filePath: string,
    lines: string[]
  ): void {
    const componentName = element.title || `code-block-${element.language}-${element.startLine}`;

    components.push(buildComponent({
      filePath,
      name: componentName,
      type: ComponentType.FUNCTION,
      language: element.language || 'text',
      startLine: element.startLine,
      endLine: element.endLine,
      metadata: {
        isCodeBlock: true,
        codeLanguage: element.language,
        codeContent: element.content,
        ...(element.title && { title: element.title }),
        isExample: true,
        isExported: true
      },
      code: extractSnippet(lines, element.startLine, element.endLine)
    }));
  }

  function addTableComponent(
    element: MarkdownElement,
    components: IComponent[],
    filePath: string,
    lines: string[]
  ): void {
    const componentName = `table-${element.startLine}`;

    components.push(buildComponent({
      filePath,
      name: componentName,
      type: ComponentType.INTERFACE,
      language: deps.language,
      startLine: element.startLine,
      endLine: element.endLine,
      metadata: {
        isTable: true,
        tableContent: element.content,
        rowCount: element.content.split('\n').length,
        isStructuredData: true,
        isExported: true
      },
      code: extractSnippet(lines, element.startLine, element.endLine)
    }));
  }

  function addListComponent(
    element: MarkdownElement,
    components: IComponent[],
    filePath: string,
    lines: string[]
  ): void {
    const componentName = `list-${element.startLine}`;

    components.push(buildComponent({
      filePath,
      name: componentName,
      type: ComponentType.VARIABLE,
      language: deps.language,
      startLine: element.startLine,
      endLine: element.endLine,
      metadata: {
        isList: true,
        listContent: element.content,
        itemCount: element.content.split('\n').length,
        isExported: true
      },
      code: extractSnippet(lines, element.startLine, element.endLine)
    }));
  }

  function addBlockquoteComponent(
    element: MarkdownElement,
    components: IComponent[],
    filePath: string
  ): void {
    const componentName = `quote-${element.startLine}`;

    components.push(buildComponent({
      filePath,
      name: componentName,
      type: ComponentType.CONSTANT,
      language: deps.language,
      startLine: element.startLine,
      endLine: element.endLine,
      metadata: {
        isBlockquote: true,
        quoteContent: element.content,
        isExported: true
      }
    }));
  }

  function addParagraphComponent(
    element: MarkdownElement,
    components: IComponent[],
    filePath: string
  ): void {
    const componentName = `paragraph-${element.startLine}`;
    const refComponentId = element.content.startsWith('[[id:')
      ? element.content.replace(/^\[\[id:([^\]]+)\]\].*$/i, '$1')
      : undefined;

    components.push(buildComponent({
      filePath,
      name: componentName,
      type: ComponentType.COMMENT,
      language: deps.language,
      startLine: element.startLine,
      endLine: element.endLine,
      metadata: {
        isParagraph: true,
        content: element.content,
        refComponentId,
        wordCount: element.content.split(/\s+/).length,
        isExported: true
      }
    }));
  }

  function addIndexBlockComponent(
    element: MarkdownElement,
    components: IComponent[],
    filePath: string
  ): void {
    const componentName = `index-block-${element.startLine}`;

    const indexComponent = buildComponent({
      filePath,
      name: componentName,
      type: ComponentType.MODULE,
      language: 'index',
      startLine: element.startLine,
      endLine: element.endLine,
      metadata: {
        isIndexBlock: true,
        indexContent: element.content,
        sectionCount: element.indexSections?.length || 0,
        isSpecialMarkdown: true,
        isExported: true
      }
    });

    components.push(indexComponent);

    const sections = element.indexSections ?? parseIndexSections(element.content, element.startLine);
    element.indexSections = sections;

    for (const section of sections) {
      const sectionComponent = buildComponent({
        filePath,
        name: `index-section-${section.name.toLowerCase()}`,
        type: ComponentType.CLASS,
        language: 'index',
        startLine: section.startLine,
        endLine: section.endLine,
        metadata: {
          isIndexSection: true,
          sectionName: section.name,
          entryCount: section.entries.length,
          parentIndexId: indexComponent.id,
          isSpecialMarkdown: true,
          isExported: true
        }
      });

      components.push(sectionComponent);

      for (const entry of section.entries) {
        const entryType = getComponentTypeForIndexEntry(entry.type);

        components.push(buildComponent({
          filePath,
          name: `index-entry-${entry.id}`,
          type: entryType,
          language: 'index',
          startLine: entry.lineNumber,
          endLine: entry.lineNumber,
          metadata: {
            isIndexEntry: true,
            entryId: entry.id,
            entryName: entry.name,
            entryType: entry.type,
            entryDescription: entry.description,
            referenceCount: entry.references.length,
            references: entry.references,
            parentSectionId: sectionComponent.id,
            isSpecialMarkdown: true,
            isExported: true
          }
        }));
      }
    }
  }

  function convertElementsToComponents(
    elements: MarkdownElement[],
    components: IComponent[],
    filePath: string,
    content: string
  ): number[] {
    const lines = content.split('\n');
    const lineStarts = buildLineStarts(content);

    for (const element of elements) {
      switch (element.type) {
        case 'heading':
          addHeadingComponent(element, components, filePath, lines);
          break;
        case 'codeblock':
          addCodeBlockComponent(element, components, filePath, lines);
          break;
        case 'table':
          addTableComponent(element, components, filePath, lines);
          break;
        case 'list':
          addListComponent(element, components, filePath, lines);
          break;
        case 'blockquote':
          addBlockquoteComponent(element, components, filePath);
          break;
        case 'paragraph':
          addParagraphComponent(element, components, filePath);
          break;
        case 'index':
          addIndexBlockComponent(element, components, filePath);
          break;
      }
    }

    return lineStarts;
  }

  function extractLinksAndImages(
    content: string,
    components: IComponent[],
    filePath: string,
    lineStarts: number[]
  ): void {
    const inlineLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match: RegExpMatchArray | null;

    while ((match = inlineLinkPattern.exec(content)) !== null) {
      const matchIndex = match.index ?? 0;
      const lineNumber = getLineNumber(lineStarts, matchIndex);
      const linkText = match[1]!;
      const linkUrl = match[2]!;

      components.push(buildComponent({
        filePath,
        name: linkText,
        idSeed: `link-${linkText}-${lineNumber}`,
        type: ComponentType.IMPORT,
        language: deps.language,
        startLine: lineNumber,
        endLine: lineNumber,
        metadata: {
          isLink: true,
          linkText,
          linkUrl,
          linkType: 'inline',
          isExternal: isExternalUrl(linkUrl),
          isExported: true
        }
      }));
    }

    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;

    while ((match = imagePattern.exec(content)) !== null) {
      const matchIndex = match.index ?? 0;
      const lineNumber = getLineNumber(lineStarts, matchIndex);
      const altText = match[1] || '';
      const imageUrl = match[2]!;

      components.push(buildComponent({
        filePath,
        name: altText || `image-${lineNumber}`,
        idSeed: `image-${altText || 'unnamed'}-${lineNumber}`,
        type: ComponentType.IMPORT,
        language: deps.language,
        startLine: lineNumber,
        endLine: lineNumber,
        metadata: {
          isImage: true,
          altText,
          imageUrl,
          linkType: 'image',
          isExternal: isExternalUrl(imageUrl),
          isExported: true
        }
      }));
    }

    const referenceLinkPattern = /\[([^\]]+)\]\[([^\]]+)\]/g;

    while ((match = referenceLinkPattern.exec(content)) !== null) {
      const matchIndex = match.index ?? 0;
      const lineNumber = getLineNumber(lineStarts, matchIndex);
      const linkText = match[1]!;
      const linkRef = match[2]!;

      components.push(buildComponent({
        filePath,
        name: linkText,
        idSeed: `ref-link-${linkText}-${lineNumber}`,
        type: ComponentType.IMPORT,
        language: deps.language,
        startLine: lineNumber,
        endLine: lineNumber,
        metadata: {
          isLink: true,
          linkText,
          linkRef,
          linkType: 'reference',
          isExported: true
        }
      }));
    }
  }

  function isExternalUrl(url: string): boolean {
    return /^https?:\/\//.test(url) || /^ftp:\/\//.test(url);
  }

  return {
    convertElementsToComponents,
    extractLinksAndImages
  };
}

export function hydrateIndexSections(element: MarkdownElement, startLine: number): IndexSection[] {
  return element.indexSections ?? parseIndexSections(element.content, startLine);
}

export function parseIndexEntryFromLine(line: string, lineNumber: number, sectionName: string): IndexEntry | null {
  return parseIndexEntry(line, lineNumber, sectionName);
}

export function getIndexEntryTypeForSection(sectionName: string) {
  return getIndexEntryType(sectionName);
}

export function getComponentTypeForIndexEntryType(entryType: IndexEntry['type']) {
  return getComponentTypeForIndexEntry(entryType);
}

export type { IndexEntry, IndexReference } from './types.js';
