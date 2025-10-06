import { useState, useEffect } from 'react';
import { useTasksStore } from '@client/features/tasks/state/tasksStore';
import { useNotesStore } from '@client/features/notes/state/notesStore';
import { useAppStore } from '@client/features/app-shell/state/appStore';
import { TaskHierarchy } from '@client/features/tasks/components/TaskHierarchy';
import { TaskEditor } from '@client/features/tasks/components/TaskEditor';
import { NoteEditor } from '@client/features/notes/components/NoteEditor';
import { TaskViewsSection } from './TaskViewsSection';
import { Alert, AlertDescription } from '@client/shared/ui/Alert';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Filter, Search, ChevronDown, Download, Upload, FileDown, CheckSquare, X, Plus, Info } from 'lucide-react';
import { HelpPanel } from '@client/features/help/components/HelpPanel';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { RootNodeSelector, type RootNodeSelection } from '@client/features/tasks/components/views/shared/RootNodeSelector';
import { felixService } from '@/services/felixService';
import type { TaskData } from '@/types/api';

export function TasksSection() {
  const [currentView, setCurrentView] = useState<'hierarchy' | 'gantt' | 'timeline' | 'kanban'>(() => {
    const saved = localStorage.getItem('task-view-mode');
    return (saved as any) || 'hierarchy';
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | undefined>();
  const [parentTaskId, setParentTaskId] = useState<string | undefined>();
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [noteTargetTaskId, setNoteTargetTaskId] = useState<string | undefined>();
  
  // View-specific filters
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: '',
    dateRange: 'all',
    showCompleted: true,
    showMilestones: true,
    groupBy: 'none',
    viewMode: 'Month',
    timelineMode: 'VERTICAL_ALTERNATING',
    rootNode: 'all'
  });

  // Root context for viewing hierarchy from different perspectives
  const [rootContext, setRootContext] = useState<RootNodeSelection>({
    type: 'all-tasks'
  });

  // Export/selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const {
    tasks,
    error,
    selectedTaskId,
    selectedTaskIds,
    loadTasks,
    addTask,
    updateTask,
    deleteTask,
    selectTask,
    clearError,
    startPolling,
    stopPolling,
    // toggleTaskSelection,
    clearSelection,
    selectAll
  } = useTasksStore();

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!isSelectionMode) {
      clearSelection();
    }
  }, [isSelectionMode, clearSelection]);

  const {
    addNote
  } = useNotesStore();

  const { autoRefresh, refreshInterval } = useAppStore();

  // Load tasks on mount and handle polling
  useEffect(() => {
    loadTasks();
    
    if (autoRefresh) {
      startPolling(refreshInterval);
    }

    // Listen for project restoration
    const handleProjectRestored = () => {
      console.log('Project restored, reloading tasks...');
      loadTasks();
    };
    
    window.addEventListener('project-restored', handleProjectRestored);

    return () => {
      stopPolling();
      window.removeEventListener('project-restored', handleProjectRestored);
    };
  }, [loadTasks, autoRefresh, refreshInterval, startPolling, stopPolling]);

  const handleCreateNew = (parentId?: string) => {
    setEditingTask(undefined);
    setParentTaskId(parentId);
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: TaskData) => {
    setEditingTask(task);
    setParentTaskId(undefined);
    setIsEditorOpen(true);
  };

  const handleSaveTask = async (taskData: Omit<TaskData, 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'depth_level'>) => {
    try {
      if (editingTask) {
        // Update existing task
        await updateTask(editingTask.id, taskData);
      } else {
        // Create new task
        await addTask(taskData);
      }
      setIsEditorOpen(false);
      setEditingTask(undefined);
      setParentTaskId(undefined);
    } catch (error) {
      console.error('Failed to save task:', error);
      // Error is handled by the store
    }
  };

  const handleCancelEdit = () => {
    setIsEditorOpen(false);
    setEditingTask(undefined);
    setParentTaskId(undefined);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Error is handled by the store
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskData['task_status']) => {
    try {
      await updateTask(taskId, { task_status: status });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleReorder = async (taskId: string, newParentId: string | null, newSortOrder: number) => {
    console.log('TasksSection handleReorder called:', {
      taskId,
      newParentId,
      newSortOrder
    });
    try {
      // Update the task with new parent and sort order
      const updates = { 
        parent_id: newParentId || undefined,
        sort_order: newSortOrder 
      };
      console.log('TasksSection passing updates to updateTask:', updates);
      await updateTask(taskId, updates);
    } catch (error) {
      console.error('Failed to reorder task:', error);
    }
  };

  const handleAddNote = (taskId: string) => {
    setNoteTargetTaskId(taskId);
    setIsNoteEditorOpen(true);
  };

  const handleSaveNote = async (noteData: any) => {
    try {
      await addNote({
        title: noteData.title,
        content: noteData.content,
        note_type: noteData.note_type || 'note',
        parent_id: undefined,
        sort_order: 0,
        depth_level: 0,
        entity_type: 'note',
        entity_links: [{
          entity_type: 'task',
          entity_id: noteTargetTaskId!,
          link_strength: 'primary'
        }],
        stable_tags: noteData.stable_tags || [],
      });
      setIsNoteEditorOpen(false);
      setNoteTargetTaskId(undefined);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleCancelNote = () => {
    setIsNoteEditorOpen(false);
    setNoteTargetTaskId(undefined);
  };

  const switchView = (view: 'hierarchy' | 'gantt' | 'timeline' | 'kanban') => {
    setCurrentView(view);
    localStorage.setItem('task-view-mode', view);
  };

  // Export handlers
  const handleExportAll = async () => {
    try {
      const exportData = await felixService.exportTasks({
        includeSubtasks: true,
        includeCompleted: true,
        includeLinkedNotes: true,
        includeLinkedComponents: true
      });

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export tasks:', error);
    }
    setShowExportMenu(false);
  };

  const handleExportSelected = async () => {
    if (selectedTaskIds.size === 0) return;
    
    try {
      const exportData = await felixService.exportTasks({
        taskIds: Array.from(selectedTaskIds),
        includeSubtasks: true,
        includeCompleted: true,
        includeLinkedNotes: true,
        includeLinkedComponents: true
      });

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks-selected-${selectedTaskIds.size}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export selected tasks:', error);
    }
    setShowExportMenu(false);
    setIsSelectionMode(false);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Unified Top Bar Controls */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Switcher */}
          <select
            value={currentView}
            onChange={(e) => switchView(e.target.value as any)}
            className="text-xs border border-border bg-background text-foreground rounded px-2 py-1 h-8 min-w-[140px]"
          >
            <option value="hierarchy">Hierarchy View</option>
            <option value="gantt">Gantt Chart</option>
            <option value="dependency">Dependency Graph</option>
            <option value="burndown">Analytics</option>
            <option value="kanban">Kanban Board</option>
          </select>
          
          {/* Filters Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3 w-3 mr-1" />
                Filters
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-popover border border-border rounded-lg shadow-xl p-4 min-w-[250px] z-50" sideOffset={5} align="start">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-2 block">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full text-xs border border-border bg-background text-foreground rounded px-2 py-1"
                    >
                      <option value="all">All Status</option>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-2 block">Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full text-xs border border-border bg-background text-foreground rounded px-2 py-1"
                    >
                      <option value="all">All Types</option>
                      <option value="epic">🎯 Epics</option>
                      <option value="story">📖 Stories</option>
                      <option value="task">☑️ Tasks</option>
                      <option value="subtask">📝 Subtasks</option>
                      <option value="milestone">🚩 Milestones</option>
                      <option value="bug">🐛 Bugs</option>
                      <option value="spike">🔍 Spikes</option>
                      <option value="chore">🔧 Chores</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-2 block">Scope</label>
                    <select
                      value={filters.rootNode || 'all'}
                      onChange={(e) => setFilters(prev => ({ ...prev, rootNode: e.target.value }))}
                      className="w-full text-xs border border-border bg-background text-foreground rounded px-2 py-1"
                    >
                      <option value="all">All Tasks</option>
                      <option value="root-only">Root Tasks Only</option>
                      <option value="epics-only">Epics Only</option>
                      <option value="stories-only">Stories Only</option>
                    </select>
                  </div>
                  {currentView === 'gantt' && (
                    <div>
                      <label className="text-xs font-medium text-foreground mb-2 block">View Mode</label>
                      <select
                        value={filters.viewMode}
                        onChange={(e) => setFilters(prev => ({ ...prev, viewMode: e.target.value }))}
                        className="w-full text-xs border border-border bg-background text-foreground rounded px-2 py-1"
                      >
                        <option value="Quarter">Quarter</option>
                        <option value="Month">Month</option>
                        <option value="Week">Week</option>
                        <option value="Day">Day</option>
                      </select>
                    </div>
                  )}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[400px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-8 text-sm h-8 w-full"
            />
          </div>
          
          {/* Root Context Selector - better layout */}
          <div className="min-w-[180px]">
            <RootNodeSelector
              currentSelection={rootContext}
              onSelectionChange={setRootContext}
              allTasks={tasks}
              className="h-8"
            />
          </div>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
          
          {/* Selection count */}
          {isSelectionMode && selectedTaskIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedTaskIds.size} selected
              </span>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={clearSelection}
                className="h-8"
              >
                Clear
              </Button>
            </>
          )}
          
          {/* Export Menu */}
          <DropdownMenu.Root open={showExportMenu} onOpenChange={setShowExportMenu}>
            <DropdownMenu.Trigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Download className="h-3 w-3 mr-1" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[200px] z-50" sideOffset={5} align="end">
                {!isSelectionMode ? (
                  <>
                    <DropdownMenu.Item asChild>
                      <button 
                        onClick={handleExportAll}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <FileDown className="h-4 w-4" />
                        Export all tasks
                      </button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <button 
                        onClick={() => {
                          setIsSelectionMode(true);
                          setShowExportMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Select for export
                      </button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-border my-1" />
                    <DropdownMenu.Item asChild>
                      <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                        <Upload className="h-4 w-4" />
                        Import tasks
                      </button>
                    </DropdownMenu.Item>
                  </>
                ) : (
                  <>
                    <DropdownMenu.Item asChild>
                      <button 
                        onClick={handleExportSelected}
                        disabled={selectedTaskIds.size === 0}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                      >
                        <FileDown className="h-4 w-4" />
                        Export {selectedTaskIds.size} selected
                      </button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <button 
                        onClick={() => selectAll()}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Select all
                      </button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-border my-1" />
                    <DropdownMenu.Item asChild>
                      <button 
                        onClick={() => {
                          setIsSelectionMode(false);
                          setShowExportMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        <X className="h-4 w-4" />
                        Cancel selection
                      </button>
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          
          {/* Help button */}
          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowHelp(true)} title="Help">
            <Info className="h-3 w-3" />
          </Button>
          
          <Button onClick={() => handleCreateNew()} size="sm" className="h-8">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* View Content */}
      <div className="flex-1 min-h-0">
        {currentView === 'hierarchy' ? (
          <TaskHierarchy
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onTaskSelect={selectTask}
            onTaskEdit={handleEditTask}
            onTaskUpdate={updateTask}
            onTaskDelete={handleDeleteTask}
            onCreateNew={handleCreateNew}
            onStatusChange={handleStatusChange}
            onReorder={handleReorder}
            onAddNote={handleAddNote}
            filters={filters}
            isSelectionMode={isSelectionMode}
            rootContext={rootContext}
          />
        ) : (
          <TaskViewsSection currentView={currentView} filters={filters} />
        )}
      </div>

      {/* Task Editor Modal */}
      <TaskEditor
        task={editingTask}
        parentId={parentTaskId}
        isOpen={isEditorOpen}
        onSave={handleSaveTask}
        onCancel={handleCancelEdit}
      />

      {/* Note Editor Modal */}
      <NoteEditor
        isOpen={isNoteEditorOpen}
        onSave={handleSaveNote}
        onCancel={handleCancelNote}
      />

      {/* Help Panel */}
      <HelpPanel section="tasks" isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
export default TasksSection;
