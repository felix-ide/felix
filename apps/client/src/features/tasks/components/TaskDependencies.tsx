import { useState, useEffect } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Link2, Trash2, AlertCircle, ArrowRight, Ban, Link } from 'lucide-react';
import { cn } from '@/utils/cn';
import { felixService } from '@/services/felixService';
import { DependencyModal } from './DependencyModal';
import type { TaskDependency } from '@/types/api';

interface TaskDependenciesProps {
  taskId: string;
  className?: string;
}

export function TaskDependencies({ taskId, className }: TaskDependenciesProps) {
  const [dependencies, setDependencies] = useState<{
    incoming: TaskDependency[];
    outgoing: TaskDependency[];
  }>({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingDependency, setIsAddingDependency] = useState(false);

  // Load dependencies
  useEffect(() => {
    loadDependencies();
  }, [taskId]);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      setError(null);
      const deps = await felixService.getTaskDependencies(taskId);
      setDependencies(deps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dependencies');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDependency = async (targetTaskId: string, type: 'blocks' | 'related' | 'follows' = 'blocks', required: boolean = true) => {
    try {
      await felixService.addTaskDependency(taskId, {
        dependency_task_id: targetTaskId,
        dependency_type: type,
        required: required,
      });
      await loadDependencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add dependency');
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    if (!confirm('Remove this dependency?')) return;
    
    try {
      await felixService.removeTaskDependency(taskId, depId);
      await loadDependencies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove dependency');
    }
  };

  const getDependencyIcon = (type: string) => {
    switch (type) {
      case 'blocks': return <Ban className="h-4 w-4 text-destructive" />;
      case 'related': return <Link className="h-4 w-4 text-primary" />;
      case 'follows': return <ArrowRight className="h-4 w-4 text-green-600 dark:text-green-400" />;
      default: return null;
    }
  };

  const getDependencyLabel = (type: string) => {
    switch (type) {
      case 'blocks': return 'Blocks';
      case 'related': return 'Related to';
      case 'follows': return 'Follows';
      default: return type;
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading dependencies...</div>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Outgoing Dependencies (This task depends on...) */}
      <div>
        <h4 className="text-sm font-medium mb-2">This task depends on:</h4>
        {dependencies.outgoing.length > 0 ? (
          <div className="space-y-2">
            {dependencies.outgoing.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-2 border border-border rounded-md bg-card hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getDependencyIcon(dep.dependency_type)}
                  <span className="text-sm">
                    {getDependencyLabel(dep.dependency_type)} <strong>{dep.dependency_task_name || dep.dependency_task_id}</strong>
                    {dep.required && <span className="text-xs text-muted-foreground ml-1">(Required)</span>}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDependency(dep.id)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No dependencies</p>
        )}
      </div>

      {/* Incoming Dependencies (Tasks blocked by this...) */}
      <div>
        <h4 className="text-sm font-medium mb-2">Tasks blocked by this:</h4>
        {dependencies.incoming.length > 0 ? (
          <div className="space-y-2">
            {dependencies.incoming.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-2 border border-border rounded-md bg-card hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {getDependencyIcon(dep.dependency_type)}
                  <span className="text-sm">
                    <strong>{dep.dependent_task_name || dep.dependent_task_id}</strong> {getDependencyLabel(dep.dependency_type).toLowerCase()} this
                    {dep.required && <span className="text-xs text-muted-foreground ml-1">(Required)</span>}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDependency(dep.id)}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No dependent tasks</p>
        )}
      </div>

      {/* Add Dependency Button */}
      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingDependency(true)}
          className="w-full"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Add Dependency
        </Button>
      </div>

      {/* Dependency Modal */}
      <DependencyModal
        isOpen={isAddingDependency}
        onClose={() => setIsAddingDependency(false)}
        onAdd={handleAddDependency}
      />
    </div>
  );
}