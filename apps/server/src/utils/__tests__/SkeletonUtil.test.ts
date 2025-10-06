import { describe, it, expect } from '@jest/globals';
import { makeSkeletonTextForComponent } from '../SkeletonUtil';

describe('SkeletonUtil.makeSkeletonTextForComponent', () => {
  it('returns formatted skeleton for class and header for function', async () => {
    const indexer: any = {
      getComponentsByFile: async (_: string) => [
        { id: 'f1', name: 'file-a', type: 'file', filePath: '/a.ts' },
        { id: 'c1', name: 'AuthService', type: 'class', filePath: '/a.ts', location: { startLine: 1, endLine: 10 } },
      ],
    };

    const cls = { id: 'c1', name: 'AuthService', type: 'class', filePath: '/a.ts', location: { startLine: 1, endLine: 10 } } as any;
    const sk = await makeSkeletonTextForComponent(indexer, cls);
    expect(typeof sk).toBe('string');
    expect(sk.toLowerCase()).toContain('authservice');

    const fn = { id: 'm1', name: 'doWork', type: 'function', filePath: '/a.ts', location: { startLine: 3, endLine: 4 } } as any;
    const header = await makeSkeletonTextForComponent(indexer, fn);
    expect(header).toMatch(/FUNCTION doWork/i);
  });
});

