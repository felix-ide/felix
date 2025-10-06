const originalScopeFlag = process.env.FELIX_SCOPE_SCANNER;

describe('BlockScanner detectors fallback', () => {
  beforeAll(() => {
    process.env.FELIX_SCOPE_SCANNER = '0';
  });

  afterAll(() => {
    if (originalScopeFlag === undefined) {
      delete process.env.FELIX_SCOPE_SCANNER;
    } else {
      process.env.FELIX_SCOPE_SCANNER = originalScopeFlag;
    }
  });

  it('produces detector blocks for markdown fences', async () => {
    const { BlockScanner } = await import('../dist/code-parser/services/BlockScanner.js');
    const scanner = BlockScanner.getInstance();
    const markdown = ['# Notes', '', '```js', 'console.log("hello");', '```'].join('\n');

    const result = await scanner.scanFile('sample.md', markdown);

    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.metadata.backend).toBe('detectors-only');
    expect(result.blocks[0].language).toBe('javascript');
  });
});
