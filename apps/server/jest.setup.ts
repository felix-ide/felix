// Jest global setup for the Felix server tests
// Stub out PythonParser (ESM import.meta usage trips Jest in this config)
jest.mock('../../packages/code-intelligence/src/code-parser/parsers/PythonParser', () => {
  class PythonParser {
    constructor(..._args: any[]) {}
    language = 'python';
    getSupportedExtensions() { return ['.py', '.pyw', '.pyi']; }
    getIgnorePatterns() { return []; }
    parseFile(_filePath: string) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: {
          filePath: _filePath,
          language: 'python',
          parseTime: 0,
          componentCount: 0,
          relationshipCount: 0
        }
      };
    }
  }
  return { PythonParser };
});

jest.mock('../../packages/code-intelligence/src/code-parser/parsers/PhpParser', () => {
  class PhpParser {
    constructor(..._args: any[]) {}
    language = 'php';
    getSupportedExtensions() { return ['.php', '.phtml']; }
    getIgnorePatterns() { return []; }
    registerDelegate(_lang: string, _parser: any) {}
    parseFile(_filePath: string) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: {
          filePath: _filePath,
          language: 'php',
          parseTime: 0,
          componentCount: 0,
          relationshipCount: 0
        }
      };
    }
  }
  return { PhpParser };
});

jest.mock('../../packages/code-intelligence/src/code-parser/parsers/JavaParser', () => {
  class JavaParser {
    constructor(..._args: any[]) {}
    language = 'java';
    getSupportedExtensions() { return ['.java']; }
    getIgnorePatterns() { return []; }
    registerDelegate(_lang: string, _parser: any) {}
    parseFile(_filePath: string) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: {
          filePath: _filePath,
          language: 'java',
          parseTime: 0,
          componentCount: 0,
          relationshipCount: 0
        }
      };
    }
  }
  return { JavaParser };
});
