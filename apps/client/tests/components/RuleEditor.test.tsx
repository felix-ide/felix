import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeIndexerThemeProvider as ThemeProvider } from '../../src/themes/CodeIndexerThemeProvider';
import userEvent from '@testing-library/user-event';
import { RuleEditor } from '../../src/features/rules/components/RuleEditor';

describe('RuleEditor (basic)', () => {
  it('creates a new rule and calls onSave with minimal fields', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <ThemeProvider>
        <RuleEditor isOpen={true} onSave={onSave} onCancel={onCancel} />
      </ThemeProvider>
    );

    // Fill required fields
    const name = screen.getByPlaceholderText('Rule name');
    await user.type(name, 'No console logs');
    const guidance = screen.getByPlaceholderText('Rule guidance and instructions (supports markdown)');
    await user.type(guidance, 'Disallow console.log in production code');

    // Add a tag
    const addTag = screen.getByPlaceholderText('Add tag...');
    await user.type(addTag, 'lint');
    await user.keyboard('{Enter}');

    // Toggle preview and advanced to exercise UI paths
    await user.click(screen.getByRole('button', { name: /Preview/i }));
    await user.click(screen.getByRole('button', { name: /Configure/i }));

    // Save
    const save = screen.getByRole('button', { name: /Save Rule/i });
    await user.click(save);

    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg.name).toBe('No console logs');
    expect(arg.guidance_text).toMatch(/console\.log/);
    expect(arg.rule_type).toBe('pattern');
    expect(Array.isArray(arg.stable_tags)).toBe(true);
    expect(arg.stable_tags).toContain('lint');
  }, 15000);
});
