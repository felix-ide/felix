import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ExtendedMarkdownRenderer } from '../index';

describe('Integration Tests', () => {
  it('should render a complete document with all features', async () => {
    const content = `
# Extended Markdown Demo

This document demonstrates all the features of the extended markdown renderer.

## Standard Markdown

- **Bold text**
- *Italic text*
- \`inline code\`
- [Links](https://example.com)

### Code Blocks

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

## Mermaid Diagrams

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
\`\`\`

## Excalidraw Diagrams

\`\`\`excalidraw
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {
      "id": "rect-1",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "strokeColor": "#000000",
      "backgroundColor": "#ffffff"
    }
  ]
}
\`\`\`

## Tables

| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| Mermaid | ✅ |
| Excalidraw | ✅ |

> This is a blockquote with important information.

---

That's all folks!
`;

    render(<ExtendedMarkdownRenderer content={content} />);

    // Check standard markdown elements
    expect(screen.getByText('Extended Markdown Demo')).toBeInTheDocument();
    expect(screen.getByText('Bold text')).toBeInTheDocument();
    expect(screen.getByText('Italic text')).toBeInTheDocument();
    expect(screen.getByText('inline code')).toBeInTheDocument();
    expect(screen.getByText('Links')).toHaveAttribute('href', 'https://example.com');

    // Check code block
    expect(screen.getByText(/function hello/)).toBeInTheDocument();

    // Check that diagrams are rendered (mocked)
    await waitFor(() => {
      const mermaidDiagram = document.querySelector('.mermaid-diagram');
      expect(mermaidDiagram).toBeInTheDocument();
    });

    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();

    // Check table
    expect(screen.getByText('Feature')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getAllByText('✅')).toHaveLength(3);

    // Check blockquote
    expect(screen.getByText(/This is a blockquote/)).toBeInTheDocument();

    // Check final text
    expect(screen.getByText("That's all folks!")).toBeInTheDocument();
  });

  it('should handle mixed valid and invalid content gracefully', () => {
    const content = `
# Mixed Content Test

## Valid Mermaid

\`\`\`mermaid
graph LR
    A --> B
\`\`\`

## Invalid Excalidraw

\`\`\`excalidraw
This is not valid JSON!
\`\`\`

## Valid Excalidraw

\`\`\`excalidraw
{"elements": []}
\`\`\`

The document should still render properly despite errors.
`;

    render(<ExtendedMarkdownRenderer content={content} />);

    // Valid content should render
    expect(screen.getByText('Mixed Content Test')).toBeInTheDocument();
    expect(screen.getByText('Valid Mermaid')).toBeInTheDocument();
    
    // Error should be displayed for invalid content
    expect(screen.getByText(/Excalidraw Error:/)).toBeInTheDocument();
    
    // Other valid content should still render
    expect(screen.getByText('Valid Excalidraw')).toBeInTheDocument();
    expect(screen.getByText(/The document should still render/)).toBeInTheDocument();
  });

  it('should apply custom options and components', () => {
    const content = `
# Custom Rendering

This should use custom components.

\`\`\`mermaid
graph TD
    A --> B
\`\`\`
`;

    const CustomH1 = ({ children }: any) => (
      <h1 data-testid="custom-h1" className="custom-heading">{children}</h1>
    );

    render(
      <ExtendedMarkdownRenderer
        content={content}
        className="my-custom-class"
        options={{
          mermaid: {
            theme: 'forest',
          },
          excalidraw: {
            theme: 'dark',
            minHeight: 400,
          },
        }}
        components={{
          h1: CustomH1,
        }}
      />
    );

    // Check custom component
    const customHeading = screen.getByTestId('custom-h1');
    expect(customHeading).toBeInTheDocument();
    expect(customHeading).toHaveTextContent('Custom Rendering');

    // Check custom class
    const container = document.querySelector('.my-custom-class');
    expect(container).toBeInTheDocument();
  });

  it('should handle empty content gracefully', () => {
    const { container } = render(<ExtendedMarkdownRenderer content="" />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('should handle content with only whitespace', () => {
    const { container } = render(<ExtendedMarkdownRenderer content="   \n\n   " />);
    expect(container.firstChild).toBeInTheDocument();
  });
});