import { describe, it, expect } from '@jest/globals';
import {
  tokenize,
  createNGrams,
  createCharNGrams,
  subwordTokenize,
  getTokenFrequencies,
  getTopTokens,
  estimateTokenCount,
} from '../../text/tokenization.js';

describe('text/tokenization (real)', () => {
  it('tokenizes with default normalization', () => {
    const tokens = tokenize('The quick brown fox jumps over the lazy dog');
    expect(tokens).toEqual(expect.arrayContaining(['quick', 'brown', 'fox']));
  });

  it('creates word and char n-grams', () => {
    const tokens = ['auth', 'token', 'login'];
    const bigrams = createNGrams(tokens, 2);
    expect(bigrams).toEqual(expect.arrayContaining(['auth token', 'token login']));
    const chars = createCharNGrams('abcde', 3);
    expect(chars).toContain('abc');
  });

  it('does basic BPE-like subword tokenization with vocab constraints', () => {
    const vocab = new Set(['auth', 'token', 'ization', 'login', 'log', 'in']);
    const sub = subwordTokenize('authorization login', vocab, 10);
    expect(sub.join(' ')).toMatch(/auth|ization|login|log|in/);
  });

  it('computes token frequencies and top tokens', () => {
    const freq = getTokenFrequencies(['a', 'b', 'a', 'c', 'b', 'a']);
    expect(freq.get('a')).toBe(3);
    const top2 = getTopTokens(['a', 'b', 'a', 'c', 'b', 'a'], 2);
    expect(top2[0][0]).toBe('a');
  });

  it('estimates token count for models', () => {
    expect(estimateTokenCount('hello world', 'gpt')).toBeGreaterThan(0);
    expect(estimateTokenCount('hello world', 'bert')).toBeGreaterThan(0);
    expect(estimateTokenCount('hello world', 'char')).toBe(11);
  });
});
