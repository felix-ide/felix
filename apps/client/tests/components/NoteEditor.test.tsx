import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodeIndexerThemeProvider as ThemeProvider } from '../../src/themes/CodeIndexerThemeProvider';
vi.mock('../../src/features/notes/components/MockupEditor', () => ({ MockupEditor: () => null }));
import { NoteEditor } from '../../src/features/notes/components/NoteEditor';

describe('NoteEditor (basic)', () => {
  it('creates a new note with content and a tag', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    render(
      <ThemeProvider>
        <NoteEditor isOpen={true} onSave={onSave} onCancel={onCancel} />
      </ThemeProvider>
    );

    // Fill content (required)
    const content = screen.getByPlaceholderText('Write your note content here...');
    fireEvent.change(content, { target: { value: 'Hello world' } });

    // Add a tag via Enter
    const tagInput = screen.getByPlaceholderText('Add tag...');
    fireEvent.change(tagInput, { target: { value: 'docs' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    // Save
    const create = screen.getByRole('button', { name: /Create/i });
    fireEvent.click(create);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const arg = onSave.mock.calls[0][0];
    expect(arg.content).toBe('Hello world');
    expect(arg.note_type).toBe('note');
    expect(arg.stable_tags).toEqual(['docs']);
  });
});
