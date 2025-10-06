// Jest configuration for REAL integration tests without mocks
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  
  // NO MOCKS - we want real implementations for integration tests
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // For integration, use built ESM to avoid mixing .ts with stray .js in src
    '^@felix/code-intelligence$': '<rootDir>/tests/mocks/aigent-oraicle-shim.ts',
  },
  
  transformIgnorePatterns: [
    'node_modules/(?!(@aigent|java-parser)/)'
  ],
  
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
        isolatedModules: false
      },
    ],
  },
  
  // Only run integration test files
  testMatch: [
    '**/*.integration.test.ts',
    '**/*.real.test.ts',
    '**/*.e2e.test.ts'
  ],
  
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.ts'],
  
  collectCoverageFrom: [
    'src/**/*.ts',
    '../../packages/code-intelligence/src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.ts',
    '!../../packages/code-intelligence/src/**/*.test.ts',
    '!../../packages/code-intelligence/src/**/*.d.ts'
  ],
  
  coverageDirectory: 'coverage-integration',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  testTimeout: 30000
};
