import { useCallback, useEffect, useMemo, useState } from 'react';
import { felixService } from '@/services/felixService';
import type { Checklist, TaskData } from '@/types/api';
import type { EntityLink } from '@client/shared/components/EntityLinksSection';
import type { EditableDependency } from './useTaskCardData';
import { getDefaultWorkflow, normalizeWorkflow, type WorkflowId } from '../utils/workflow';

interface UseTaskCardEditorOptions {
  task: TaskData;
  onUpdate?: (taskId: string, updates: Partial<TaskData>) => void;
  editDependencies: EditableDependency[];
  setEditDependencies: React.Dispatch<React.SetStateAction<EditableDependency[]>>;
  loadEditDependencies: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

interface WorkflowTypeMeta {
  emoji?: string;
  color?: string;
}

const BUILTIN_TASK_TYPES = [
  { value: 'epic', label: '🎯 Epic' },
  { value: 'story', label: '📖 Story' },
  { value: 'task', label: '☑️ Task' },
  { value: 'subtask', label: '📝 Subtask' },
  { value: 'milestone', label: '🚩 Milestone' },
  { value: 'bug', label: '🐛 Bug' },
  { value: 'spike', label: '🔍 Spike' },
  { value: 'chore', label: '🔧 Chore' },
] as const;

export interface UseTaskCardEditorResult {
  isEditing: boolean;
  editTitle: string;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
  editDescription: string;
  setEditDescription: React.Dispatch<React.SetStateAction<string>>;
  editStatus: TaskData['task_status'];
  setEditStatus: React.Dispatch<React.SetStateAction<TaskData['task_status']>>;
  editPriority: TaskData['task_priority'];
  setEditPriority: React.Dispatch<React.SetStateAction<TaskData['task_priority']>>;
  editType: TaskData['task_type'];
  setEditType: React.Dispatch<React.SetStateAction<TaskData['task_type']>>;
  editWorkflow: WorkflowId;
  setEditWorkflow: React.Dispatch<React.SetStateAction<WorkflowId>>;
  editAssignedTo: string;
  setEditAssignedTo: React.Dispatch<React.SetStateAction<string>>;
  editDueDate: string;
  setEditDueDate: React.Dispatch<React.SetStateAction<string>>;
  editEstimatedEffort: string;
  setEditEstimatedEffort: React.Dispatch<React.SetStateAction<string>>;
  editTags: string[];
  setEditTags: React.Dispatch<React.SetStateAction<string[]>>;
  editEntityLinks: EntityLink[];
  setEditEntityLinks: React.Dispatch<React.SetStateAction<EntityLink[]>>;
  editStableLinks: Record<string, any>;
  setEditStableLinks: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  editFragileLinks: Record<string, any>;
  setEditFragileLinks: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  editChecklists: Checklist[];
  setEditChecklists: React.Dispatch<React.SetStateAction<Checklist[]>>;
  typeMapping: Record<string, string>;
  enforceMapping: boolean;
  typeMeta: Record<string, WorkflowTypeMeta>;
  typeOptions: { value: string; label: string }[];
  newTag: string;
  setNewTag: React.Dispatch<React.SetStateAction<string>>;
  startEditing: () => void;
  saveEditing: () => Promise<void>;
  cancelEditing: () => void;
  handleChecklistItemToggle: (checklistName: string, itemIndex: number) => void;
  handleEditStatusChange: (value: TaskData['task_status']) => void;
  handleEditPriorityChange: (value: TaskData['task_priority']) => void;
  handleEditTypeChange: (value: string) => void;
  handleEditWorkflowChange: (value: string) => void;
  handleResetWorkflowToDefault: () => void;
  handleAddTag: () => void;
  handleRemoveTag: (tagToRemove: string) => void;
  handleRemoveDependency: (depIndex: number) => void;
  handleUpdateDependency: (depIndex: number, updates: Partial<EditableDependency>) => void;
}

export function useTaskCardEditor({
  task,
  onUpdate,
  editDependencies,
  setEditDependencies,
  loadEditDependencies,
  refreshAll,
}: UseTaskCardEditorOptions): UseTaskCardEditorResult {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editStatus, setEditStatus] = useState(task.task_status);
  const [editPriority, setEditPriority] = useState(task.task_priority);
  const [editType, setEditType] = useState<TaskData['task_type']>(task.task_type);
  const [editWorkflow, setEditWorkflow] = useState<WorkflowId>(normalizeWorkflow(task.workflow ?? getDefaultWorkflow(task)));
  const [editAssignedTo, setEditAssignedTo] = useState(task.assigned_to || '');
  const [editDueDate, setEditDueDate] = useState(task.due_date || '');
  const [editEstimatedEffort, setEditEstimatedEffort] = useState(task.estimated_effort || '');
  const [editTags, setEditTags] = useState<string[]>(task.stable_tags || []);
  const [newTag, setNewTag] = useState('');
  const [editEntityLinks, setEditEntityLinks] = useState<EntityLink[]>(task.entity_links || []);
  const [editStableLinks, setEditStableLinks] = useState<Record<string, any>>(task.stable_links || {});
  const [editFragileLinks, setEditFragileLinks] = useState<Record<string, any>>(task.fragile_links || {});
  const [editChecklists, setEditChecklists] = useState<Checklist[]>(task.checklists || []);
  const [typeMapping, setTypeMapping] = useState<Record<string, string>>({});
  const [enforceMapping, setEnforceMapping] = useState(false);
  const [typeMeta, setTypeMeta] = useState<Record<string, WorkflowTypeMeta>>({});

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatus(task.task_status);
    setEditPriority(task.task_priority);
    setEditType(task.task_type);
    setEditWorkflow(normalizeWorkflow(task.workflow ?? getDefaultWorkflow(task)));
    setEditAssignedTo(task.assigned_to || '');
    setEditDueDate(task.due_date || '');
    setEditEstimatedEffort(task.estimated_effort || '');
    setEditTags(task.stable_tags || []);
    setEditEntityLinks(task.entity_links || []);
    setEditStableLinks(task.stable_links || {});
    setEditFragileLinks(task.fragile_links || {});
    setEditChecklists(task.checklists || []);
    setNewTag('');
  }, [task]);

  useEffect(() => {
    felixService
      .getWorkflowMapping()
      .then(setTypeMapping)
      .catch((error) => {
        console.error('[Felix] Failed to load workflow mapping', error);
      });

    felixService
      .getWorkflowConfig()
      .then(({ config }) => {
        const enforce = (config as any).enforce_type_mapping;
        setEnforceMapping(enforce === true || enforce === 'true');

        try {
          const metadata = (config as any).types_metadata;
          const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata || {};
          setTypeMeta(parsed);
        } catch (error) {
          console.error('[Felix] Failed to parse workflow type metadata', error);
        }
      })
      .catch((error) => {
        console.error('[Felix] Failed to load workflow config', error);
      });
  }, []);

  const typeOptions = useMemo(() => {
    const customKeys = Object.keys(typeMapping).filter(
      (key) => !BUILTIN_TASK_TYPES.find((item) => item.value === key)
    );

    const customOptions = customKeys.map((key) => ({ value: key, label: key }));
    return [...BUILTIN_TASK_TYPES, ...customOptions];
  }, [typeMapping]);

  const startEditing = useCallback(() => {
    if (!onUpdate) {
      return;
    }

    setIsEditing(true);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatus(task.task_status);
    setEditPriority(task.task_priority);
    setEditType(task.task_type);
    setEditWorkflow(normalizeWorkflow(task.workflow ?? getDefaultWorkflow(task)));
    setEditAssignedTo(task.assigned_to || '');
    setEditDueDate(task.due_date || '');
    setEditEstimatedEffort(task.estimated_effort || '');
    setEditTags(task.stable_tags || []);
    setEditEntityLinks(task.entity_links || []);
    setEditStableLinks(task.stable_links || {});
    setEditFragileLinks(task.fragile_links || {});
    setEditChecklists(task.checklists || []);
    setNewTag('');
    loadEditDependencies().catch((error) => {
      console.error('Failed to load dependencies for editing:', error);
    });
  }, [onUpdate, task, loadEditDependencies]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditStatus(task.task_status);
    setEditPriority(task.task_priority);
    setEditType(task.task_type);
    setEditWorkflow(normalizeWorkflow(task.workflow ?? getDefaultWorkflow(task)));
    setEditAssignedTo(task.assigned_to || '');
    setEditDueDate(task.due_date || '');
    setEditEstimatedEffort(task.estimated_effort || '');
    setEditTags(task.stable_tags || []);
    setEditEntityLinks(task.entity_links || []);
    setEditStableLinks(task.stable_links || {});
    setEditFragileLinks(task.fragile_links || {});
    setEditChecklists(task.checklists || []);
    setNewTag('');
    setEditDependencies([]);
  }, [setEditDependencies, task]);

  const saveEditing = useCallback(async () => {
    if (!onUpdate) {
      setIsEditing(false);
      return;
    }

    const updates: Partial<TaskData> = {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      task_status: editStatus,
      task_priority: editPriority,
      task_type: editType,
      workflow: editWorkflow !== normalizeWorkflow(task.workflow ?? getDefaultWorkflow(task)) ? editWorkflow : undefined,
      assigned_to: editAssignedTo.trim() || undefined,
      due_date: editDueDate || undefined,
      estimated_effort: editEstimatedEffort.trim() || undefined,
      stable_tags: editTags.length > 0 ? editTags : undefined,
      entity_links: editEntityLinks && editEntityLinks.length > 0 ? editEntityLinks : undefined,
      stable_links: Object.keys(editStableLinks || {}).length > 0 ? editStableLinks : undefined,
      fragile_links: Object.keys(editFragileLinks || {}).length > 0 ? editFragileLinks : undefined,
      checklists: editChecklists.length > 0 ? editChecklists : undefined,
    };

    onUpdate(task.id, updates);

    try {
      const currentDeps = await felixService.getTaskDependencies(task.id);
      const currentDepIds = new Set(currentDeps.outgoing.map((dep) => dep.dependency_task_id));

      const depsToAdd = editDependencies.filter(
        (dep) => dep.isNew || !currentDepIds.has(dep.taskId)
      );

      const editDepIds = new Set(editDependencies.map((dep) => dep.taskId));
      const depsToRemove = currentDeps.outgoing.filter(
        (dep) => !editDepIds.has(dep.dependency_task_id)
      );

      for (const dep of depsToAdd) {
        await felixService.addTaskDependency(task.id, {
          dependency_task_id: dep.taskId,
          dependency_type: dep.type,
          required: dep.required,
        });
      }

      for (const dep of depsToRemove) {
        await felixService.removeTaskDependency(task.id, dep.id);
      }

      await refreshAll();
    } catch (error) {
      console.error('Failed to save dependencies:', error);
    }

    setIsEditing(false);
  }, [
    onUpdate,
    editTitle,
    editDescription,
    editStatus,
    editPriority,
    editType,
    editWorkflow,
    editAssignedTo,
    editDueDate,
    editEstimatedEffort,
    editTags,
    editEntityLinks,
    editStableLinks,
    editFragileLinks,
    editChecklists,
    editDependencies,
    refreshAll,
    task,
  ]);

  const handleChecklistItemToggle = useCallback(
    (checklistName: string, itemIndex: number) => {
      if (!task.checklists || !onUpdate) return;

      const checklist = task.checklists.find((c) => c.name === checklistName);
      if (!checklist || !checklist.items[itemIndex]) return;

      const updatedChecklists = task.checklists.map((current) =>
        current.name === checklistName
          ? {
              ...current,
              items: current.items.map((item, idx) =>
                idx === itemIndex
                  ? {
                      ...item,
                      checked: !item.checked,
                      completed_at: !item.checked ? new Date().toISOString() : undefined,
                    }
                  : item
              ),
              updated_at: new Date().toISOString(),
            }
          : current
      );

      onUpdate(task.id, { checklists: updatedChecklists });
    },
    [onUpdate, task]
  );

  const handleEditStatusChange = useCallback((value: TaskData['task_status']) => {
    setEditStatus(value);
  }, []);

  const handleEditPriorityChange = useCallback((value: TaskData['task_priority']) => {
    setEditPriority(value);
  }, []);

  const handleEditTypeChange = useCallback(
    (nextType: string) => {
      setEditType(nextType as TaskData['task_type']);
      const mapped = typeMapping[nextType];
      if (mapped) {
        setEditWorkflow(normalizeWorkflow(mapped));
      }
    },
    [typeMapping]
  );

  const handleEditWorkflowChange = useCallback((next: string) => {
    setEditWorkflow(normalizeWorkflow(next));
  }, []);

  const handleResetWorkflowToDefault = useCallback(() => {
    const mapped = typeMapping[editType];
    if (mapped) {
      setEditWorkflow(normalizeWorkflow(mapped));
      return;
    }
    setEditWorkflow(normalizeWorkflow(getDefaultWorkflow(task)));
  }, [editType, task, typeMapping]);

  const handleAddTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed || editTags.includes(trimmed)) {
      return;
    }
    setEditTags((prev) => [...prev, trimmed]);
    setNewTag('');
  }, [editTags, newTag]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      setEditTags((prev) => prev.filter((tag) => tag !== tagToRemove));
    },
    []
  );

  const handleRemoveDependency = useCallback(
    (depIndex: number) => {
      setEditDependencies((prev) => prev.filter((_, index) => index !== depIndex));
    },
    [setEditDependencies]
  );

  const handleUpdateDependency = useCallback(
    (depIndex: number, updates: Partial<EditableDependency>) => {
      setEditDependencies((prev) =>
        prev.map((dep, index) => (index === depIndex ? { ...dep, ...updates } : dep))
      );
    },
    [setEditDependencies]
  );

  return {
    isEditing,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editStatus,
    setEditStatus,
    editPriority,
    setEditPriority,
    editType,
    setEditType,
    editWorkflow,
    setEditWorkflow,
    editAssignedTo,
    setEditAssignedTo,
    editDueDate,
    setEditDueDate,
    editEstimatedEffort,
    setEditEstimatedEffort,
    editTags,
    setEditTags,
    editEntityLinks,
    setEditEntityLinks,
    editStableLinks,
    setEditStableLinks,
    editFragileLinks,
    setEditFragileLinks,
    editChecklists,
    setEditChecklists,
    typeMapping,
    enforceMapping,
    typeMeta,
    typeOptions,
    newTag,
    setNewTag,
    startEditing,
    saveEditing,
    cancelEditing,
    handleChecklistItemToggle,
    handleEditStatusChange,
    handleEditPriorityChange,
    handleEditTypeChange,
    handleEditWorkflowChange,
    handleResetWorkflowToDefault,
    handleAddTag,
    handleRemoveTag,
    handleRemoveDependency,
    handleUpdateDependency,
  };
}
