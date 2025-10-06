import { describe, it, expect } from '@jest/globals';
import { tokenize, createNGrams } from '../../text/tokenization.js';

describe('text/tokenization (options)', () => {
  it('tokenizes by sentence and respects lowercase/removePunctuation', () => {
    const sentences = tokenize('Dr. Smith went home. Then he slept!', { method: 'sentence' });
    expect(sentences.length).toBe(2);
    const words = tokenize('End-to-end Testing!', { method: 'word', lowercase: true, removePunctuation: true });
    expect(words).toEqual(expect.arrayContaining(['end-to-end'.replace(/[^\w-]/g, '')]));
  });

  it('custom tokenizer requires function and length filters apply', () => {
    expect(() => tokenize('x y z', { method: 'custom' as any })).toThrow();
    const custom = tokenize('a bb ccc dddd', { method: 'custom', customTokenizer: (t) => t.split(/\s+/), minTokenLength: 3, maxTokenLength: 3 });
    expect(custom).toEqual(['ccc']);
  });

  it('keepHyphenated controls splitting', () => {
    const kept = tokenize('end-to-end e2e', { keepHyphenated: true });
    expect(kept).toEqual(expect.arrayContaining(['end-to-end']));
    const split = tokenize('end-to-end e2e', { keepHyphenated: false });
    // when not keeping hyphens, tokens split on word boundaries
    expect(split.join(' ')).toMatch(/end to end/);
  });

  it('createNGrams throws for invalid n', () => {
    expect(() => createNGrams(['a','b'], 0)).toThrow();
  });
});

