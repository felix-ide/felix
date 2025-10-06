import { describe, it, expect } from 'vitest';
import { useUIStore } from '../../src/shared/state/uiStore';

describe('uiStore', () => {
  it('expands/collapses and sets filters', () => {
    const s = useUIStore.getState();
    s.toggleTaskExpanded('t1');
    expect(useUIStore.getState().expandedTasks.has('t1')).toBe(true);
    s.toggleTaskExpanded('t1');
    expect(useUIStore.getState().expandedTasks.has('t1')).toBe(false);

    s.setTaskFilters('todo', 'task');
    expect(useUIStore.getState().taskStatusFilter).toBe('todo');
    expect(useUIStore.getState().taskTypeFilter).toBe('task');

    s.setNoteTypeFilter('documentation');
    s.setRuleTypeFilter('pattern');
    expect(useUIStore.getState().noteTypeFilter).toBe('documentation');
    expect(useUIStore.getState().ruleTypeFilter).toBe('pattern');

    s.clearExpandedStates();
    expect(useUIStore.getState().expandedTasks.size).toBe(0);
  });
});
