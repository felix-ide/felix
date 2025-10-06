import { deepStrictEqual, ok } from 'assert';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JavaScriptParser } from '../../dist/code-parser/parsers/JavaScriptParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('JavaScriptParser (TypeScript mode)', () => {
  const parser = new JavaScriptParser('typescript');
  const fixturePath = path.join(__dirname, 'fixtures', 'sample.ts');
  const content = readFileSync(fixturePath, 'utf8');
  const filePath = 'src/sample.ts';

  it('extracts core TypeScript structures', () => {
    const components = parser.detectComponents(content, filePath);
    const byType = components.reduce<Record<string, number>>((acc, comp) => {
      acc[comp.type] = (acc[comp.type] ?? 0) + 1;
      return acc;
    }, {});

    deepStrictEqual(byType, {
      file: 1,
      interface: 1,
      typedef: 1,
      enum: 1,
      class: 1,
      method: 1,
      function: 2,
      variable: 1
    });
  });

  it('tracks imports and containment relationships', () => {
    const components = parser.detectComponents(content, filePath);
    const relationships = parser.detectRelationships(components, content);

    const hasStoreImport = relationships.some(rel =>
      rel.type === 'imports_from' && rel.targetId === 'RESOLVE:./stores/GraphStore'
    );
    ok(hasStoreImport, 'expected GraphStore import relationship');

    const hasLoggerImport = relationships.some(rel =>
      rel.type === 'imports_from' && rel.targetId === 'RESOLVE:../shared/Logger'
    );
    ok(hasLoggerImport, 'expected Logger import relationship');

    const classContainsMethod = relationships.some(rel =>
      rel.type === 'class-contains-method' && rel.targetId.endsWith('|method:index')
    );
    ok(classContainsMethod, 'expected ProjectIndexer#index containment');
  });
});
