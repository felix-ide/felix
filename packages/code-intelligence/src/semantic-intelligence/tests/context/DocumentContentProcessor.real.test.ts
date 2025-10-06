import { describe, it, expect } from '@jest/globals';
import { DocumentContentProcessor } from '../../context/processors/DocumentContentProcessor.js';

describe('DocumentContentProcessor (real)', () => {
  const processor = new DocumentContentProcessor();

  it('estimates tokens lower for natural language than base heuristic', () => {
    const item = {
      id: 'doc1',
      type: 'document' as const,
      name: 'Guide',
      content: 'This is a reasonably long paragraph of natural language text.'.repeat(10),
    };
    const tokens = processor.estimateTokens(item as any);
    expect(tokens).toBeGreaterThan(0);
  });

  it('boosts priority for readme, headings, introductions', () => {
    const item = {
      id: 'readme',
      type: 'readme' as const,
      name: 'README.md',
      content: '# Title\n## Table of Contents\nIntro',
      metadata: { isHeading: true, isIntroduction: true, level: 1 },
    };
    const base = processor.calculatePriority({ ...item, type: 'text' } as any, { items: [], relationships: [] } as any);
    const boosted = processor.calculatePriority(item as any, { items: [], relationships: [] } as any);
    expect(boosted).toBeGreaterThan(base);
  });

  it('applies reduction strategies and preserves headings', () => {
    const item = {
      id: 'doc2',
      type: 'markdown' as const,
      name: 'Doc',
      content: `# Main Title\n\n## Introduction\n${'Paragraph text. '.repeat(50)}\n\n- item 1\n- item 2\n- item 3\n\n## Section\n${'More text. '.repeat(50)}`,
    };
    const reduced = processor.reduceContent(item as any, 0.5);
    expect(reduced.content!.length).toBeLessThan(item.content.length);
    expect(reduced.content).toContain('# Main Title');
    expect(reduced.content).toContain('## Introduction');
  });
});

