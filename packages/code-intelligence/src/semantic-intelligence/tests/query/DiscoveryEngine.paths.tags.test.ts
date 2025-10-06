import { describe, it, expect } from '@jest/globals';
import { DiscoveryEngine } from '../../query/Discovery.js';

describe('DiscoveryEngine (paths and tags)', () => {
  it('derives concepts from file paths and tags with weighting', async () => {
    const engine = new DiscoveryEngine();
    const items = [
      {
        id: '1',
        name: 'UserController',
        filePath: '/src/controllers/user-controller.ts',
        metadata: { tags: ['http', 'rest-api'] },
        similarity: 0.9,
      },
      {
        id: '2',
        name: 'AuthMiddleware',
        filePath: '/src/middleware/auth-middleware.ts',
        metadata: { tags: ['auth', 'security'] },
        similarity: 0.8,
      },
    ] as any[];

    const res = await engine.discover('auth', items, { expandQuery: false, maxRelatedConcepts: 10 });
    // Expect path-derived concepts (e.g., controllers, middleware) and tag-derived ones
    const concepts = new Set(res.relatedConcepts);
    expect(concepts.size).toBeGreaterThan(0);
    expect(Array.from(concepts).join(' ')).toMatch(/controller|middleware|security|http/);
  });
});

