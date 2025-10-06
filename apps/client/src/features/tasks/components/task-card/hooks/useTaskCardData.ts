import { useCallback, useEffect, useMemo, useState } from 'react';
import { felixService } from '@/services/felixService';
import type { NoteData, TaskData } from '@/types/api';

export interface EditableDependency {
  id?: string;
  taskId: string;
  taskName: string;
  type: 'blocks' | 'related' | 'follows';
  required: boolean;
  isNew?: boolean;
}

export interface StrictStatus {
  is_valid: boolean;
  completion_percentage: number;
  missing: Set<string>;
}

interface UseTaskCardDataOptions {
  task: TaskData;
  isExpanded: boolean;
}

interface UseTaskCardDataResult {
  notes: NoteData[];
  loadingNotes: boolean;
  refreshNotes: () => Promise<void>;
  rules: any[];
  loadingRules: boolean;
  refreshRules: () => Promise<void>;
  dependencyCount: { incoming: number; outgoing: number };
  loadingDependencies: boolean;
  refreshDependencyCount: () => Promise<void>;
  editDependencies: EditableDependency[];
  setEditDependencies: React.Dispatch<React.SetStateAction<EditableDependency[]>>;
  loadEditDependencies: () => Promise<void>;
  strictStatus: StrictStatus | null;
  refreshStrictStatus: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function useTaskCardData({ task, isExpanded }: UseTaskCardDataOptions): UseTaskCardDataResult {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [dependencyCount, setDependencyCount] = useState({ incoming: 0, outgoing: 0 });
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const [editDependencies, setEditDependencies] = useState<EditableDependency[]>([]);
  const [strictStatus, setStrictStatus] = useState<StrictStatus | null>(null);

  const entityLinkSignature = useMemo(() => {
    const links = task.entity_links ?? [];
    if (links.length === 0) return '';
    return links
      .map((link) => `${link.entity_type}:${link.entity_id}`)
      .sort()
      .join('|');
  }, [task.entity_links]);

  const refreshNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const allNotes: NoteData[] = [];

      const backwardResponse = await felixService.listNotes({ linkedToTask: task.id });
      const backwardNotes = backwardResponse.notes || [];
      backwardNotes.forEach((note) => ((note as any).linkDirection = 'backward'));
      allNotes.push(...backwardNotes);

      const noteLinks = (task.entity_links || []).filter((link) => link.entity_type === 'note');
      for (const link of noteLinks) {
        try {
          const forwardNote = await felixService.getNote(link.entity_id);
          if (forwardNote && !allNotes.find((n) => n.id === forwardNote.id)) {
            (forwardNote as any).linkDirection = 'forward';
            allNotes.push(forwardNote);
          }
        } catch (error) {
          console.error(`Failed to load linked note ${link.entity_id}:`, error);
        }
      }

      setNotes(allNotes);
    } catch (error) {
      console.error('Failed to load task notes:', error);
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [task.id, task.updated_at, entityLinkSignature]);

  const refreshRules = useCallback(async () => {
    const ruleLinks = (task.entity_links || []).filter((link) => link.entity_type === 'rule');
    if (ruleLinks.length === 0) {
      setRules([]);
      return;
    }

    setLoadingRules(true);
    try {
      const loadedRules = [];
      for (const link of ruleLinks) {
        try {
          const rule = await felixService.getRule(link.entity_id);
          if (rule) {
            loadedRules.push(rule);
          }
        } catch (error) {
          console.error(`Failed to load linked rule ${link.entity_id}:`, error);
        }
      }

      setRules(loadedRules);
    } catch (error) {
      console.error('Failed to load task rules:', error);
      setRules([]);
    } finally {
      setLoadingRules(false);
    }
  }, [task.entity_links, task.updated_at]);

  const refreshDependencyCount = useCallback(async () => {
    setLoadingDependencies(true);
    try {
      const response = await felixService.getTaskDependencies(task.id);
      setDependencyCount({
        incoming: response.incoming?.length || 0,
        outgoing: response.outgoing?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load dependencies:', error);
      setDependencyCount({ incoming: 0, outgoing: 0 });
    } finally {
      setLoadingDependencies(false);
    }
  }, [task.id]);

  const loadEditDependencies = useCallback(async () => {
    try {
      const response = await felixService.getTaskDependencies(task.id);
      const deps = response.outgoing.map((dep) => ({
        id: dep.id,
        taskId: dep.dependency_task_id,
        taskName: dep.dependency_task_name || dep.dependency_task_id,
        type: dep.dependency_type,
        required: dep.required,
        isNew: false,
      }));
      setEditDependencies(deps);
    } catch (error) {
      console.error('Failed to load dependencies for editing:', error);
      setEditDependencies([]);
    }
  }, [task.id]);

  const refreshStrictStatus = useCallback(async () => {
    try {
      const response = await felixService.validateWorkflow(
        {
          id: task.id,
          title: task.title,
          description: task.description,
          task_type: task.task_type,
          entity_links: task.entity_links,
          checklists: task.checklists,
        },
        task.workflow
      );

      if (response) {
        const missing = new Set<string>((response.missing_requirements || []).map((item: any) => item.section_type));
        setStrictStatus({
          is_valid: !!response.is_valid,
          completion_percentage: response.completion_percentage || 0,
          missing,
        });
        return;
      }

      setStrictStatus(null);
    } catch (error) {
      console.error('Failed to validate workflow:', error);
      setStrictStatus(null);
    }
  }, [task.id, task.updated_at, task.workflow]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshNotes(),
      refreshRules(),
      refreshDependencyCount(),
      refreshStrictStatus(),
    ]);
  }, [refreshNotes, refreshRules, refreshDependencyCount, refreshStrictStatus]);

  useEffect(() => {
    refreshAll().catch(() => {});
  }, [refreshAll, task.updated_at]);

  useEffect(() => {
    if (isExpanded) {
      refreshAll().catch(() => {});
    }
  }, [isExpanded, refreshAll]);

  return {
    notes,
    loadingNotes,
    refreshNotes,
    rules,
    loadingRules,
    refreshRules,
    dependencyCount,
    loadingDependencies,
    refreshDependencyCount,
    editDependencies,
    setEditDependencies,
    loadEditDependencies,
    strictStatus,
    refreshStrictStatus,
    refreshAll,
  };
}
