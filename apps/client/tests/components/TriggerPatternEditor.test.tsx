import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TriggerPatternEditor } from '../../src/features/rules/components/TriggerPatternEditor';
import type {
  TriggerPatterns,
  SemanticTriggers,
  ContextConditions,
} from '../../src/features/rules/components/TriggerPatternEditor';

// Mock the minimal UI primitives so queries work reliably
vi.mock('../../src/shared/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('../../src/shared/ui/Input', () => ({
  Input: ({ onChange, value, ...props }: any) => (
    <input onChange={(e) => onChange?.(e)} value={value} {...props} />
  ),
}));

vi.mock('../../src/shared/ui/Card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('TriggerPatternEditor', () => {
  const defaultProps = {
    triggerPatterns: {} as TriggerPatterns,
    semanticTriggers: {} as SemanticTriggers,
    contextConditions: {} as ContextConditions,
    onTriggerPatternsChange: vi.fn(),
    onSemanticTriggersChange: vi.fn(),
    onContextConditionsChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Patterns Tab', () => {
    it('renders File Patterns by default with suggestions', () => {
      render(<TriggerPatternEditor {...defaultProps} />);
      expect(screen.getAllByText('File Patterns').length).toBeGreaterThan(0);
      expect(screen.getByText('**/*.ts')).toBeInTheDocument();
    });

    it('adds a file pattern via Add Pattern + typing', async () => {
      const onTriggerPatternsChange = vi.fn();
      const { rerender } = render(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={{ files: [] }}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Add Pattern/i }));

      // Parent would update props; simulate by rerendering with latest call
      await waitFor(() => expect(onTriggerPatternsChange).toHaveBeenCalled());
      const [{ 0: newPatterns }] = [onTriggerPatternsChange.mock.calls.at(-1) || []];
      rerender(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={newPatterns}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );

      const input = screen.getByPlaceholderText('e.g., **/*.ts, src/**/*.tsx');
      fireEvent.change(input, { target: { value: '**/*.js' } });

      await waitFor(() => {
        expect(onTriggerPatternsChange).toHaveBeenCalledWith(
          expect.objectContaining({ files: ['**/*.js'] })
        );
      });
    });

    it('adds a file pattern via quick suggestion', async () => {
      const onTriggerPatternsChange = vi.fn();
      render(
        <TriggerPatternEditor
          {...defaultProps}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );

      fireEvent.click(screen.getByText('**/*.js'));
      await waitFor(() => {
        expect(onTriggerPatternsChange).toHaveBeenCalledWith(
          expect.objectContaining({ files: ['**/*.js'] })
        );
      });
    });

    it('removes a file pattern', async () => {
      const onTriggerPatternsChange = vi.fn();
      render(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={{ files: ['**/*.ts', '**/*.tsx'] }}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );

      const allButtons = screen.getAllByRole('button');
      const iconOnly = allButtons.filter((b) => (b.textContent || '').trim() === '');
      expect(iconOnly.length).toBeGreaterThan(0);
      fireEvent.click(iconOnly[0]);

      await waitFor(() => {
        expect(onTriggerPatternsChange).toHaveBeenCalledWith(
          expect.objectContaining({ files: ['**/*.tsx'] })
        );
      });
    });
  });

  describe('Components Tab', () => {
    it('switches to Components and shows input after Add Type', async () => {
      const onTriggerPatternsChange = vi.fn();
      const { rerender } = render(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={{ components: [] }}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );
      fireEvent.click(screen.getByText('Components'));
      fireEvent.click(screen.getByRole('button', { name: /Add Type/i }));
      await waitFor(() => expect(onTriggerPatternsChange).toHaveBeenCalled());
      const [{ 0: newPatterns }] = [onTriggerPatternsChange.mock.calls.at(-1) || []];
      rerender(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={newPatterns}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );
      expect(
        screen.getByPlaceholderText('e.g., function, class, interface')
      ).toBeInTheDocument();
    });

    it('adds a component via quick suggestion', async () => {
      const onTriggerPatternsChange = vi.fn();
      render(
        <TriggerPatternEditor
          {...defaultProps}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );
      fireEvent.click(screen.getByText('Components'));
      fireEvent.click(screen.getByText('function'));
      await waitFor(() => {
        expect(onTriggerPatternsChange).toHaveBeenCalledWith(
          expect.objectContaining({ components: ['function'] })
        );
      });
    });
  });

  describe('Semantic Tab', () => {
    it('shows Business Domains and Architectural Layers', () => {
      render(<TriggerPatternEditor {...defaultProps} />);
      fireEvent.click(screen.getByText('Semantic'));
      expect(screen.getByText('Business Domains')).toBeInTheDocument();
      expect(screen.getByText('Architectural Layers')).toBeInTheDocument();
    });

    it('adds business domain via quick suggestion', async () => {
      const onSemanticTriggersChange = vi.fn();
      render(
        <TriggerPatternEditor
          {...defaultProps}
          onSemanticTriggersChange={onSemanticTriggersChange}
        />
      );
      fireEvent.click(screen.getByText('Semantic'));
      fireEvent.click(screen.getByText('authentication'));
      await waitFor(() => {
        expect(onSemanticTriggersChange).toHaveBeenCalledWith(
          expect.objectContaining({ business_domains: ['authentication'] })
        );
      });
    });

    it('adds architectural layer via quick suggestion', async () => {
      const onSemanticTriggersChange = vi.fn();
      render(
        <TriggerPatternEditor
          {...defaultProps}
          onSemanticTriggersChange={onSemanticTriggersChange}
        />
      );
      fireEvent.click(screen.getByText('Semantic'));
      fireEvent.click(screen.getByText('controller'));
      await waitFor(() => {
        expect(onSemanticTriggersChange).toHaveBeenCalledWith(
          expect.objectContaining({ architectural_layers: ['controller'] })
        );
      });
    });
  });

  describe('Context Tab', () => {
    it('switches to Context and shows constraint sections', () => {
      render(<TriggerPatternEditor {...defaultProps} />);
      fireEvent.click(screen.getByText('Context'));
      expect(screen.getByText('File Size Constraints')).toBeInTheDocument();
      expect(screen.getByText('Complexity Constraints')).toBeInTheDocument();
      expect(screen.getByText('Dependencies Constraints')).toBeInTheDocument();
    });

    it('sets file size, complexity and dependency constraints', async () => {
      const onContextConditionsChange = vi.fn();
      render(
        <TriggerPatternEditor
          {...defaultProps}
          onContextConditionsChange={onContextConditionsChange}
        />
      );

      fireEvent.click(screen.getByText('Context'));
      fireEvent.change(screen.getByPlaceholderText('e.g., 1000'), {
        target: { value: '100' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 50000'), {
        target: { value: '1000' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 10'), {
        target: { value: '10' },
      });
      fireEvent.change(screen.getByPlaceholderText('e.g., 5'), {
        target: { value: '5' },
      });

      await waitFor(() => {
        expect(onContextConditionsChange).toHaveBeenCalledWith({
          file_size: { min: 100 },
        });
        expect(onContextConditionsChange).toHaveBeenCalledWith({
          file_size: { max: 1000 },
        });
        expect(onContextConditionsChange).toHaveBeenCalledWith({
          complexity: { max: 10 },
        });
        expect(onContextConditionsChange).toHaveBeenCalledWith({
          dependencies: { max: 5 },
        });
      });
    });
  });

  describe('Display Existing Values', () => {
    it('shows existing file patterns as input values', () => {
      render(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={{ files: ['**/*.ts', '**/*.tsx'] }}
        />
      );
      expect(screen.getByDisplayValue('**/*.ts')).toBeInTheDocument();
      expect(screen.getByDisplayValue('**/*.tsx')).toBeInTheDocument();
    });

    it('shows existing semantic triggers', () => {
      render(
        <TriggerPatternEditor
          {...defaultProps}
          semanticTriggers={{
            business_domains: ['authentication', 'payment'],
            architectural_layers: ['frontend'],
          }}
        />
      );
      fireEvent.click(screen.getByText('Semantic'));
      expect(screen.getByDisplayValue('authentication')).toBeInTheDocument();
      expect(screen.getByDisplayValue('payment')).toBeInTheDocument();
      expect(screen.getByDisplayValue('frontend')).toBeInTheDocument();
    });

    it('shows existing context conditions', () => {
      render(
        <TriggerPatternEditor
          {...defaultProps}
          contextConditions={{
            file_size: { min: 100, max: 1000 },
            complexity: { max: 15 },
            dependencies: { max: 5 },
          }}
        />
      );
      fireEvent.click(screen.getByText('Context'));
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });
  });

  describe('Accessibility / Basics', () => {
    it('renders the four tabs', () => {
      render(<TriggerPatternEditor {...defaultProps} />);
      expect(screen.getAllByText('File Patterns').length).toBeGreaterThan(0);
      expect(screen.getByText('Components')).toBeInTheDocument();
      expect(screen.getByText('Semantic')).toBeInTheDocument();
      expect(screen.getByText('Context')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty props gracefully', () => {
      render(
        <TriggerPatternEditor
          triggerPatterns={{}}
          semanticTriggers={{}}
          contextConditions={{}}
          onTriggerPatternsChange={vi.fn()}
          onSemanticTriggersChange={vi.fn()}
          onContextConditionsChange={vi.fn()}
        />
      );
      expect(screen.getAllByText('File Patterns').length).toBeGreaterThan(0);
    });

    it('handles undefined arrays in trigger patterns', () => {
      render(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={{ files: undefined, components: ['component'] } as any}
        />
      );
      fireEvent.click(screen.getByText('Components'));
      expect(screen.getByDisplayValue('component')).toBeInTheDocument();
    });

    it('reflects raw user input as-is (no auto-trim)', async () => {
      const onTriggerPatternsChange = vi.fn();
      const { rerender } = render(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={{ files: [] }}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Add Pattern/i }));
      await waitFor(() => expect(onTriggerPatternsChange).toHaveBeenCalled());
      const [{ 0: newPatterns }] = [onTriggerPatternsChange.mock.calls.at(-1) || []];
      rerender(
        <TriggerPatternEditor
          {...defaultProps}
          triggerPatterns={newPatterns}
          onTriggerPatternsChange={onTriggerPatternsChange}
        />
      );
      const input = screen.getByPlaceholderText('e.g., **/*.ts, src/**/*.tsx');
      fireEvent.change(input, { target: { value: '  **/*.js  ' } });
      await waitFor(() => {
        expect(onTriggerPatternsChange).toHaveBeenCalledWith(
          expect.objectContaining({ files: ['  **/*.js  '] })
        );
      });
    });
  });
});
