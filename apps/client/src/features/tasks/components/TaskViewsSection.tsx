import React, { useState } from 'react';
import { TaskDataProvider, useTaskData } from '@client/features/tasks/components/views/shared/TaskDataProvider';
// Removed unused view controls in this wrapper
import { GanttView } from '@client/features/tasks/components/views/gantt/GanttView';
import { DependencyGraphView } from '@client/features/tasks/components/views/graph/DependencyGraphView';
import { BurndownChartView } from '@client/features/tasks/components/views/graph/BurndownChartView';
import { KanbanView } from '@client/features/tasks/components/views/kanban/KanbanView';
import { TaskDetailsModal } from '@client/features/tasks/components/TaskDetailsModal';
import { Alert } from '@client/shared/ui/Alert';
// Removed unused imports
import type { TaskData } from '@/types/api';

// View components wrapper that uses the TaskDataProvider context
function TaskViewsContent({ initialView, filters }: { initialView: string; filters?: any }) {
  const { 
    currentView, 
    setCurrentView, 
    allTasks, 
    filteredTasks,
    // rootNodeSelection,
    setRootNodeSelection,
    statusFilter,
    typeFilter,
    searchQuery,
    setStatusFilter,
    setTypeFilter,
    setSearchQuery
  } = useTaskData();
  
  // Set initial view if provided
  React.useEffect(() => {
    if (initialView && initialView !== currentView) {
      setCurrentView(initialView as any);
    }
  }, [initialView, currentView, setCurrentView]);
  
  // Apply filters from parent
  React.useEffect(() => {
    if (filters) {
      if (filters.status && filters.status !== statusFilter) {
        setStatusFilter(filters.status);
      }
      if (filters.type && filters.type !== typeFilter) {
        setTypeFilter(filters.type);
      }
      if (filters.search !== undefined && filters.search !== searchQuery) {
        setSearchQuery(filters.search);
      }
    }
  }, [filters, statusFilter, typeFilter, searchQuery, setStatusFilter, setTypeFilter, setSearchQuery]);
  
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);

  // Remove the page reload function since we handle view switching in parent

  const handleTaskClick = (task: TaskData) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  const handleViewFromTask = (taskId: string, taskTitle: string) => {
    setRootNodeSelection({
      type: 'specific-task',
      taskId,
      taskTitle
    });
    setShowTaskDetails(false);
  };

  const handleViewFromParent = (parentType: 'epic' | 'story', parentId: string, parentTitle: string) => {
    setRootNodeSelection({
      type: parentType,
      taskId: parentId,
      taskTitle: parentTitle
    });
    setShowTaskDetails(false);
  };

  // Apply root node filter if provided
  React.useEffect(() => {
    if (filters?.rootNode) {
      switch (filters.rootNode) {
        case 'all':
          setRootNodeSelection({ type: 'all-tasks' });
          break;
        case 'root-only':
          setRootNodeSelection({ type: 'root-only' });
          break;
        case 'epics-only':
          setRootNodeSelection({ type: 'epics-only' });
          break;
        case 'stories-only':
          setRootNodeSelection({ type: 'stories-only' });
          break;
      }
    }
  }, [filters?.rootNode, setRootNodeSelection]);

  return (
    <div className="h-full flex flex-col">
      {/* View Content */}
      <div className="flex-1 min-h-0">
        {(() => {
          switch (currentView) {
            case 'gantt':
              return <GanttView onTaskClick={handleTaskClick} filters={filters} />;
            case 'dependency':
              return <DependencyGraphView tasks={filteredTasks} onTaskClick={handleTaskClick} />;
            case 'burndown':
              return <BurndownChartView tasks={filteredTasks} onTaskClick={handleTaskClick} />;
            case 'kanban':
              return <KanbanView onTaskClick={handleTaskClick} />;
            default:
              return (
                <Alert variant="destructive" className="m-4">
                  <p>Unknown view type: {currentView}</p>
                </Alert>
              );
          }
        })()}
      </div>

      {/* Task Details Modal */}
      <TaskDetailsModal
        task={selectedTask}
        isOpen={showTaskDetails}
        onClose={() => setShowTaskDetails(false)}
        onViewFromTask={handleViewFromTask}
        onViewFromParent={handleViewFromParent}
        allTasks={allTasks}
      />
    </div>
  );
}

interface TaskViewsSectionProps {
  currentView?: string;
  filters?: any;
}

export function TaskViewsSection({ currentView, filters }: TaskViewsSectionProps) {
  // Ensure we only pass valid view types to TaskDataProvider
  const validView = (currentView === 'gantt' || currentView === 'dependency' || currentView === 'burndown' || currentView === 'kanban') 
    ? currentView 
    : 'gantt';
    
  return (
    <TaskDataProvider initialView={validView}>
      <TaskViewsContent initialView={validView} filters={filters} />
    </TaskDataProvider>
  );
}
