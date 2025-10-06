import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RulePreview } from '../../src/features/rules/components/RulePreview';

// Mock app store to provide a projectPath
vi.mock('../../src/features/app-shell/state/appStore', () => ({ useAppStore: () => ({ projectPath: '/tmp/project' }) }));
// Mock service search to return a couple components
vi.mock('../../src/services/felixService', () => ({
  felixService: {
    search: vi.fn().mockResolvedValue({ results: [
      { id: 'c1', type: 'component', name: 'AuthService', filePath: '/a.ts' },
      { id: 'c2', type: 'component', name: 'UserController', filePath: '/b.ts' }
    ] })
  }
}));

describe('RulePreview', () => {
  afterEach(() => vi.restoreAllMocks());

  it('runs preview and renders summary stats', async () => {
    render(<RulePreview rule={{ name: 'No console' }} triggerPatterns={{ files: ['*.ts'] }} />);
    const btn = screen.getByRole('button', { name: /Test Rule/i });
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/Matched Entities/i)).toBeInTheDocument());
    // Confidence range or match rate present
    expect(screen.getByText(/Match Rate/i)).toBeInTheDocument();
  });
});
