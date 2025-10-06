// Mock PythonParser to avoid import.meta resolution issues under ts-jest
jest.mock('./src/code-parser/parsers/PythonParser', () => {
  class PythonParser {
    language = 'python';
    getSupportedExtensions() { return ['.py']; }
    getIgnorePatterns() { return []; }
    parseFile(_filePath: string) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: { filePath: _filePath, language: 'python', parseTime: 0, componentCount: 0, relationshipCount: 0 }
      };
    }
  }
  return { PythonParser };
});

jest.mock('./src/code-parser/parsers/PhpParser', () => {
  class PhpParser {
    language = 'php';
    getSupportedExtensions() { return ['.php']; }
    getIgnorePatterns() { return []; }
    registerDelegate(_lang: string, _parser: any) {}
    parseFile(_filePath: string) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: { filePath: _filePath, language: 'php', parseTime: 0, componentCount: 0, relationshipCount: 0 }
      };
    }
  }
  return { PhpParser };
});

jest.mock('./src/code-parser/parsers/JavaParser', () => {
  class JavaParser {
    language = 'java';
    getSupportedExtensions() { return ['.java']; }
    getIgnorePatterns() { return []; }
    parseFile(_filePath: string) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: { filePath: _filePath, language: 'java', parseTime: 0, componentCount: 0, relationshipCount: 0 }
      };
    }
  }
  return { JavaParser };
});
