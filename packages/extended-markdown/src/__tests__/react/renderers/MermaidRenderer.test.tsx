import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MermaidRenderer } from '../../../react/renderers/MermaidRenderer';
import mermaid from 'mermaid';

jest.mock('mermaid');

describe('MermaidRenderer', () => {
  const mockMermaid = mermaid as jest.Mocked<typeof mermaid>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMermaid.render.mockResolvedValue({ svg: '<svg>Test Diagram</svg>' });
  });

  it('should render mermaid diagram', async () => {
    const code = 'graph TD\n  A --> B';
    const { container } = render(<MermaidRenderer code={code} />);
    
    await waitFor(() => {
      expect(mockMermaid.render).toHaveBeenCalled();
    });

    const diagram = container.querySelector('.mermaid-diagram');
    expect(diagram).toBeInTheDocument();
    expect(diagram?.innerHTML).toBe('<svg>Test Diagram</svg>');
  });

  it('should initialize mermaid with default options', async () => {
    render(<MermaidRenderer code="graph TD" />);
    await waitFor(() => {
      expect(mockMermaid.initialize).toHaveBeenCalledWith({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: expect.objectContaining({
          primaryColor: '#3b82f6',
          primaryTextColor: '#ffffff',
        }),
      });
    });
  });

  it('should initialize mermaid with custom options', async () => {
    const options = {
      theme: 'forest' as const,
      themeVariables: {
        primaryColor: '#00ff00',
      },
    };
    
    render(<MermaidRenderer code="graph TD" options={options} />);
    await waitFor(() => {
      expect(mockMermaid.initialize).toHaveBeenCalledWith({
        startOnLoad: false,
        theme: 'forest',
        themeVariables: {
          primaryColor: '#00ff00',
        },
      });
    });
  });

  it('should handle mermaid rendering errors', async () => {
    const errorMessage = 'Invalid syntax';
    mockMermaid.render.mockRejectedValue(new Error(errorMessage));
    
    const { container } = render(<MermaidRenderer code="invalid code" />);
    
    await waitFor(() => {
      const errorDiv = container.querySelector('.text-red-500');
      expect(errorDiv).toBeInTheDocument();
      expect(errorDiv?.textContent).toContain('Mermaid Error:');
      expect(errorDiv?.textContent).toContain(errorMessage);
    });
  });

  it('should generate unique IDs for diagrams', async () => {
    const code = 'graph TD';
    render(<MermaidRenderer code={code} />);
    render(<MermaidRenderer code={code} />);
    
    await waitFor(() => {
      expect(mockMermaid.render).toHaveBeenCalledTimes(2);
    });

    const calls = mockMermaid.render.mock.calls;
    const id1 = calls[0][0];
    const id2 = calls[1][0];
    
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^mermaid-\d+-\w+$/);
    expect(id2).toMatch(/^mermaid-\d+-\w+$/);
  });

  it('should re-render when code changes', async () => {
    const { rerender } = render(<MermaidRenderer code="graph TD\n  A --> B" />);
    
    await waitFor(() => {
      expect(mockMermaid.render).toHaveBeenCalledTimes(1);
    });

    rerender(<MermaidRenderer code="graph LR\n  C --> D" />);
    
    await waitFor(() => {
      expect(mockMermaid.render).toHaveBeenCalledTimes(2);
      expect(mockMermaid.render).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.stringContaining('graph LR')
      );
    });
  });

  it('should clear previous content before rendering new diagram', async () => {
    const { container } = render(<MermaidRenderer code="graph TD" />);
    
    await waitFor(() => {
      const diagram = container.querySelector('.mermaid-diagram');
      expect(diagram?.innerHTML).toBe('<svg>Test Diagram</svg>');
    });
  });
});
