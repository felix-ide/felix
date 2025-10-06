// Jest config for @felix/code-intelligence (ESM + ts-jest)
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    // Allow importing ESM paths written with .js extension from TS
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Stub PythonParser to avoid ESM import.meta issues under Jest
    'parsers/ PythonParser\\.js$': '<rootDir>/src/code-parser/parsers/__mocks__/PythonParser.jest.ts',
    'PythonParser(\\.js)?$': '<rootDir>/src/code-parser/parsers/__mocks__/PythonParser.jest.ts',
    '.*/parsers/PythonParser(\\.js)?$': '<rootDir>/src/code-parser/parsers/__mocks__/PythonParser.jest.ts',
  },
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  transformIgnorePatterns: [
    // Transform our internal packages and certain ESM deps if needed
    'node_modules/(?!(@felix|java-parser)/)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
        diagnostics: false,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/test/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/code-parser/',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/tests/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
};
