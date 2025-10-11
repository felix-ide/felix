import { useState, useEffect, useRef } from 'react';
import { Target, Flag, Bug, Search, Plus, BookOpen, ListTodo, Wrench, CheckSquare, ChevronUp } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import { felixService } from '@/services/felixService';
import { EntitySearchModal } from '@client/shared/components/EntitySearchModal';
import { TaskDependencies } from './TaskDependencies';
import { useEntitySearchModal } from '@client/shared/hooks/useEntitySearchModal';
import { useTaskValidation } from '@client/features/tasks/hooks/useTaskValidation';
import { TaskWhatsNext } from './TaskWhatsNext';
import { useTaskCardData } from './task-card/hooks/useTaskCardData';
import { useTaskCardEditor } from './task-card/hooks/useTaskCardEditor';
import { useWorkflowStatuses } from './task-card/hooks/useWorkflowStatuses';
import { TaskCardHeader } from './task-card/components/TaskCardHeader';
import { TaskCardMetadataRow } from './task-card/components/TaskCardMetadataRow';
import { TaskDescriptionSection } from './task-card/components/TaskDescriptionSection';
import { TaskChecklistSection } from './task-card/components/TaskChecklistSection';
import { TaskWorkflowSuggestions } from './task-card/components/TaskWorkflowSuggestions';
import { TaskDocumentsSection } from './task-card/components/TaskDocumentsSection';
import { TaskRulesSection } from './task-card/components/TaskRulesSection';
import { TaskCardEditMetadataSection } from './task-card/components/TaskCardEditMetadataSection';
import { TaskWorkflowGates } from './task-card/components/TaskWorkflowGates';
import { getTaskTypeColors, getNoteTypeColors, getRuleTypeColors, getTaskStatusColors, getTaskPriorityColors, getSpecStateColors, useTheme } from '@felix/theme-system';
import { getDefaultWorkflow } from './task-card/utils/workflow';
import type { TaskData } from '@/types/api';
import { useTasksStore } from '../state/tasksStore';
import { TaskTransitionGateBanner } from './task-card/components/TaskTransitionGateBanner';
import { TaskTransitionPromptPanel } from './task-card/components/TaskTransitionPromptPanel';

interface TaskCardProps {
  task: TaskData;
  isSelected?: boolean;
  isChecked?: boolean;
  onSelect?: () => void;
  onToggleCheck?: () => void;
  onEdit?: () => void;
  onUpdate?: (taskId: string, updates: Partial<TaskData>) => void;
  onDelete?: () => void;
  onStatusChange?: (status: TaskData['task_status']) => void;
  onAddNote?: (taskId: string) => void;
  onAddSubtask?: (taskId: string) => void;
  dragHandleProps?: any;
  className?: string;
  childTasksCount?: number;
  completedChildTasksCount?: number;
}

export function TaskCard({
  task,
  isSelected = false,
  isChecked = false,
  onSelect,
  onToggleCheck,
  onEdit,
  onUpdate,
  onDelete,
  onAddNote,
  onAddSubtask,
  dragHandleProps,
  className,
  childTasksCount = 0,
  completedChildTasksCount = 0,
}: TaskCardProps) {
  const { theme } = useTheme();
  const pendingGate = useTasksStore((state) => state.pendingGates[task.id]);
  const acknowledgeGate = useTasksStore((state) => state.acknowledgeGate);
  const dismissGate = useTasksStore((state) => state.dismissGate);
  const tasksLoading = useTasksStore((state) => state.loading);

  const [copiedId, setCopiedId] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [showWhatsNext, setShowWhatsNext] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notes,
    rules,
    dependencyCount,
    editDependencies,
    setEditDependencies,
    loadEditDependencies,
    strictStatus,
    refreshAll,
  } = useTaskCardData({ task, isExpanded });

  const {
    isEditing,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
    editStatus,
    editPriority,
    editType,
    editWorkflow,
    editAssignedTo,
    setEditAssignedTo,
    editDueDate,
    setEditDueDate,
    editEstimatedEffort,
    setEditEstimatedEffort,
    editTags,
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
    handleChecklistItemToggle: toggleChecklistItem,
    handleEditStatusChange,
    handleEditPriorityChange,
    handleEditTypeChange,
    handleEditWorkflowChange,
    handleResetWorkflowToDefault,
    handleAddTag: addTag,
    handleRemoveTag: removeTag,
    handleRemoveDependency: removeDependency,
    handleUpdateDependency: updateDependency,
  } = useTaskCardEditor({
    task,
    onUpdate,
    editDependencies,
    setEditDependencies,
    loadEditDependencies,
    refreshAll,
  });

  const workflow = getDefaultWorkflow(task);
  const validation = useTaskValidation(task, workflow);
  const statusOptions = useWorkflowStatuses(workflow);

  // Entity search modal for adding dependencies
  const addDependencyModal = useEntitySearchModal((entity) => {
    const targetEntity = Array.isArray(entity) ? entity[0] : entity;
    // Check if this dependency already exists
    const existingDep = editDependencies.find(dep => dep.taskId === targetEntity.id);
    if (!existingDep) {
      const newDep = {
        taskId: targetEntity.id,
        taskName: targetEntity.name,
        type: 'blocks' as const,
        required: true,
        isNew: true
      };
      setEditDependencies(prev => [...prev, newDep]);
    }
  });

  const handleAddDependencyClick = () => {
    addDependencyModal.openModal({
      title: 'Add Task Dependency',
      placeholder: 'Search for task to add as dependency...',
      allowedEntityTypes: ['task'],
      multiSelect: false,
    });
  };

  // Handle click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdate) {
      startEditing();
    } else if (onEdit) {
      onEdit();
    }
  };

  const handleSaveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    saveEditing().catch((error) => {
      console.error('Failed to save task edits:', error);
    });
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      saveEditing().catch((error) => {
        console.error('Failed to save task edits:', error);
      });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancelEditing();
    }
  };

  const getStatusStyles = (status: string) => {
    const colors = getTaskStatusColors(theme, status);
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      borderColor: colors.border
    };
  };

  const getPriorityStyles = (priority: string) => {
    const colors = getTaskPriorityColors(theme, priority);
    return {
      color: colors.text
    };
  };

  const getTaskTypeInfo = (type: string) => {
    const colors = getTaskTypeColors(theme, type);
    const iconMap: Record<string, any> = {
      epic: Target,
      story: BookOpen,
      task: CheckSquare,
      subtask: ListTodo,
      milestone: Flag,
      bug: Bug,
      spike: Search,
      chore: Wrench
    };

    return {
      icon: iconMap[type] || CheckSquare,
      styles: {
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border
      }
    };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  

  const getShortId = () => {
    // Extract the hash part after the timestamp
    const parts = task.id.split('_');
    return parts[parts.length - 1] || task.id.substring(0, 8);
  };

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(task.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const taskTypeInfo = getTaskTypeInfo(task.task_type);
  const metaForType = typeMeta[task.task_type];
  const TaskTypeIcon = taskTypeInfo.icon;
  const taskTypeChipStyle = metaForType?.color
    ? { ...taskTypeInfo.styles, borderColor: metaForType.color, color: metaForType.color }
    : taskTypeInfo.styles;
  const shortId = getShortId();

  const handleToggleExpanded = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleAddSubtaskClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onAddSubtask?.(task.id);
  };

  const handleDropdownToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowDropdown((prev) => !prev);
  };

  const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete?.();
    setShowDropdown(false);
  };

  const handleExpandFromMetadata = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsExpanded(true);
  };

  const copyButtonStyle = {
    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
    color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200],
  };

  const assignedChipStyle = {
    backgroundColor: theme.colors.primary[100],
    color: theme.colors.primary[700],
    borderColor: theme.colors.primary[200],
  };

  const dueChipStyle = {
    backgroundColor: theme.colors.warning[100],
    color: theme.colors.warning[700],
    borderColor: theme.colors.warning[200],
  };

  const tagsChipStyle = {
    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.accent[50],
    color: theme.type === 'dark' ? theme.colors.accent[300] : theme.colors.accent[700],
    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.accent[200],
  };

  const rulesChipStyle = {
    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.info[50],
    color: theme.type === 'dark' ? theme.colors.info[300] : theme.colors.info[700],
    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.info[200],
  };

  const linksChipStyle = {
    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.info[50],
    color: theme.type === 'dark' ? theme.colors.info[300] : theme.colors.info[700],
    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.info[200],
  };

  const metadataChipStyles = {
    assignedChip: assignedChipStyle,
    dueChip: dueChipStyle,
    tagsChip: tagsChipStyle,
    rulesChip: rulesChipStyle,
    linksChip: linksChipStyle,
  };

  const architectureNotes = notes.filter((note) => note.note_type === 'mermaid');
  const mockupNotes = notes.filter((note) => note.note_type === 'excalidraw');
  const documentationNotes = notes.filter((note) => note.note_type === 'documentation');
  const generalNotes = notes.filter((note) => note.note_type === 'note' || note.note_type === 'warning');

  const noteCounts = {
    architecture: architectureNotes.length,
    mockup: mockupNotes.length,
    documentation: documentationNotes.length,
    general: generalNotes.length,
  };

  const rulesCount = task.entity_links?.filter((link) => link.entity_type === 'rule').length || 0;

  const additionalLinks = (task.entity_links || []).filter(
    (link) => link.entity_type !== 'rule' && link.entity_type !== 'note',
  );
  const additionalLinkCount = additionalLinks.length;
  const generalLinksTooltip = additionalLinks
    .map((link) => `${link.entity_type}: ${link.entity_name || link.entity_id}`)
    .join('\n');

  const getSpecStateStyles = (state: string) => {
    const colors = getSpecStateColors(theme, state);
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      borderColor: colors.border
    };
  };

  const getRuleTypeStyles = (type: string) => {
    const colors = getRuleTypeColors(theme, type);
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      borderColor: colors.border
    };
  };

  const getNoteTypeStyles = (type: string) => {
    const colors = getNoteTypeColors(theme, type);
    return {
      backgroundColor: colors.bg,
      color: colors.text,
      borderColor: colors.border
    };
  };

  const handleExportTask = async (_event?: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const exportData = await felixService.exportTasks({
        taskIds: [task.id],
        includeSubtasks: true,
        includeCompleted: true,
        includeLinkedNotes: true,
        includeLinkedComponents: true
      });

      // Convert to JSON and create download
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task-${task.id}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export task:', error);
    }
    setShowDropdown(false);
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'px-4 py-3 border rounded-lg cursor-pointer transition-all relative group shadow-sm',
        isSelected
          ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
          : 'border-border hover:border-primary/50 hover:shadow-md',
        className
      )}
    >
      <TaskCardHeader
        task={task}
        isChecked={isChecked}
        isEditing={isEditing}
        isExpanded={isExpanded}
        onToggleCheck={onToggleCheck}
        dragHandleProps={dragHandleProps}
        validation={validation}
        workflow={workflow}
        taskTypeStyle={taskTypeChipStyle}
        taskTypeEmoji={metaForType?.emoji}
        TaskTypeIcon={TaskTypeIcon}
        getStatusStyles={getStatusStyles}
        getPriorityStyles={getPriorityStyles}
        getSpecStateStyles={getSpecStateStyles}
        editTitle={editTitle}
        onEditTitleChange={setEditTitle}
        onTitleKeyDown={handleKeyDown}
        editStatus={editStatus}
        statusOptions={statusOptions}
        onEditStatusChange={handleEditStatusChange}
        editPriority={editPriority}
        onEditPriorityChange={handleEditPriorityChange}
        editType={editType}
        typeOptions={typeOptions}
        onEditTypeChange={handleEditTypeChange}
        editWorkflow={editWorkflow}
        onEditWorkflowChange={handleEditWorkflowChange}
        mappedWorkflow={typeMapping[editType]}
        enforceMapping={enforceMapping}
        onResetWorkflowToDefault={handleResetWorkflowToDefault}
        copyButtonStyle={copyButtonStyle}
        onCopyId={handleCopyId}
        copiedId={copiedId}
        shortId={shortId}
        onEditClick={handleEditClick}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={handleCancelEdit}
        onToggleExpanded={handleToggleExpanded}
        onAddSubtaskClick={handleAddSubtaskClick}
        dropdownRef={dropdownRef}
        showDropdown={showDropdown}
        onDropdownToggle={handleDropdownToggle}
        onExportTask={handleExportTask}
        onDeleteClick={onDelete ? handleDeleteClick : undefined}
      />

      {task.workflow && task.workflow !== 'simple' && (
        <TaskWorkflowGates strictStatus={strictStatus} validation={validation} />
      )}

      {pendingGate && (
        <TaskTransitionGateBanner
          gate={pendingGate.gate}
          message={pendingGate.message}
          loading={tasksLoading}
          onAcknowledge={async () => {
            try {
              await acknowledgeGate(task.id);
            } catch (error) {
              console.error('Failed to acknowledge transition gate', error);
            }
          }}
          onDismiss={() => dismissGate(task.id)}
        />
      )}

      {!pendingGate && task.transition_prompt && (
        <TaskTransitionPromptPanel
          prompt={task.transition_prompt}
          bundleResults={task.transition_bundle_results}
        />
      )}

      {!isExpanded && !isEditing && (
        <TaskCardMetadataRow
          task={task}
          dependencyCount={dependencyCount}
          childTasksCount={childTasksCount}
          completedChildTasksCount={completedChildTasksCount}
          noteCounts={noteCounts}
          rulesCount={rulesCount}
          additionalLinkCount={additionalLinkCount}
          copyStyles={metadataChipStyles}
          formatDate={formatDate}
          getNoteTypeStyles={getNoteTypeStyles}
          checklists={task.checklists}
          onExpand={handleExpandFromMetadata}
          generalLinksTooltip={generalLinksTooltip}
        />
      )}

      {/* Expandable content - Description and Notes */}
      {(isExpanded || isEditing) && (
        <div className="mb-3 flex gap-4">
          {/* Main content area - left side */}
          <div className="flex-1 min-w-0">
            <TaskDescriptionSection
              isEditing={isEditing}
              description={task.description}
              editDescription={editDescription}
              onEditDescriptionChange={setEditDescription}
              onDescriptionKeyDown={handleKeyDown}
              onClickPropagationBlock={(event) => event.stopPropagation()}
            />

            <TaskChecklistSection
              isEditing={isEditing}
              task={task}
              editChecklists={editChecklists}
              onEditChecklistsChange={setEditChecklists}
              onChecklistItemToggle={toggleChecklistItem}
              onClickPropagationBlock={(event) => event.stopPropagation()}
            />

            <TaskWorkflowSuggestions
              isEditing={isEditing}
              task={task}
              workflowId={workflow}
              validation={validation}
              theme={theme}
            />
          </div>

          {/* Sidebar area - right side (Documents and Rules) */}
          <div className={cn(
            "flex-shrink-0",
            (expandedDocId || expandedRuleId) ? "w-1/2" : "w-64"
          )}>
            <TaskDocumentsSection
              notes={notes}
              expandedDocId={expandedDocId}
              onToggleDocument={(noteId) => setExpandedDocId(noteId)}
            />

            {!isEditing && notes.length === 0 && (
              <div className="text-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddNote?.(task.id);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Note
                </Button>
              </div>
            )}

            <TaskRulesSection
              rules={rules}
              expandedRuleId={expandedRuleId}
              onToggleRule={(ruleId) => setExpandedRuleId(ruleId)}
              getRuleTypeStyles={getRuleTypeStyles}
            />

          {/* Add Note Button - Always show if no notes */}
          {!isEditing && notes.length === 0 && (
            <div className="text-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote?.(task.id);
                }}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Note
              </Button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Dependencies Section - Read-only when expanded - Full width below grid */}
      {!isEditing && isExpanded && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-1">Dependencies</h4>
          <TaskDependencies taskId={task.id} />
        </div>
      )}

      {isEditing && (
        <TaskCardEditMetadataSection
          estimatedEffort={editEstimatedEffort}
          onEstimatedEffortChange={setEditEstimatedEffort}
          assignedTo={editAssignedTo}
          onAssignedToChange={setEditAssignedTo}
          dueDate={editDueDate}
          onDueDateChange={setEditDueDate}
          tags={editTags}
          onRemoveTag={removeTag}
          onAddTag={addTag}
          newTag={newTag}
          onNewTagChange={setNewTag}
          entityLinks={editEntityLinks}
          onEntityLinksChange={setEditEntityLinks}
          stableLinks={editStableLinks}
          onStableLinksChange={setEditStableLinks}
          fragileLinks={editFragileLinks}
          onFragileLinksChange={setEditFragileLinks}
          dependencies={editDependencies}
          onUpdateDependency={updateDependency}
          onRemoveDependency={removeDependency}
          onAddDependency={handleAddDependencyClick}
        />
      )}

      {!isEditing && isExpanded && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-medium text-muted-foreground">Workflow Assist</h4>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={(e) => {
                e.stopPropagation();
                setShowWhatsNext((prev) => !prev);
              }}
            >
              {showWhatsNext ? 'Hide' : 'Show'} What’s Next
            </Button>
          </div>
          {showWhatsNext && <TaskWhatsNext taskId={task.id} />}
        </div>
      )}
      
      {/* Collapse button at bottom when expanded - for convenience when scrolled down */}
      {isExpanded && !isEditing && (
        <div className="flex justify-end mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
            Collapse
          </button>
        </div>
      )}

      {/* Entity Search Modal for Dependencies */}
      <EntitySearchModal {...addDependencyModal.modalProps} />

    </div>
  );
}
