module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: false,
      },
    ],
    '^.+\\.m?jsx?$': [
      'babel-jest',
    ],
  },
  // Do not ignore node_modules so ESM packages are transformed by babel-jest
  transformIgnorePatterns: ['/dist/'],
  moduleNameMapper: {
    // Support importing CSS in tests
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Allow TS paths that import ESM with .js extension
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/index.ts',
  ],
};
