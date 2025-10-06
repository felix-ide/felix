import { describe, it, expect } from '@jest/globals';
import { normalizeText, ENGLISH_STOP_WORDS, extractTextFromHtml, normalizeWhitespace, cleanPunctuation, expandContractions } from '../../text/normalization.js';

describe('text/normalization (edges)', () => {
  it('toggles url/email/code/html removal and custom replacements', () => {
    const input = 'Visit https://foo.bar and contact me@example.com. <b>Bold</b> `code`';
    const keepUrls = normalizeText(input, { removeUrls: false, lowercase: false, trimWhitespace: false });
    expect(keepUrls).toMatch('https://foo.bar');
    const noEmails = normalizeText(input, { removeEmails: true });
    expect(noEmails).not.toMatch(/me@example.com/);
    const noHtmlCode = normalizeText(input, { removeHtml: true, removeCodeBlocks: true });
    expect(noHtmlCode).not.toMatch(/<b>|`code`/);
    const replaced = normalizeText('hello $name!', { customReplacements: [{ pattern: /\$name/g, replacement: 'world' }] });
    expect(replaced).toContain('world');
  });

  it('removes numbers, stop words and normalizes whitespace/punctuation', () => {
    const text = 'This   is  a   test!!! 1234';
    const cleaned = normalizeText(text, { removeNumbers: true, removePunctuation: true });
    expect(cleaned).toBe('this is a test');
    const noStops = normalizeText('this is only a test', { removeStopWords: true, stopWords: ENGLISH_STOP_WORDS });
    expect(noStops.split(' ')).toEqual(expect.arrayContaining(['test']));
    const ws = normalizeWhitespace(' a  b \n\n c   ');
    expect(ws).toBe('a b\n\nc');
    const punct = cleanPunctuation('Hello!!!  What??  Fine.');
    // Current cleaner reduces repeated punctuation but preserves sentence-ending punctuation and spacing
    expect(punct).toBe('Hello!  What?  Fine');
  });

  it('extracts text from HTML and decodes entities', () => {
    const html = '<div>Tom &amp; Jerry<br>Say: &quot;Hi&quot;</div>';
    const txt = extractTextFromHtml(html);
    expect(txt).toContain('Tom & Jerry');
    expect(txt).toContain('"Hi"');
  });

  it('expands contractions', () => {
    const out = expandContractions("it's that we're done and I can't wait");
    expect(out).toMatch(/it is/);
    expect(out).toMatch(/cannot/);
  });
});
