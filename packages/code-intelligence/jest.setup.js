// CommonJS setup file for Jest (avoids TS ESM edge cases)

jest.mock('./src/code-parser/parsers/PythonParser', () => {
  class PythonParser {
    constructor() { this.language = 'python'; }
    getSupportedExtensions() { return ['.py']; }
    getIgnorePatterns() { return []; }
    parseFile(filePath) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: { filePath, language: 'python', parseTime: 0, componentCount: 0, relationshipCount: 0 },
      };
    }
  }
  return { PythonParser };
});

jest.mock('./src/code-parser/parsers/PhpParser', () => {
  class PhpParser {
    constructor() { this.language = 'php'; }
    getSupportedExtensions() { return ['.php']; }
    getIgnorePatterns() { return []; }
    registerDelegate() {}
    parseFile(filePath) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: { filePath, language: 'php', parseTime: 0, componentCount: 0, relationshipCount: 0 },
      };
    }
  }
  return { PhpParser };
});

jest.mock('./src/code-parser/parsers/JavaParser', () => {
  class JavaParser {
    constructor() { this.language = 'java'; }
    getSupportedExtensions() { return ['.java']; }
    getIgnorePatterns() { return []; }
    parseFile(filePath) {
      return {
        components: [],
        relationships: [],
        errors: [],
        warnings: [],
        metadata: { filePath, language: 'java', parseTime: 0, componentCount: 0, relationshipCount: 0 },
      };
    }
  }
  return { JavaParser };
});

