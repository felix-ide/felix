import { describe, it, expect } from 'vitest';
import { useProjectStore } from '../../src/features/projects/state/projectStore';

describe('projectStore', () => {
  it('sets project, stats and manages recents', () => {
    const s = useProjectStore.getState();
    s.setProject('/tmp/foo', 'foo');
    expect(useProjectStore.getState().name).toBe('foo');
    s.setStats({ componentCount: 1, relationshipCount: 2, fileCount: 3, lastIndexed: 'now' } as any);
    expect(useProjectStore.getState().isIndexed).toBe(true);
    s.addRecentProject('/tmp/foo', 'foo');
    expect(useProjectStore.getState().recentProjects.length).toBeGreaterThan(0);
    s.removeRecentProject('/tmp/foo');
    s.clearRecentProjects();
    expect(useProjectStore.getState().recentProjects.length).toBe(0);
  });
});

