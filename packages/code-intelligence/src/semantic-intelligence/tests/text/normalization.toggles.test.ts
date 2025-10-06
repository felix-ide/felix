import { describe, it, expect } from '@jest/globals';
import { normalizeText, extractTextFromHtml } from '../../text/normalization.js';

describe('text/normalization (toggles)', () => {
  it('can remove emails and optionally keep URLs', () => {
    const input = 'Contact me at a.b+test@mail.example.com and see https://example.com/path';
    const keepUrls = normalizeText(input, { removeEmails: true, removeUrls: false, lowercase: false, trimWhitespace: true });
    expect(keepUrls).not.toMatch(/mail\.example\.com/);
    expect(keepUrls).toMatch(/https:\/\/example\.com/);
  });

  it('removes markdown code blocks and applies custom replacements', () => {
    const input = '```js\nconst x=1;\n``` Inline `code` too.';
    const out = normalizeText(input, { lowercase: false, removeCodeBlocks: true, customReplacements: [{ pattern: /inline/gi, replacement: 'INLINE' }] });
    expect(out).not.toMatch(/const x=1/);
    expect(out).toMatch(/INLINE/);
  });

  it('decodes entities when extracting text from HTML', () => {
    const html = '<p>&copy; 2024 &amp; <strong>Test</strong></p>';
    const text = extractTextFromHtml(html);
    expect(text).toMatch(/© 2024 & Test/);
  });
});
