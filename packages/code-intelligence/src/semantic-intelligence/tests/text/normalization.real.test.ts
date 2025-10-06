import { describe, it, expect } from '@jest/globals';
import {
  normalizeText,
  ENGLISH_STOP_WORDS,
  extractTextFromHtml,
  normalizeWhitespace,
  cleanPunctuation,
  expandContractions,
} from '../../text/normalization.js';

describe('text/normalization (real)', () => {
  it('normalizes text: removes urls, punctuation, numbers, trims', () => {
    const s = 'Visit https://example.com NOW!!! Version 2.0';
    const out = normalizeText(s, { removePunctuation: true, removeNumbers: true });
    expect(out).not.toMatch(/https?:/);
    expect(out).not.toMatch(/\d/);
    expect(out).toBe(out.trim());
  });

  it('removes stop words when configured', () => {
    const out = normalizeText('this is the Best Feature', { removeStopWords: true, stopWords: ENGLISH_STOP_WORDS });
    expect(out).toEqual(expect.not.stringContaining('the'));
  });

  it('extracts text from html (script/style stripped, br/p/div normalized)', () => {
    const html = '<style>.c{}</style><p>Hello<br/>World</p><script>var x=1</script>'; 
    const txt = extractTextFromHtml(html);
    expect(txt).toMatch(/Hello/);
    expect(txt).toMatch(/World/);
    expect(txt).not.toMatch(/var x/);
  });

  it('normalizes whitespace preserving newlines or flattening', () => {
    const raw = 'Line1\n\n   Line2   with   spaces\n';
    const keep = normalizeWhitespace(raw, true);
    expect(keep).toMatch(/Line1\n\nLine2 with spaces/);
    const flat = normalizeWhitespace(raw, false);
    expect(flat).toBe('Line1 Line2 with spaces');
  });

  it('cleans punctuation and expands contractions', () => {
    const cleaned = cleanPunctuation('Hello!!!world?');
    expect(cleaned).toBe('Hello! world');
    const expanded = expandContractions("it's what I'm doing and can't stop");
    expect(expanded).toMatch(/it is/);
    expect(expanded).toMatch(/am/);
    expect(expanded).toMatch(/cannot/);
  });
});
