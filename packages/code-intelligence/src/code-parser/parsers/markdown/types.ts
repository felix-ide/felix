import type { ComponentType, Location } from '../../types.js';

export type MarkdownElementType =
  | 'heading'
  | 'codeblock'
  | 'link'
  | 'image'
  | 'table'
  | 'list'
  | 'blockquote'
  | 'paragraph'
  | 'index';

export interface MarkdownElement {
  type: MarkdownElementType;
  level?: number;
  title?: string;
  content: string;
  language?: string;
  url?: string;
  alt?: string;
  startLine: number;
  endLine: number;
  id?: string;
  children?: MarkdownElement[];
  indexSections?: IndexSection[];
}

export interface IndexSection {
  name: string;
  entries: IndexEntry[];
  startLine: number;
  endLine: number;
}

export type IndexEntryType =
  | 'file_path'
  | 'system'
  | 'electron_api'
  | 'critical_interface'
  | 'problem_area'
  | 'pipeline_flow'
  | 'code_snippet'
  | 'docs_section'
  | 'context_link';

export interface IndexReference {
  fileId: string;
  lineRange?: string;
  description?: string;
  isExpandable?: boolean;
  expandType?: 'code' | 'markdown';
}

export interface IndexEntry {
  id: string;
  name: string;
  description?: string;
  references: IndexReference[];
  type: IndexEntryType;
  lineNumber: number;
}

export interface CodeBlock {
  language: string;
  content: string;
  startLine: number;
  endLine: number;
  title?: string;
}

export interface ComponentBuilderDeps {
  language: string;
  generateComponentId: (filePath: string, name: string, type: ComponentType) => string;
  createLocation: (startLine: number, endLine: number) => Location;
  extractSourceCodeByRange: (content: string, startLine: number, endLine: number) => string;
}
