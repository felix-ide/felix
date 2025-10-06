import { describe, it, expect } from 'vitest';
import { useAppStore } from '../../src/features/app-shell/state/appStore';

describe('appStore', () => {
  it('has sane defaults and updates via actions', () => {
    const s = useAppStore.getState();
    expect(s.currentSection).toBe('explore');
    expect(s.projectSelected).toBe(false);
    s.setProjectPath('/tmp/x');
    expect(useAppStore.getState().projectSelected).toBe(true);
    s.setCurrentSection('rules');
    expect(useAppStore.getState().currentSection).toBe('rules');
    s.reset();
    expect(useAppStore.getState().autoRefresh).toBe(true);
  });
});

