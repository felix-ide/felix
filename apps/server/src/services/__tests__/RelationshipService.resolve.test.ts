import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RelationshipService } from '../../features/relationships/services/RelationshipService';
import { CrossFileRelationshipResolver } from '../../features/relationships/CrossFileRelationshipResolver';
import { ResolutionContext } from '../../features/relationships/resolver/ResolutionContext';
// Mock fs.existsSync selectively for the resolver behavior
jest.mock('fs', () => {
  const actual = jest.requireActual('fs') as any;
  const allow = new Set<string>([
    '/proj/src/foo.ts',
    '/proj/src/bar.ts',
    '/proj/src/index.ts',
    '/proj/src/target.ts'
  ]);
  return {
    ...actual,
    existsSync: (p: any) => allow.has(String(p)),
  };
});
import * as fs from 'fs';

describe('RelationshipService resolveCrossFileRelationships', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves RESOLVE: path targets to component ids and RESOLVE: sources to ids', async () => {
    const patches: any[] = [];

    const relNeedingTarget = {
      id: 'rel-target-1',
      sourceId: 'comp-src',
      targetId: 'RESOLVE:./foo.js',
      type: 'imports',
      metadata: { specifier: './foo.js', importKind: 'named', importedName: 'Foo' },
    } as any;

    const relNeedingSource = {
      id: 'rel-source-1',
      sourceId: 'RESOLVE:./bar.ts',
      targetId: 'comp-target',
      type: 'uses',
      metadata: { specifier: './bar.ts' },
    } as any;

    const fakeRelRepo = {
      ensureIndexes: jest.fn().mockResolvedValue(undefined),
      getUnresolvedTargets: jest.fn().mockResolvedValue([relNeedingTarget]),
      getUnresolvedSources: jest.fn().mockResolvedValue([relNeedingSource]),
      updateRelationshipsBulk: jest.fn(async (arr: any[]) => { patches.push(...arr); }),
    } as any;

    const fakeCompRepo = {
      searchComponents: jest.fn(async (criteria: any) => {
        if (criteria.filePath && String(criteria.filePath).includes('foo.ts')) {
          return { items: [{ id: 'comp-foo' }] };
        }
        if (criteria.filePath && String(criteria.filePath).includes('bar.ts')) {
          return { items: [{ id: 'comp-bar' }] };
        }
        if (criteria.name) {
          return { items: [{ id: 'by-name' }] };
        }
        return { items: [] };
      }),
      getComponent: jest.fn(async (id: string) => {
        if (id === 'comp-src') return { id, filePath: '/proj/src/index.ts', language: 'typescript' };
        if (id === 'comp-target') return { id, filePath: '/proj/src/target.ts', language: 'typescript' };
        return null;
      }),
      getComponentIdsByNames: jest.fn(async (_: string[]) => new Map()),
      getComponentIdsByFilePaths: jest.fn(async (_: string[]) => new Map()),
    } as any;

    const db = {
      getRelationshipRepository: () => fakeRelRepo,
      getComponentRepository: () => fakeCompRepo,
      getProjectPath: () => '/proj',
      runWrite: async (fn: any) => { await fn(); },
    } as any;

    // fs.existsSync is mocked above; nothing to do here

    const svc = new RelationshipService(db);
    await svc.resolveCrossFileRelationships();

    // Should flush patches for both target and source
    expect(patches.some(p => p.id === 'rel-target-1' && p.resolved_target_id === 'comp-foo')).toBe(true);
    expect(patches.some(p => p.id === 'rel-source-1' && p.resolved_source_id === 'comp-bar')).toBe(true);
  });

  it('handles bare TS imports as external modules, PHP namespaces as composer, and EXTERNAL: sources to internal', async () => {
    const patches: any[] = [];
    const relBareTs = { id: 'rel-bare-ts', sourceId: 'ts-src', targetId: 'lodash', type: 'imports', metadata: { specifier: 'lodash', importKind: 'named' } } as any;
    const relNsPhp = { id: 'rel-ns-php', sourceId: 'php-src', targetId: 'Composer\\Http', type: 'imports', metadata: { specifier: 'Composer\\Http', importKind: 'namespace' } } as any;
    const relSrcExternal = { id: 'rel-src-ext', sourceId: 'EXTERNAL:../../../prettify.js', targetId: 'tX', type: 'uses', metadata: {} } as any;

    const fakeRelRepo = {
      ensureIndexes: jest.fn().mockResolvedValue(undefined),
      getUnresolvedTargets: jest.fn().mockResolvedValue([relBareTs, relNsPhp]),
      getUnresolvedSources: jest.fn().mockResolvedValue([relSrcExternal]),
      updateRelationshipsBulk: jest.fn(async (arr: any[]) => { patches.push(...arr); }),
    } as any;

    const fakeCompRepo = {
      searchComponents: jest.fn(async (criteria: any) => {
        if (criteria.name && String(criteria.name).toLowerCase().includes('prettify')) {
          return { items: [{ id: 'comp-prettify' }] };
        }
        return { items: [] };
      }),
      getComponent: jest.fn(async (id: string) => {
        if (id === 'ts-src') return { id, filePath: '/proj/src/a.ts', language: 'typescript' };
        if (id === 'php-src') return { id, filePath: '/proj/src/a.php', language: 'php' };
        if (id === 'tX') return { id, filePath: '/proj/src/x.ts', language: 'typescript' };
        return null;
      }),
      getComponentIdsByNames: jest.fn(async (_: string[]) => new Map()),
      getComponentIdsByFilePaths: jest.fn(async (_: string[]) => new Map()),
      storeComponent: jest.fn(async () => undefined),
    } as any;

    const db = {
      getRelationshipRepository: () => fakeRelRepo,
      getComponentRepository: () => fakeCompRepo,
      getProjectPath: () => '/proj',
      runWrite: async (fn: any) => { await fn(); },
    } as any;

    // Force composer resolver to return null so it marks as external composer module
    jest.spyOn(ResolutionContext.prototype as any, 'getComposerResolver').mockReturnValue({
      resolveNamespace: (_: string) => null
    });

    const svc = new RelationshipService(db);
    await svc.resolveCrossFileRelationships();

    // bare TS import should be marked external npm module
    const pBare = patches.find(p => p.id === 'rel-bare-ts');
    expect(pBare).toBeTruthy();
    expect(String(pBare.resolved_target_id || '')).toMatch(/^external:module:npm:lodash$/);
    expect(pBare.metadata.isExternal).toBe(true);

    // PHP namespace should be marked as composer external
    const pPhp = patches.find(p => p.id === 'rel-ns-php');
    expect(pPhp).toBeTruthy();
    expect(String(pPhp.resolved_target_id || '')).toMatch(/^external:module:composer:/);
    expect(pPhp.metadata.isExternal).toBe(true);

    // EXTERNAL: source resolved to internal comp by name
    const pSrc = patches.find(p => p.id === 'rel-src-ext');
    expect(pSrc).toBeTruthy();
    expect(pSrc.resolved_source_id).toBe('comp-prettify');
  });

  // Additional TS internal mapping path left for a future PR once resolver behavior is stabilized
});
