import { describe, it, expect } from '@jest/globals';
import { RelationshipService } from '../../features/relationships/services/RelationshipService';

describe('RelationshipService graph helpers', () => {
  it('builds dependency graph and finds cycles', async () => {
    const fakeRepo = {
      getAllRelationships: jest.fn(async () => ([
        { id: 'r1', type: 'imports', sourceId: 'A', targetId: 'B' },
        { id: 'r2', type: 'uses',    sourceId: 'B', targetId: 'C' },
        { id: 'r3', type: 'imports', sourceId: 'C', targetId: 'A' }, // cycle A->B->C->A
        { id: 'r4', type: 'mentions', sourceId: 'X', targetId: 'Y' }, // ignored type
      ])),
      searchRelationships: jest.fn(async (_: any) => ({ items: [], total: 0 }))
    } as any;
    const fakeDb = { getRelationshipRepository: () => fakeRepo } as any;
    const svc = new RelationshipService(fakeDb);

    const graph = await svc.buildDependencyGraph();
    expect(graph.get('A')).toEqual(['B']);
    expect(graph.get('B')).toEqual(['C']);

    const cycles = await svc.findCircularDependencies();
    // One cycle reported containing A->B->C->A
    expect(cycles.some(cyc => cyc.join('>') === 'A>B>C>A')).toBe(true);
  });
});

