import { deepStrictEqual, ok } from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { MarkdownParser } from '../../dist/code-parser/parsers/MarkdownParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('MarkdownParser', () => {
  const parser = new MarkdownParser();
  const fixturePath = path.join(__dirname, 'fixtures', 'sample-doc.md');
  const content = readFileSync(fixturePath, 'utf-8');
  const filePath = 'docs/sample-doc.md';

  it('extracts structured components from documentation', () => {
    const components = parser.detectComponents(content, filePath);
    const byType = components.reduce<Record<string, number>>((acc, comp) => {
      acc[comp.type] = (acc[comp.type] ?? 0) + 1;
      return acc;
    }, {});

    deepStrictEqual(byType, {
      file: 2,
      section: 6,
      comment: 3,
      variable: 1,
      function: 2,
      constant: 1,
      interface: 1,
      module: 1,
      class: 2,
      import: 2
    });
  });

  it('tracks markdown relationships', () => {
    const components = parser.detectComponents(content, filePath);
    const relationships = parser.detectRelationships(components, content);

    const hasIndexContainment = relationships.some(rel =>
      rel.type === 'contains' && rel.sourceId.includes('index-block')
    );
    const hasHeadingLink = relationships.some(rel =>
      rel.type === 'references' && rel.metadata?.relationship === 'link-references-section'
    );

    ok(hasIndexContainment);
    ok(hasHeadingLink);
  });

  it('identifies blockquotes and index sections', () => {
    const components = parser.detectComponents(content, filePath);

    const blockquote = components.find(comp => comp.metadata?.isBlockquote);
    ok(blockquote, 'expected blockquote component');

    const indexSection = components.find(
      comp => comp.metadata?.isIndexSection && comp.metadata?.sectionName === 'FILE_PATHS'
    );
    ok(indexSection, 'expected FILE_PATHS index section');

    const indexEntries = components.filter(comp => comp.filePath === filePath && comp.id.includes('index-entry-'));
    ok(indexEntries.length > 0, 'expected index entries to be generated');

    const variableList = components.find(comp => comp.type === 'variable' && comp.id.includes('list-'));
    ok(variableList, 'expected list component to remain represented as variable');
  });
});
