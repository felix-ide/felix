import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeIndexerThemeProvider as ThemeProvider } from '../../src/themes/CodeIndexerThemeProvider';
import { EntityLinksSection, type EntityLink } from '../../src/shared/components/EntityLinksSection';

describe('EntityLinksSection', () => {
  const initialLinks: EntityLink[] = [
    { entity_type: 'component', entity_id: 'cmp-1', entity_name: 'Comp1', link_strength: 'primary' }
  ];

  it('updates link strength and removes links', () => {
    const onUpdate = vi.fn();
    render(
      <ThemeProvider>
        <EntityLinksSection entityLinks={initialLinks} onEntityLinksUpdate={onUpdate} />
      </ThemeProvider>
    );

    // Change strength
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'secondary' } });
    expect(onUpdate).toHaveBeenCalledWith([
      expect.objectContaining({ link_strength: 'secondary' })
    ]);

    // Remove link
    const remove = screen.getByRole('button', { name: '' }); // trash button has no label
    fireEvent.click(remove);
    expect(onUpdate).toHaveBeenCalledWith([]);
  });

  it('renders advanced sections and supports removing stable/fragile links', () => {
    const onStable = vi.fn();
    const onFragile = vi.fn();
    render(
      <ThemeProvider>
        <EntityLinksSection 
          onStableLinksUpdate={onStable} 
          onFragileLinksUpdate={onFragile}
          stableLinks={{ file_path: 'src/index.ts' }}
          fragileLinks={{ component_id: 'cmp-1' }}
        />
      </ThemeProvider>
    );

    // Open Advanced
    fireEvent.click(screen.getByText('Advanced Linking'));

    // Expect the provided links to render
    expect(screen.getByText('file_path')).toBeInTheDocument();
    expect(screen.getByText('src/index.ts')).toBeInTheDocument();
    expect(screen.getByText('component_id')).toBeInTheDocument();
    expect(screen.getByText('cmp-1')).toBeInTheDocument();

    // Click the first remove (stable)
    const removeButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(removeButtons.find((b) => b.innerHTML.includes('x'))!);
    expect(onStable).toHaveBeenCalledWith({});
  });
});
