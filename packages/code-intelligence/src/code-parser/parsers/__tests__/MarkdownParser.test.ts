import { readFileSync } from 'fs';
import { join } from 'path';
import { MarkdownParser } from '../MarkdownParser.js';

describe('MarkdownParser regressions', () => {
  const parser = new MarkdownParser();
  const fixturePath = join(__dirname, '__fixtures__', 'sample-doc.md');
  const content = readFileSync(fixturePath, 'utf-8');
  const filePath = 'docs/sample-doc.md';

  it('extracts expected component kinds', () => {
    const components = parser.detectComponents(content, filePath);
    const types = components.reduce<Record<string, number>>((acc, comp) => {
      acc[comp.type] = (acc[comp.type] ?? 0) + 1;
      return acc;
    }, {});

    expect(types['file']).toBe(1);
    expect(types['section']).toBe(6);
    expect(types['function']).toBe(3);
    expect(types['interface']).toBe(1);
    expect(types['variable']).toBe(1);
    expect(types['comment']).toBeGreaterThanOrEqual(4);
    expect(types['module']).toBe(1);
    expect(types['class']).toBe(1);
  });

  it('extracts expected relationships', () => {
    const components = parser.detectComponents(content, filePath);
    const relationships = parser.detectRelationships(components, content);

    const hasIndexContainment = relationships.some(rel =>
      rel.sourceId.includes('index-block') &&
      rel.type === 'contains'
    );

    const hasHeadingLinks = relationships.some(rel =>
      rel.type === 'references' &&
      rel.metadata?.relationship === 'link-references-section'
    );

    expect(hasIndexContainment).toBe(true);
    expect(hasHeadingLinks).toBe(true);
  });
});
