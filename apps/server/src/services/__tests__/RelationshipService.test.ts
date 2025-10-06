import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { IRelationship } from '@felix/code-intelligence';
import { RelationshipService } from '../../features/relationships/services/RelationshipService.js';

type Patch = { id: string; resolved_target_id?: string | null; resolved_source_id?: string | null; metadata?: any };

function makeRel(partial: Partial<IRelationship>): IRelationship {
  return {
    id: partial.id || `rel_${Math.random().toString(36).slice(2)}`,
    sourceId: partial.sourceId || 'sourceA',
    targetId: partial.targetId || 'targetB',
    type: partial.type || 'imports',
    metadata: partial.metadata || {},
  } as any;
}

describe('RelationshipService.resolveCrossFileRelationships', () => {
  let patches: Patch[];
  let service: RelationshipService;

  beforeEach(() => {
    patches = [];

    // Minimal component repo mock
    const componentRepo = {
      storeComponent: jest.fn().mockResolvedValue({ success: true }),
      getComponent: jest.fn(async (id: string) => {
        // Return a fake TS source component for all ids
        return { id, filePath: '/tmp/project/src/a.ts', language: 'TypeScript', type: 'function' } as any;
      }),
      searchComponents: jest.fn(async (criteria: any) => {
        if (criteria && criteria.filePath === '/tmp/project/src/utils.ts') {
          return { items: [{ id: 'util1' }], total: 1 } as any;
        }
        if (criteria && criteria.name === 'lodash') {
          return { items: [], total: 0 } as any;
        }
        return { items: [], total: 0 } as any;
      }),
      getComponentIdsByNames: jest.fn(async () => new Map()),
      getComponentIdsByFilePaths: jest.fn(async () => new Map()),
    };

    const relationshipRepo = {
      ensureIndexes: jest.fn().mockResolvedValue(undefined),
      getUnresolvedTargets: jest.fn(async () => {
        return [
          // 1) Junk token → skippedJunk
          makeRel({
            id: 'junk1',
            metadata: { specifier: `junk token\n file:/tmp/irrelevant` },
            targetId: 'RESOLVE:{ something } file:/tmp/irrelevant',
          }),
          // 2) Bare npm module → external upsert + patch
          makeRel({
            id: 'bare1',
            metadata: { specifier: 'lodash' },
            targetId: 'RESOLVE:lodash',
          }),
          // 3) Resolved relative path in metadata → direct file fast path
          makeRel({
            id: 'path1',
            metadata: { specifier: './utils', resolvedPath: '/tmp/project/src/utils.ts' },
            targetId: 'RESOLVE:./utils',
          }),
        ];
      }),
      getUnresolvedSources: jest.fn(async () => {
        return [
          // 4) External source stays external (no patch)
          makeRel({ id: 'extSrc1', sourceId: 'EXTERNAL:../../../prettify.js' }),
        ];
      }),
      updateRelationshipsBulk: jest.fn(async (p: Patch[]) => {
        patches.push(...p);
        return { success: true } as any;
      }),
    };

    const db = {
      getProjectPath: () => '/tmp/project',
      getComponentRepository: () => componentRepo,
      getRelationshipRepository: () => relationshipRepo,
      runWrite: async (fn: any) => fn(),
    } as any;

    service = new RelationshipService(db as any);
  });

  it('resolves targets, classifies junk, and upserts externals', async () => {
    await service.resolveCrossFileRelationships();

    // We expect at least two patches: one for bare1 (external) and one for path1 (file resolution)
    const byId = Object.groupBy(patches, (p) => p.id);

    // junk1: sanitize drops trailing file:... and becomes a bare token → external module
    expect(byId['junk1']?.[0]).toMatchObject({
      id: 'junk1',
      metadata: expect.objectContaining({ isExternal: true }),
      resolved_target_id: expect.stringMatching(/^external:module:npm:/),
    });

    // bare1 should be resolved to an external module id
    expect(byId['bare1']?.[0]).toMatchObject({
      id: 'bare1',
      metadata: expect.objectContaining({ isExternal: true }),
      resolved_target_id: expect.stringContaining('external:module:npm:lodash'),
    });

    // path1 should resolve via filePath fast path
    expect(byId['path1']?.[0]).toMatchObject({ id: 'path1', resolved_target_id: 'util1' });
  });
});

describe('RelationshipService graph helpers', () => {
  it('builds neighbors and forward/reverse dependency lists', async () => {
    const relationshipRepo = {
      searchRelationships: jest.fn(async (c: any) => {
        if (c.sourceId === 'A') {
          return { items: [
            { id: 'r1', sourceId: 'A', targetId: 'B', type: 'imports' },
            { id: 'r2', sourceId: 'A', targetId: 'C', type: 'uses' },
          ] } as any;
        }
        if (c.targetId === 'A') {
          return { items: [
            { id: 'r3', sourceId: 'D', targetId: 'A', type: 'depends_on' },
          ] } as any;
        }
        return { items: [] } as any;
      }),
      getAllRelationships: jest.fn(async () => [
        { id: 'r1', sourceId: 'A', targetId: 'B', type: 'imports' },
        { id: 'r2', sourceId: 'A', targetId: 'C', type: 'uses' },
        { id: 'r3', sourceId: 'D', targetId: 'A', type: 'depends_on' },
        { id: 'r4', sourceId: 'X', targetId: 'Y', type: 'unrelated' },
      ]),
    } as any;
    const db = {
      getRelationshipRepository: () => relationshipRepo,
    } as any;
    const svc = new RelationshipService(db);

    const neighbors = await svc.getNeighbors('A');
    expect(new Set(neighbors)).toEqual(new Set(['B', 'C', 'D']));

    const forward = await svc.getForwardDependencies('A');
    expect(new Set(forward)).toEqual(new Set(['B', 'C']));

    const reverse = await svc.getReverseDependencies('A');
    expect(new Set(reverse)).toEqual(new Set(['D']));
  });
});
