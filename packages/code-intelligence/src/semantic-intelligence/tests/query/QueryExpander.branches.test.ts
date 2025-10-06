import { describe, it, expect } from '@jest/globals';
import { QueryExpander } from '../../query/QueryExpander.js';

describe('QueryExpander (branches)', () => {
  it('extracts terms from identifiers and applies termFilter', async () => {
    const qe = new QueryExpander();
    const res = await qe.expand('parseFile loginHandler, API', {
      maxTerms: 50,
      includeSynonyms: true,
      includeRelatedConcepts: true,
      termFilter: (t) => t !== 'login',
    });
    // camelCase should split
    expect(res.originalQuery).toBe('parseFile loginHandler, API');
    // Ensure we got some suggestions but filtered one
    expect(res.suggestedTerms.length).toBeGreaterThan(0);
    expect(res.suggestedTerms.find(t => t.term === 'login')).toBeFalsy();
  });

  it('can disable synonyms and related concepts', async () => {
    const qe = new QueryExpander();
    const res = await qe.expand('auth', { includeSynonyms: false, includeRelatedConcepts: false, maxTerms: 10 });
    expect(res.suggestedTerms.length).toBe(0); // no synonyms, no concepts, no embeddings
    expect(res.expandedTerms.length).toBe(0);
  });
});

