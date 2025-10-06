import { describe, it, expect } from '@jest/globals';
import { IgnorePatterns, COMMON_IGNORE_PATTERNS } from '../../utils/IgnorePatterns';

describe('IgnorePatterns', () => {
  it('matches common folders using class API', () => {
    const ig = new IgnorePatterns(process.cwd(), { customPatterns: COMMON_IGNORE_PATTERNS.node });
    expect(ig.shouldIgnore('node_modules/pkg/index.js')).toBe(true);
    expect(ig.shouldIgnore('src/index.ts')).toBe(false);
  });
});
