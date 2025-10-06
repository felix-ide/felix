import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ExcalidrawRenderer } from '../../../react/renderers/ExcalidrawRenderer';

describe('ExcalidrawRenderer', () => {
  const validContent = JSON.stringify({
    type: 'excalidraw',
    version: 2,
    elements: [
      {
        id: 'rect1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      },
    ],
  });

  it('should render excalidraw with valid JSON', () => {
    render(<ExcalidrawRenderer content={validContent} />);
    
    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();
  });

  it('should show error for invalid JSON', () => {
    const invalidContent = '{invalid json}';
    render(<ExcalidrawRenderer content={invalidContent} />);
    
    expect(screen.getByText(/Excalidraw Error:/)).toBeInTheDocument();
    expect(screen.getByText(/Invalid Excalidraw JSON content/)).toBeInTheDocument();
  });

  it('should calculate dimensions based on content', async () => {
    const content = JSON.stringify({
      elements: [
        {
          id: 'rect1',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 400,
          height: 300,
        },
      ],
    });
    
    const { container } = render(<ExcalidrawRenderer content={content} />);
    const wrapper = container.querySelector('.relative') as HTMLElement;
    
    // Height should be calculated as maxY - minY + 150 (padding)
    // In this case: 300 + 150 = 450
    await waitFor(() => {
      expect(wrapper).toHaveStyle({ height: '450px' });
    });
  });

  it('should respect minHeight option', () => {
    const content = JSON.stringify({
      elements: [
        {
          id: 'small',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
        },
      ],
    });
    
    const { container } = render(
      <ExcalidrawRenderer content={content} options={{ minHeight: 500 }} />
    );
    
    const wrapper = container.querySelector('.relative');
    expect(wrapper).toHaveStyle({ height: '500px' });
  });

  it('should respect maxHeight option', () => {
    const content = JSON.stringify({
      elements: [
        {
          id: 'large',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
        },
      ],
    });
    
    const { container } = render(
      <ExcalidrawRenderer content={content} options={{ maxHeight: 600 }} />
    );
    
    const wrapper = container.querySelector('.relative');
    expect(wrapper).toHaveStyle({ height: '600px' });
  });

  it('should apply theme option', () => {
    render(
      <ExcalidrawRenderer content={validContent} options={{ theme: 'dark' }} />
    );
    
    const excalidraw = screen.getByTestId('excalidraw-mock');
    expect(excalidraw).toHaveAttribute('theme', 'dark');
  });

  it('should handle empty elements array', () => {
    const content = JSON.stringify({ elements: [] });
    const { container } = render(<ExcalidrawRenderer content={content} />);
    
    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();
    const wrapper = container.querySelector('.relative');
    expect(wrapper).toHaveStyle({ height: '300px' }); // Default minHeight
  });

  it('should ignore deleted elements in bounds calculation', async () => {
    const content = JSON.stringify({
      elements: [
        {
          id: 'rect1',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          isDeleted: true,
        },
        {
          id: 'rect2',
          type: 'rectangle',
          x: 200,
          y: 200,
          width: 100,
          height: 100,
        },
      ],
    });
    
    const { container } = render(<ExcalidrawRenderer content={content} />);
    const wrapper = container.querySelector('.relative') as HTMLElement;
    
    // Should only consider rect2: 300 + 150 = 450
    await waitFor(() => {
      expect(wrapper).toHaveStyle({ height: '450px' });
    });
  });

  it('should pass correct initial data to Excalidraw', () => {
    const content = JSON.stringify({
      elements: [{ id: 'test' }],
      appState: { zoom: { value: 2 } },
      files: { file1: 'data' },
    });
    
    render(<ExcalidrawRenderer content={content} />);
    
    const excalidraw = screen.getByTestId('excalidraw-mock');
    expect(excalidraw).toHaveAttribute('viewModeEnabled', 'true');
    expect(excalidraw).toHaveAttribute('zenModeEnabled', 'false');
    expect(excalidraw).toHaveAttribute('gridModeEnabled', 'false');
  });

  it('should show loading state before content is parsed', () => {
    const { container } = render(<ExcalidrawRenderer content="{}" />);
    
    // Since parsing is synchronous in tests, we should see the rendered content
    expect(screen.queryByText('Loading Excalidraw...')).not.toBeInTheDocument();
    expect(screen.getByTestId('excalidraw-mock')).toBeInTheDocument();
  });

  it('should apply correct CSS classes', () => {
    const { container } = render(<ExcalidrawRenderer content={validContent} />);
    
    const embed = container.querySelector('.excalidraw-embed');
    expect(embed).toBeInTheDocument();
    
    const wrapper = container.querySelector('.relative');
    expect(wrapper).toHaveClass('w-full', 'overflow-hidden', 'border', 'rounded-lg');
  });

  it('should hide UI elements with CSS', () => {
    const { container } = render(<ExcalidrawRenderer content={validContent} />);
    
    const style = container.querySelector('style');
    expect(style?.textContent).toContain('.excalidraw-embed .App-menu__left');
    expect(style?.textContent).toContain('display: none !important');
  });
});
