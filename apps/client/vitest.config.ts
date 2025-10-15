import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    globals: true,
    onConsoleLog(log, _type) {
      const suppressPatterns = [
        /\[ThemeSystem]/,
        /ThemeSystem/,
        /\[ThemeContext]/,
        /RuleEditor - handleEntityLinksUpdate/,
        /tasksStore/,
        /Topic context manager/,
        /WindowSizeProcessor/,
        /Generated CSS variables/,
        /Applying theme/,
      ];
      if (suppressPatterns.some((pattern) => pattern.test(log))) {
        return false;
      }
      return undefined;
    },
  },
  coverage: {
    enabled: true,
    provider: 'v8',
    reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
    // keep local output, our merger script will glob these
    reportsDirectory: 'coverage',
    // include linked workspace packages in coverage (theme-system)
    allowExternal: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/__mocks__/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@client/features': path.resolve(__dirname, './src/features'),
      '@client/shared': path.resolve(__dirname, './src/shared'),
    },
  },
});
