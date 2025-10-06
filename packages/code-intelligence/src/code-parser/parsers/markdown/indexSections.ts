import { ComponentType } from '../../types.js';
import type { IndexEntry, IndexEntryType, IndexReference, IndexSection } from './types.js';

export function parseIndexSections(content: string, startLine: number): IndexSection[] {
  const sections: IndexSection[] = [];
  const lines = content.split('\n');

  let currentSection: IndexSection | null = null;
  let lineOffset = startLine;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    lineOffset++;

    const sectionMatch = line.match(/^#\s+([A-Z_]+)$/);
    if (sectionMatch) {
      if (currentSection) {
        currentSection.endLine = lineOffset - 1;
        sections.push(currentSection);
      }

      currentSection = {
        name: sectionMatch[1]!,
        entries: [],
        startLine: lineOffset,
        endLine: lineOffset
      };
      continue;
    }

    if (!line || !currentSection) {
      continue;
    }

    const entry = parseIndexEntry(line, lineOffset, currentSection.name);
    if (entry) {
      currentSection.entries.push(entry);
      currentSection.endLine = lineOffset;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

export function parseIndexEntry(line: string, lineNumber: number, sectionName: string): IndexEntry | null {
  const entryType = getIndexEntryType(sectionName);

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

  const refMatch = line.match(/^([A-Z]+\d+)>([\d-,]+):(.+)$/);
  if (refMatch) {
    const fileId = refMatch[1]!;
    const lineRange = refMatch[2]!;
    const description = refMatch[3]!;

    const isExpandable = description === '@CODE@' || description === '@MARKDOWN@';
    const expandType = description === '@CODE@' ? 'code' : description === '@MARKDOWN@' ? 'markdown' : undefined;

    const references: IndexReference[] = [{
      fileId,
      lineRange,
      ...(isExpandable ? {} : { description }),
      ...(isExpandable && { isExpandable }),
      ...(expandType && { expandType })
    }];

    return {
      id: `${fileId}-${lineRange}`,
      name: `${fileId}>${lineRange}`,
      description: isExpandable ? `Expandable ${expandType} content` : description,
      references,
      type: 'file_path',
      lineNumber
    };
  }

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

export function getIndexEntryType(sectionName: string): IndexEntryType {
  const typeMap: Record<string, IndexEntryType> = {
    FILE_PATHS: 'file_path',
    SYSTEMS: 'system',
    ELECTRON_APIS: 'electron_api',
    CRITICAL_INTERFACES: 'critical_interface',
    PROBLEM_AREAS: 'problem_area',
    PIPELINE_FLOWS: 'pipeline_flow',
    CODE_SNIPPETS: 'code_snippet',
    DOCS_SECTIONS: 'docs_section',
    CONTEXT_LINKS: 'context_link'
  };

  return typeMap[sectionName] || 'file_path';
}

export function getComponentTypeForIndexEntry(entryType: IndexEntryType): ComponentType {
  const typeMap: Record<IndexEntryType, ComponentType> = {
    file_path: ComponentType.FILE,
    system: ComponentType.MODULE,
    electron_api: ComponentType.INTERFACE,
    critical_interface: ComponentType.INTERFACE,
    problem_area: ComponentType.COMMENT,
    pipeline_flow: ComponentType.FUNCTION,
    code_snippet: ComponentType.FUNCTION,
    docs_section: ComponentType.COMMENT,
    context_link: ComponentType.IMPORT
  };

  return typeMap[entryType] || ComponentType.VARIABLE;
}
