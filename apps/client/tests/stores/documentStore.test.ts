import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore } from '@client/shared/state/documentStore';
import { felixService } from '@/services/felixService';

vi.mock('@/services/felixService', () => ({
  felixService: {
    writeFile: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('documentStore tabs + save flow', () => {
  beforeEach(() => {
    const { tabs, closeAllTabs } = useDocumentStore.getState();
    if (tabs.length) closeAllTabs();
  });

  it('creates/opens/selects/updates/closes tabs correctly', async () => {
    const store = useDocumentStore.getState();
    // open two tabs
    store.openTab('/tmp/one.md', '# one');
    store.openTab('/tmp/two.ts', 'export const x=1');
    let s = useDocumentStore.getState();
    expect(s.tabs).toHaveLength(2);
    expect(s.getActiveTab()?.filePath).toBe('/tmp/two.ts');

    // set active to first
    const first = s.tabs[0];
    s.setActiveTab(first.id);
    s = useDocumentStore.getState();
    expect(s.getActiveTab()?.id).toBe(first.id);

    // update content marks dirty
    s.updateTabContent(first.id, '# one updated');
    s = useDocumentStore.getState();
    expect(s.getTab(first.id)?.isDirty).toBe(true);
    expect(s.hasUnsavedChanges()).toBe(true);

    // save tab clears dirty and calls file service
    await s.saveTab(first.id);
    expect(felixService.writeFile).toHaveBeenCalledWith('/tmp/one.md', '# one updated');
    expect(useDocumentStore.getState().getTab(first.id)?.isDirty).toBe(false);

    // close other tabs keeps only first
    s = useDocumentStore.getState();
    s.closeOtherTabs(first.id);
    s = useDocumentStore.getState();
    expect(s.tabs).toHaveLength(1);
    expect(s.activeTabId).toBe(first.id);

    // mark dirty, saveAllTabs clears
    s.markTabDirty(first.id, true);
    expect(useDocumentStore.getState().hasUnsavedChanges()).toBe(true);
    await s.saveAllTabs();
    expect(useDocumentStore.getState().hasUnsavedChanges()).toBe(false);

    // closeTab removes remaining and clears active
    s.closeTab(first.id);
    s = useDocumentStore.getState();
    expect(s.tabs).toHaveLength(0);
    expect(s.activeTabId).toBeUndefined();
  });
});

