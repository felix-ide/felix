import { describe, it, expect } from '@jest/globals';
import { QueryExpander } from '../../query/QueryExpander';

describe('QueryExpander (real)', () => {
  it('expands with synonyms and related concepts, deduped and limited', async () => {
    const qe = new QueryExpander();
    const res = await qe.expand('auth login function', { maxTerms: 5 });
    expect(res.originalQuery).toBe('auth login function');
    expect(res.suggestedTerms.length).toBeGreaterThan(0);
    // Should include typical synonyms/related terms
    const terms = res.suggestedTerms.map((t: any) => t.term);
    expect(terms).toEqual(Array.from(new Set(terms))); // deduped
    expect(res.expandedTerms.length).toBeLessThanOrEqual(5);
  });

  it('supports termFilter to exclude unwanted terms', async () => {
    const qe = new QueryExpander();
    const res = await qe.expand('api route', { termFilter: (t: string) => !t.includes('endpoint') });
    expect(res.suggestedTerms.find((t: any) => t.term.includes('endpoint'))).toBeFalsy();
  });
});
