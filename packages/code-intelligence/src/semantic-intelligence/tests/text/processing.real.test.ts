import { describe, it, expect } from '@jest/globals';
import {
  extractWordsFromIdentifier,
  extractWordsFromText,
  extractConceptsFromPath,
  isCommonWord,
  extractKeyTerms,
  generateNGrams,
  TextSimilarity,
} from '../../text/processing.js';

describe('text/processing (real)', () => {
  it('splits identifiers and filters common words', () => {
    expect(extractWordsFromIdentifier('getUserID')).toEqual(['get', 'user', 'id']);
    const words = extractWordsFromText('The quick brown fox jumps over the lazy dog', { filterCommonWords: true });
    expect(words).toContain('quick');
    expect(words).not.toContain('the');
    expect(isCommonWord('the')).toBe(true);
  });

  it('extracts concepts from paths', () => {
    const concepts = extractConceptsFromPath('src/services/user/profile_service.ts');
    expect(concepts).toEqual(expect.arrayContaining(['services', 'user', 'profile', 'service']));
  });

  it('extracts key terms and generates n-grams', () => {
    const terms = extractKeyTerms('Auth login service authenticates user login requests');
    expect(terms.size).toBeGreaterThan(0);
    const trigrams = generateNGrams('context', 3);
    expect(trigrams).toContain('con');
  });

  it('computes cosine similarity and top matches', () => {
    const sim = TextSimilarity.jaccard(['auth', 'login', 'token'], ['auth', 'token']);
    expect(sim).toBeGreaterThan(0);
  });
});
