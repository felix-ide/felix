import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExtendedMarkdownRenderer } from '../../react/ExtendedMarkdownRenderer';

describe('ExtendedMarkdownRenderer', () => {
  it('should render basic markdown', () => {
    const content = '# Hello World\n\nThis is a test.';
    render(<ExtendedMarkdownRenderer content={content} />);
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('This is a test.')).toBeInTheDocument();
  });

  it('should apply prose classes when prose is true', () => {
    const content = '# Test';
    const { container } = render(<ExtendedMarkdownRenderer content={content} prose={true} />);
    
    expect(container.firstChild).toHaveClass('prose');
    expect(container.firstChild).toHaveClass('prose-sm');
    expect(container.firstChild).toHaveClass('dark:prose-invert');
  });

  it('should not apply prose classes when prose is false', () => {
    const content = '# Test';
    const { container } = render(<ExtendedMarkdownRenderer content={content} prose={false} />);
    
    expect(container.firstChild).not.toHaveClass('prose');
  });

  it('should apply custom className', () => {
    const content = '# Test';
    const { container } = render(
      <ExtendedMarkdownRenderer content={content} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render mermaid diagrams', () => {
    const content = '```mermaid\ngraph TD\n  A --> B\n```';
    const { container } = render(<ExtendedMarkdownRenderer content={content} />);
    
    // Since mermaid is mocked, we check for the container div
    const mermaidContainer = container.querySelector('.mermaid-diagram');
    expect(mermaidContainer).toBeInTheDocument();
  });

  it('should render excalidraw diagrams', () => {
    const content = '```excalidraw\n{"type": "excalidraw", "elements": []}\n```';
    render(<ExtendedMarkdownRenderer content={content} />);
    
    // Since Excalidraw is mocked, we check for the mock element
    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();
  });

  it('should show error for invalid excalidraw JSON', () => {
    const content = '```excalidraw\n{invalid json}\n```';
    render(<ExtendedMarkdownRenderer content={content} />);
    
    expect(screen.getByText(/Excalidraw Error:/)).toBeInTheDocument();
    expect(screen.getByText(/Invalid Excalidraw JSON content/)).toBeInTheDocument();
  });

  it('should render inline code', () => {
    const content = 'This is `inline code` test.';
    render(<ExtendedMarkdownRenderer content={content} />);
    
    const codeElement = screen.getByText('inline code');
    expect(codeElement.tagName).toBe('CODE');
    expect(codeElement).toHaveClass('px-1', 'py-0.5');
  });

  it('should render code blocks', () => {
    const content = '```javascript\nconst test = "hello";\n```';
    render(<ExtendedMarkdownRenderer content={content} />);
    
    const codeBlock = screen.getByText('const test = "hello";');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock.closest('pre')).toBeInTheDocument();
  });

  it('should use custom components when provided', () => {
    const content = '# Custom Heading';
    const CustomH1 = ({ children }: any) => <h1 className="custom-h1">{children}</h1>;
    
    render(
      <ExtendedMarkdownRenderer 
        content={content} 
        components={{ h1: CustomH1 }}
      />
    );
    
    const heading = screen.getByText('Custom Heading');
    expect(heading).toHaveClass('custom-h1');
  });

  it('should pass mermaid options', () => {
    const content = '```mermaid\ngraph TD\n  A --> B\n```';
    const options = {
      mermaid: {
        theme: 'forest' as const,
        themeVariables: {
          primaryColor: '#ff0000',
        },
      },
    };
    
    const { container } = render(
      <ExtendedMarkdownRenderer content={content} options={options} />
    );
    
    // The options would be passed to MermaidRenderer
    expect(container.querySelector('.mermaid-diagram')).toBeInTheDocument();
  });

  it('should pass excalidraw options', () => {
    const content = '```excalidraw\n{"elements": []}\n```';
    const options = {
      excalidraw: {
        theme: 'dark' as const,
        minHeight: 400,
        maxHeight: 600,
      },
    };
    
    render(
      <ExtendedMarkdownRenderer content={content} options={options} />
    );
    
    // The options would be passed to ExcalidrawRenderer
    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();
  });

  it('should handle complex markdown with multiple elements', () => {
    const content = `
# Main Title

## Subtitle

This is a paragraph with **bold** and *italic* text.

- List item 1
- List item 2

1. Numbered item 1
2. Numbered item 2

> This is a blockquote

[Link text](https://example.com)

\`\`\`javascript
const code = "block";
\`\`\`

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;

    render(<ExtendedMarkdownRenderer content={content} />);
    
    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
    expect(screen.getByText('List item 1')).toBeInTheDocument();
    expect(screen.getByText('Numbered item 1')).toBeInTheDocument();
    expect(screen.getByText('This is a blockquote')).toBeInTheDocument();
    expect(screen.getByText('Link text')).toBeInTheDocument();
    expect(screen.getByText('const code = "block";')).toBeInTheDocument();
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
  });
});