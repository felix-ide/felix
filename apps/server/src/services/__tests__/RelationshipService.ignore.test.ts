import { describe, it, expect, jest } from '@jest/globals';
import { RelationshipService } from '../../features/relationships/services/RelationshipService';

// Mock fs.existsSync to always true for simplicity here
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return { ...actual, existsSync: (_: any) => true };
});

describe('RelationshipService ignore/junk classification', () => {
  it('skips ignored resolvedPath (coverage dir) without patching', async () => {
    const patches: any[] = [];
    const rel = { id: 'r-ign', sourceId: 's', targetId: 'RESOLVE:./coverage/skip.ts', type: 'imports', metadata: { specifier: './coverage/skip.ts' } } as any;
    const fakeRelRepo = {
      ensureIndexes: jest.fn().mockResolvedValue(undefined),
      getUnresolvedTargets: jest.fn().mockResolvedValue([rel]),
      getUnresolvedSources: jest.fn().mockResolvedValue([]),
      updateRelationshipsBulk: jest.fn(async (arr: any[]) => { patches.push(...arr); }),
    } as any;
    const fakeCompRepo = {
      getComponent: jest.fn(async (_: string) => ({ id: 's', filePath: '/proj/src/index.ts', language: 'typescript' })),
      searchComponents: jest.fn(async () => ({ items: [] })),
      getComponentIdsByNames: jest.fn(async () => new Map()),
      getComponentIdsByFilePaths: jest.fn(async () => new Map()),
    } as any;
    const db = {
      getRelationshipRepository: () => fakeRelRepo,
      getComponentRepository: () => fakeCompRepo,
      getProjectPath: () => '/proj',
      runWrite: async (fn: any) => { await fn(); },
    } as any;
    const svc = new RelationshipService(db);
    await svc.resolveCrossFileRelationships();
    expect(patches.length).toBe(0);
  });

  it('skips junk specifier tokens', async () => {
    const patches: any[] = [];
    const rel = { id: 'r-junk', sourceId: 's', targetId: 'RESOLVE:file:CodeIndexer.ts', type: 'imports', metadata: { specifier: 'file:CodeIndexer.ts' } } as any;
    const fakeRelRepo = {
      ensureIndexes: jest.fn().mockResolvedValue(undefined),
      getUnresolvedTargets: jest.fn().mockResolvedValue([rel]),
      getUnresolvedSources: jest.fn().mockResolvedValue([]),
      updateRelationshipsBulk: jest.fn(async (arr: any[]) => { patches.push(...arr); }),
    } as any;
    const fakeCompRepo = {
      getComponent: jest.fn(async (_: string) => ({ id: 's', filePath: '/proj/src/index.ts', language: 'typescript' })),
      searchComponents: jest.fn(async () => ({ items: [] })),
      getComponentIdsByNames: jest.fn(async () => new Map()),
      getComponentIdsByFilePaths: jest.fn(async () => new Map()),
    } as any;
    const db = {
      getRelationshipRepository: () => fakeRelRepo,
      getComponentRepository: () => fakeCompRepo,
      getProjectPath: () => '/proj',
      runWrite: async (fn: any) => { await fn(); },
    } as any;
    const svc = new RelationshipService(db);
    await svc.resolveCrossFileRelationships();
    expect(patches.length).toBe(0);
  });
});

