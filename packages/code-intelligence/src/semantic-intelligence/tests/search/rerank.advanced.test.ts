import { describe, it, expect } from '@jest/globals';
import { rerankResults, cosineSimilarity } from '../../search/similarity.js';

describe('rerankResults (advanced factors)', () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const results = [
    {
      id: 'comp-1',
      type: 'component' as any,
      name: 'AuthService',
      similarity: 0.5,
      embedding: [1, 0, 0],
      metadata: {
        title: 'Auth Service',
        description: 'Handles login and token issuance',
        tags: ['auth', 'security'],
        lastModified: new Date(now - 2 * day).toISOString(),
        usageCount: 10,
        popularity: 0.3,
      },
      relationships: [
        { type: 'uses', targetId: 'lib-1' },
        { type: 'calls', targetId: 'comp-2' },
      ],
    },
    {
      id: 'rule-1',
      type: 'rule' as any,
      name: 'TokenPolicy',
      similarity: 0.4,
      embedding: [0.9, 0.1, 0],
      metadata: {
        title: 'Token Policy',
        description: 'Guideline for token lifetimes',
        tags: ['policy'],
        lastModified: new Date(now - 10 * day).toISOString(),
        usageCount: 2,
        popularity: 0.1,
      },
      relationships: [
        { type: 'references', targetId: 'doc-1' },
      ],
    },
  ];

  it('applies semantic, name, content, tag, relationship, temporal, popularity and returns debug breakdown', () => {
    const reranked = rerankResults(results, { text: 'auth token', embedding: [1, 0, 0], terms: ['auth','token'] }, {
      mode: 'additive',
      baseScore: 'zero',
      factors: {
        semantic: { enabled: true, weight: 1.0, useExisting: false },
        nameMatch: {
          enabled: true,
          exactBoost: 2,
          partialBoost: 1.5,
          fuzzyBoost: 1.0,
          entityBoosts: { component: 1.2 },
        },
        contentMatch: {
          enabled: true,
          exactBoost: 1.0,
          partialBoost: 0.5,
          fieldBoosts: { description: 1.2, documentation: 1.1 },
        },
        tagMatch: { enabled: true, boost: 0.5, tagWeights: { auth: 2 } },
        relationship: { enabled: true, boostPerRelation: 0.2, maxBoost: 0.5, typeWeights: { uses: 2 } },
        temporal: { enabled: true, timeWindow: 30, recencyBoost: 1.0, decayFunction: 'linear' },
        popularity: { enabled: true, usageWeight: 0.01, popularityWeight: 1.0, normalization: 'log' },
      },
      debug: true,
    });

    expect(reranked[0].finalScore).toBeGreaterThan(0); // baseScore zero, factors add up
    expect(reranked[0].scoreBreakdown).toBeDefined();
    expect(reranked[0].scoreBreakdown!.semantic).toBeGreaterThanOrEqual(0);
    expect(reranked[0].scoreBreakdown!.nameMatch).toBeGreaterThanOrEqual(0);
    expect(reranked[0].scoreBreakdown!.contentMatch).toBeGreaterThanOrEqual(0);
    expect(reranked[0].scoreBreakdown!.tagMatch).toBeGreaterThanOrEqual(0);
    expect(reranked[0].scoreBreakdown!.relationship).toBeGreaterThanOrEqual(0);
    expect(reranked[0].scoreBreakdown!.temporal).toBeGreaterThanOrEqual(0);
    expect(reranked[0].scoreBreakdown!.popularity).toBeGreaterThanOrEqual(0);
  });

  it('supports numeric baseScore and weighted semantic mode', () => {
    const reranked = rerankResults(results, { text: 'policy', embedding: [1, 0, 0] }, {
      mode: 'weighted',
      baseScore: 0.25,
      factors: {
        semantic: { enabled: true, weight: 0.5, useExisting: true },
        nameMatch: { enabled: true, exactBoost: 1, partialBoost: 0.5, fuzzyBoost: 0.2 },
      },
      debug: true,
    });
    expect(reranked[0].finalScore).toBeGreaterThanOrEqual(0.25);
    expect(reranked[0].scoreBreakdown!.semantic).toBeGreaterThanOrEqual(0);
  });

  it('exercises temporal decay variants', () => {
    const common = { text: 'x' } as const;
    const base = { mode: 'additive', baseScore: 'zero', factors: {} } as any;
    const linear = rerankResults(results, common, { ...base, factors: { temporal: { enabled: true, timeWindow: 30, recencyBoost: 1.0, decayFunction: 'linear' } } });
    const exp = rerankResults(results, common, { ...base, factors: { temporal: { enabled: true, timeWindow: 30, recencyBoost: 1.0, decayFunction: 'exponential' } } });
    const log = rerankResults(results, common, { ...base, factors: { temporal: { enabled: true, timeWindow: 30, recencyBoost: 1.0, decayFunction: 'log' } } });
    expect(linear[0].finalScore).toBeDefined();
    expect(exp[0].finalScore).toBeDefined();
    expect(log[0].finalScore).toBeDefined();
  });
});
