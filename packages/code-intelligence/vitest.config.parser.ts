import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      // Start with extractor unit tests, then HTML embedding integration
      'src/code-parser/__tests__/html/HtmlEmbeddingExtractor.test.ts',
      'src/code-parser/__tests__/html/embedding.test.ts',
    ],
    exclude: [
      'node_modules',
      'dist',
      '**/coverage/**',
      // Exclude service-level suites temporarily; will be ported incrementally
      'src/code-parser/services/**',
      'src/code-parser/**/__tests__/harness/**',
    ],
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage-parser',
      include: ['src/code-parser/**/*.ts'],
    },
  },
});
