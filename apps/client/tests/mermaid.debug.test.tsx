import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: () => null,
  exportToSvg: () => Promise.resolve(new Blob()),
}));

if (typeof SVGElement !== 'undefined' && !SVGElement.prototype.getBBox) {
  SVGElement.prototype.getBBox = () => ({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
}

import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';

const cases = [
  ['flowchart TD', '  A --> B'],
  ['erDiagram', '  USER ||--|{ ORDER : places', '  ORDER ||--|{ LINE_ITEM : contains', '  USER {', '    string id PK', '    string email', '  }'],
  ['sequenceDiagram', '  participant Alice', '  participant Bob', '  Alice->>Bob: Hello Bob'],
];

describe('Mermaid integration debug', () => {
  it.each(cases)('renders %s', async (...lines: string[]) => {
    const content = ['```mermaid', ...lines.flat(), '```'].join('\n');
    const { container } = render(<MarkdownRenderer content={content} />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      if (svg) {
        const title = lines[0];
        const safeName = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        const outputPath = path.join(process.cwd(), 'tmp', `mermaid-${safeName}.svg`);
        writeFileSync(outputPath, svg.outerHTML, 'utf8');
      }
    }, { timeout: 10000 });
  });
});
