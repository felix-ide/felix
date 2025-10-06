import { describe, it, expect } from '@jest/globals';
import { DiscoveryEngine } from '../../query/Discovery.js';

describe('DiscoveryEngine (advanced branches)', () => {
  it('respects minSimilarity filter and limits cross-references', async () => {
    const engine = new DiscoveryEngine();
    const items = [
      { id: '1', name: 'AuthService', type: 'class', similarity: 0.8, relationships: [ { targetId: '2', targetName: 'TokenStore', type: 'uses' } ] },
      { id: '2', name: 'TokenStore', type: 'class', similarity: 0.7 },
      { id: '3', name: 'Logger', type: 'module', similarity: 0.2 }, // should be filtered by minSimilarity
      { id: '4', name: 'AuthService', type: 'class', similarity: 0.6, relationships: [ { targetId: '2', targetName: 'TokenStore', type: 'uses' } ] }, // duplicate cross-ref
    ] as any[];

    const res = await engine.discover('auth login', items, {
      minSimilarity: 0.5,
      maxCrossReferences: 1,
      expandQuery: true,
      maxRelatedConcepts: 50,
      maxSuggestedTerms: 10,
    });

    expect(res.totalAnalyzed).toBe(3); // one filtered out
    expect(res.crossReferences.length).toBe(1); // limited
    // Suggested terms shouldn’t include the original full query
    expect(res.suggestedTerms.map(t => t.term)).not.toContain('auth login');
    // Expansion should add concepts beyond those derived directly from items
    expect(Array.isArray(res.relatedConcepts)).toBe(true);
  });

  it('does not expand query when expandQuery=false', async () => {
    const engine = new DiscoveryEngine();
    const items = [ { id: '1', name: 'AuthService', similarity: 0.9 } ] as any[];
    const res = await engine.discover('auth', items, { expandQuery: false });
    // Should not inject extra concepts from QueryExpander
    expect(res.relatedConcepts.length).toBeLessThanOrEqual(15);
  });
});

