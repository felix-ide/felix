import { BaseLanguageParser } from '../BaseLanguageParser.js';
import type { ParseError, ParserOptions } from '../../interfaces/ILanguageParser.js';
import type { IComponent, IRelationship } from '../../types.js';

export class PythonParser extends BaseLanguageParser {
  constructor() {
    super('python', ['.py', '.pyw', '.pyi']);
  }

  protected getCapabilities() {
    return {
      symbols: true,
      relationships: true,
      ranges: true,
      types: true,
      controlFlow: true,
      incremental: false,
    };
  }

  protected getParsingLevel(): 'semantic' | 'structural' | 'basic' {
    return 'semantic';
  }

  protected getBackend(): 'ast' | 'tree-sitter' | 'detectors-only' | 'hybrid' {
    return 'ast';
  }

  detectComponents(content: string, filePath: string): IComponent[] {
    // Minimal stub: return a file component
    return [
      {
        id: `${filePath}#file`,
        name: filePath.split('/').pop() || 'file.py',
        type: 0 as any, // ComponentType.FILE, avoid import cycle in stub
        language: 'python',
        filePath,
        location: { startLine: 1, endLine: content.split('\n').length, startColumn: 0, endColumn: 0 },
        code: content,
        metadata: { backend: 'ast', parsingLevel: 'semantic' },
      },
    ];
  }

  detectRelationships(components: IComponent[], content: string): IRelationship[] {
    return [];
  }

  validateSyntax(content: string): ParseError[] | Promise<ParseError[]> {
    return [];
  }
}
