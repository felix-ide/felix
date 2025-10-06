import { describe, it, expect } from '@jest/globals';
import { DiscoveryEngine } from '../../query/Discovery.js';

describe('DiscoveryEngine (real, heuristic)', () => {
  it('suggests terms and related concepts from items', async () => {
    const engine = new DiscoveryEngine();
    const items = [
      { name: 'Authentication', type: 'domain', similarity: 0.9 },
      { name: 'Login', type: 'action', similarity: 0.8 },
      { name: 'Token', type: 'entity', similarity: 0.7 },
      { name: 'Auth', type: 'alias', similarity: 0.6 },
    ] as any[];
    const res = await engine.discover('auth login', items, { maxSuggestedTerms: 5, maxRelatedConcepts: 5 } as any);
    expect(res.suggestedTerms.length).toBeGreaterThan(0);
    expect(res.relatedConcepts).toEqual(expect.any(Array));
    expect(res.suggestedTerms.map(t => t.term)).toEqual(expect.not.arrayContaining(['auth login']));
  });
});
