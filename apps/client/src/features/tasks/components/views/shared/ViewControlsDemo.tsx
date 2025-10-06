import { useState } from 'react';
import { ViewSwitcher, RootNodeSelector, useTaskData } from './index';
import { Button } from '@client/shared/ui/Button';
import { Card, CardHeader, CardContent } from '@client/shared/ui/Card';
import { Input } from '@client/shared/ui/Input';
import { Search, Filter } from 'lucide-react';

/**
 * Demo component showing how to use the shared view controls
 * This component demonstrates the integration of ViewSwitcher, RootNodeSelector, 
 * and TaskDataProvider context
 */
export function ViewControlsDemo() {
  // Get data and actions from context
  const {
    currentView,
    setCurrentView,
    rootNodeSelection,
    setRootNodeSelection,
    allTasks,
    filteredTasks,
    rootTasks,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    error
  } = useTaskData();

  const [showFilters, setShowFilters] = useState(false);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="text-center">Loading tasks...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-center text-destructive">Error: {error}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Controls Header */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Task View Controls</h3>
          <p className="text-sm text-muted-foreground">
            Switch between different view types and configure root node selection
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <ViewSwitcher
              currentView={currentView}
              onViewChange={setCurrentView}
            />
            
            <RootNodeSelector
              currentSelection={rootNodeSelection}
              onSelectionChange={setRootNodeSelection}
              allTasks={allTasks}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Search and Filters */}
          {showFilters && (
            <div className="border-t pt-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter selects */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
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
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Current Data Summary</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{allTasks.length}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{filteredTasks.length}</div>
              <div className="text-sm text-muted-foreground">Filtered Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{rootTasks.length}</div>
              <div className="text-sm text-muted-foreground">Root Level Tasks</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-md text-sm">
            <div><strong>Current View:</strong> {currentView}</div>
            <div><strong>Root Selection:</strong> {rootNodeSelection.type}</div>
            {rootNodeSelection.taskTitle && (
              <div><strong>Selected Task:</strong> {rootNodeSelection.taskTitle}</div>
            )}
            {searchQuery && (
              <div><strong>Search Query:</strong> "{searchQuery}"</div>
            )}
            <div><strong>Status Filter:</strong> {statusFilter}</div>
            <div><strong>Type Filter:</strong> {typeFilter}</div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Task List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Filtered Tasks Preview</h3>
          <p className="text-sm text-muted-foreground">
            {filteredTasks.length} tasks match current filters
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-auto">
            {filteredTasks.slice(0, 10).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 border border-border rounded-md hover:bg-accent"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {task.task_type}
                  </span>
                  <span className="font-medium">{task.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.task_status === 'done' ? 'bg-green-100 text-green-800' :
                    task.task_status === 'in_progress' ? 'bg-primary/10 text-blue-800' :
                    task.task_status === 'blocked' ? 'bg-destructive/10 text-red-800' :
                    'bg-card text-foreground'
                  }`}>
                    {task.task_status}
                  </span>
                  <span>{task.task_priority}</span>
                </div>
              </div>
            ))}
            {filteredTasks.length > 10 && (
              <div className="text-sm text-muted-foreground text-center py-2">
                ... and {filteredTasks.length - 10} more tasks
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}