import { describe, it, expect } from '@jest/globals';
import { computeComponentContentHash } from '../../utils/ContentHash';

describe('ContentHash', () => {
  it('computes deterministic hash for component content', () => {
    const comp = {
      id: 'c1',
      name: 'AuthService',
      type: 'class',
      language: 'ts',
      filePath: '/src/auth.ts',
      location: { startLine: 1, endLine: 10, startColumn: 0, endColumn: 0 },
      code: 'class AuthService { login() {} }',
      metadata: { version: 1 }
    } as any;
    const h1 = computeComponentContentHash(comp);
    const h2 = computeComponentContentHash({ ...comp });
    expect(h1).toBe(h2);
  });
});

