// Base Jest config for unit tests (ESM + ts-jest)
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    // Allow importing ESM paths written with .js extension from TS
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Point internal package to source so ts-jest can transform it
    '^@felix/code-intelligence$': '<rootDir>/../../packages/code-intelligence/src/index-lite-jest.ts',
    // Shim vitest to Jest for any unit tests that import it
    '^vitest$': '<rootDir>/../../packages/code-intelligence/test-shims/vitest.ts',
  },
  transformIgnorePatterns: [
    // Transform our internal packages and certain ESM deps
    'node_modules/(?!(@aigent|java-parser)/)'
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
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Ignore any integration/real tests (Vitest handles these)
    '.*\\.integration\\..*\\.test\\.ts$',
    '.*\\.real\\..*\\.test\\.ts$',
    '\\.(integration|real)\\.test\\.ts$',
    // Run semantic tests with Vitest integration runner (real parsers)
    '.*\\.semantic\\.test\\.ts$',
    // Parser unit tests run under Vitest, not Jest
    '<rootDir>/tests/unit/parsers/'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    // do not include test code itself in unit coverage
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    // exclude integration/real specs measured by Vitest
    '!src/**/*.integration.test.ts',
    '!src/**/*.real.test.ts',
  ],
  coverageDirectory: 'coverage-unit',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
};
