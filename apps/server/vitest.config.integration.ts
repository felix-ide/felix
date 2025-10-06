import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    include: [
      'src/**/*.integration.test.ts',
      'src/**/*.real.test.ts',
      'src/**/__tests__/*.integration.test.ts',
      'src/**/__tests__/*.real.test.ts',
      // semantic tests use real parser stack; run them here
      'src/**/__tests__/*.semantic.test.ts',
    ],
    environment: 'node',
    // test.deps.inline is deprecated in Vitest v3; move under server.deps.inline
    globals: true,
    pool: 'threads',
    setupFiles: ['jest.integration.setup.ts'],
    watch: false,
  },
  server: {
    deps: { inline: ['express', 'body-parser'] },
  },
  resolve: {
    alias: {
      // Use built ESM for code-intelligence
      '@felix/code-intelligence': path.resolve(__dirname, '../../packages/code-intelligence/dist/index.js'),
    },
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'json', 'json-summary'],
    reportsDirectory: 'coverage-integration',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__tests__/**',
      '**/coverage/**',
      '**/coverage-*/*',
      '**/coverage-unit/**',
      '**/__mocks__/**',
      '**/scripts/**',
      '**/examples/**',
      '**/test-files/**',
      '**/test-dir/**'
    ],
  },
});
