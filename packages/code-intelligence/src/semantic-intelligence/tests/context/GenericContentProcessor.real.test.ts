import { describe, it, expect } from '@jest/globals';
import { GenericContentProcessor } from '../../context/processors/GenericContentProcessor.js';

describe('GenericContentProcessor (real)', () => {
  const processor = new GenericContentProcessor();

  it('estimates tokens and reduces generic content', () => {
    const item: any = {
      id: 'gen',
      type: 'unknown',
      name: 'X',
      content: 'x'.repeat(1000),
      metadata: { description: 'y'.repeat(200) }
    };
    const tokens = processor.estimateTokens(item);
    expect(tokens).toBeGreaterThan(0);
    const reduced = processor.reduceContent(item, 0.5);
    expect((reduced.content?.length || 0)).toBeLessThanOrEqual(item.content.length);
  });
});

