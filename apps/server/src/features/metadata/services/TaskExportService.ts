/**
 * Task Export/Import Service
 * Handles exporting and importing tasks with full hierarchy, dependencies, and all linked entities
 */

import { ITask, ITaskDependency } from '@felix/code-intelligence';
import { INote } from '@felix/code-intelligence';
import { CodeIndexer } from '../../indexing/api/CodeIndexer.js';
import { promises as fs } from 'fs';

export interface TaskExportData {
  version: string;
  exportDate: string;
  projectName?: string;
  tasks: ITask[];
  dependencies: ITaskDependency[];
  linkedNotes?: INote[];
  linkedComponents?: Array<{
    id: string;
    name: string;
    type: string;
    filePath: string;
  }>;
}

export interface TaskExportOptions {
  includeSubtasks?: boolean;
  includeCompleted?: boolean;
  includeLinkedNotes?: boolean;
  includeLinkedComponents?: boolean;
  taskIds?: string[];
  rootTaskId?: string;
}

export interface TaskImportOptions {
  preserveIds?: boolean;
  parentTaskId?: string;
  skipExisting?: boolean;
  mergeStrategy?: 'overwrite' | 'skip' | 'duplicate';
}

export class TaskExportService {
  constructor(private codeIndexer: CodeIndexer) {}

  /**
   * Export tasks with all related data
   */
  async exportTasks(options: TaskExportOptions = {}): Promise<TaskExportData> {
    const {
      includeSubtasks = true,
      includeCompleted = true,
      includeLinkedNotes = true,
      includeLinkedComponents = true,
      taskIds,
      rootTaskId
    } = options;

    // Get tasks to export
    let tasks: ITask[] = [];
    const taskIdSet = new Set<string>();

    if (taskIds && taskIds.length > 0) {
      // Export specific tasks
      for (const taskId of taskIds) {
        const task = await this.codeIndexer.getTask(taskId);
        if (task) {
          tasks.push(task);
          taskIdSet.add(task.id);
        }
      }
    } else if (rootTaskId) {
      // Export task tree from root
      const taskTree = await this.codeIndexer.getTaskTree(rootTaskId, includeCompleted);
      tasks = this.flattenTaskTree(taskTree);
      tasks.forEach(t => taskIdSet.add(t.id));
    } else {
      // Export all tasks
      const allTasks = await this.codeIndexer.getTaskTree(undefined, includeCompleted);
      tasks = this.flattenTaskTree(allTasks);
      tasks.forEach(t => taskIdSet.add(t.id));
    }

    // Get subtasks if requested
    if (includeSubtasks) {
      const subtasks = await this.getSubtasks(tasks, includeCompleted);
      subtasks.forEach(t => {
        if (!taskIdSet.has(t.id)) {
          tasks.push(t);
          taskIdSet.add(t.id);
        }
      });
    }

    // Get dependencies
    const dependencies = await this.getTaskDependencies(Array.from(taskIdSet));

    // Get linked notes if requested
    let linkedNotes: INote[] = [];
    if (includeLinkedNotes) {
      linkedNotes = await this.getLinkedNotes(tasks);
    }

    // Get linked components if requested
    let linkedComponents: any[] = [];
    if (includeLinkedComponents) {
      linkedComponents = await this.getLinkedComponents(tasks);
    }

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      projectName: (this.codeIndexer as any).options?.sourceDirectory,
      tasks,
      dependencies,
      linkedNotes: linkedNotes.length > 0 ? linkedNotes : undefined,
      linkedComponents: linkedComponents.length > 0 ? linkedComponents : undefined
    };
  }

  /**
   * Export tasks to file
   */
  async exportToFile(filePath: string, options: TaskExportOptions = {}): Promise<void> {
    const exportData = await this.exportTasks(options);
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  /**
   * Import tasks from export data
   */
  async importTasks(data: TaskExportData, options: TaskImportOptions = {}): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const {
      preserveIds = false,
      parentTaskId,
      skipExisting = true,
      mergeStrategy = 'skip'
    } = options;

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const idMapping = new Map<string, string>(); // old ID -> new ID

    // Sort tasks by depth to ensure parents are imported before children
    const sortedTasks = [...data.tasks].sort((a, b) => a.depth_level - b.depth_level);

    // Import tasks
    for (const task of sortedTasks) {
      try {
        const oldId = task.id;
        let newTask = { ...task };

        // Handle ID preservation/generation
        if (!preserveIds) {
          delete (newTask as any).id;
        }

        // Update parent ID if needed
        if (newTask.parent_id) {
          if (idMapping.has(newTask.parent_id)) {
            newTask.parent_id = idMapping.get(newTask.parent_id);
          } else if (!preserveIds) {
            // Parent hasn't been imported yet or doesn't exist
            newTask.parent_id = parentTaskId || undefined;
          }
        } else if (parentTaskId) {
          newTask.parent_id = parentTaskId;
        }

        // Check if task exists (by title and parent)
        if (skipExisting || mergeStrategy === 'skip') {
          const existing = await this.findExistingTask(newTask.title, newTask.parent_id);
          if (existing) {
            if (mergeStrategy === 'skip') {
              idMapping.set(oldId, existing.id);
              skipped++;
              continue;
            }
          }
        }

        // Create the task
        const createdTask = await this.codeIndexer.addTask({
          title: newTask.title,
          description: newTask.description,
          parent_id: newTask.parent_id,
          task_type: newTask.task_type,
          task_status: newTask.task_status,
          task_priority: newTask.task_priority,
          estimated_effort: newTask.estimated_effort,
          due_date: newTask.due_date,
          assigned_to: newTask.assigned_to,
          entity_links: newTask.entity_links,
          stable_tags: newTask.tags?.stable_tags
        });

        idMapping.set(oldId, createdTask.id);
        imported++;

      } catch (error) {
        errors.push(`Failed to import task "${task.title}": ${(error as Error).message}`);
      }
    }

    // Import dependencies
    if (data.dependencies && data.dependencies.length > 0) {
      for (const dep of data.dependencies) {
        try {
          const dependentId = idMapping.get(dep.dependent_task_id) || dep.dependent_task_id;
          const dependencyId = idMapping.get(dep.dependency_task_id) || dep.dependency_task_id;

          // Only import if both tasks exist
          const dependentExists = await this.codeIndexer.getTask(dependentId);
          const dependencyExists = await this.codeIndexer.getTask(dependencyId);

          if (dependentExists && dependencyExists) {
            await this.codeIndexer.addTaskDependency({
              dependent_task_id: dependentId,
              dependency_task_id: dependencyId,
              dependency_type: dep.dependency_type,
              required: dep.required
            });
          }
        } catch (error) {
          errors.push(`Failed to import dependency: ${(error as Error).message}`);
        }
      }
    }

    // Import linked notes if provided
    if (data.linkedNotes && data.linkedNotes.length > 0) {
      for (const note of data.linkedNotes) {
        try {
          // Check if note exists
          const existing = await this.codeIndexer.getNote(note.id);
          if (!existing) {
            await this.codeIndexer.addNote({
              title: note.title,
              content: note.content,
              note_type: note.note_type,
              parent_id: note.parent_id,
              entity_links: note.entity_links,
              stable_tags: note.tags?.stable_tags
            });
          }
        } catch (error) {
          errors.push(`Failed to import linked note "${note.title}": ${(error as Error).message}`);
        }
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Import tasks from file
   */
  async importFromFile(filePath: string, options: TaskImportOptions = {}): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as TaskExportData;
    return this.importTasks(data, options);
  }

  /**
   * Helper: Flatten task tree
   */
  private flattenTaskTree(tasks: ITask[]): ITask[] {
    const result: ITask[] = [];
    const processTask = (task: ITask) => {
      result.push(task);
      // If task has children in a children property (from tree structure)
      if ((task as any).children) {
        for (const child of (task as any).children) {
          processTask(child);
        }
      }
    };
    tasks.forEach(processTask);
    return result;
  }

  /**
   * Helper: Get all subtasks
   */
  private async getSubtasks(parentTasks: ITask[], includeCompleted: boolean): Promise<ITask[]> {
    const subtasks: ITask[] = [];
    const processed = new Set<string>();

    for (const task of parentTasks) {
      if (!processed.has(task.id)) {
        const children = await this.codeIndexer.getTaskTree(task.id, includeCompleted);
        const flattened = this.flattenTaskTree(children);
        flattened.forEach(t => {
          if (t.id !== task.id && !processed.has(t.id)) {
            subtasks.push(t);
            processed.add(t.id);
          }
        });
      }
    }

    return subtasks;
  }

  /**
   * Helper: Get task dependencies
   */
  private async getTaskDependencies(taskIds: string[]): Promise<ITaskDependency[]> {
    const dependencies: ITaskDependency[] = [];

    for (const taskId of taskIds) {
      try {
        const taskDeps = await this.codeIndexer.getTaskDependencies(taskId, 'outgoing');
        dependencies.push(...(taskDeps as any));
      } catch (error) {
        // Continue on error
      }
    }

    // Remove duplicates
    const unique = new Map<string, ITaskDependency>();
    dependencies.forEach(dep => unique.set(dep.id, dep));
    return Array.from(unique.values());
  }

  /**
   * Helper: Get linked notes
   */
  private async getLinkedNotes(tasks: ITask[]): Promise<INote[]> {
    const noteIds = new Set<string>();
    const notes: INote[] = [];
    const taskIds = new Set(tasks.map(t => t.id));

    // Method 1: Collect note IDs from task entity links (task -> note)
    for (const task of tasks) {
      if (task.entity_links) {
        for (const link of task.entity_links) {
          if ((link.entity_type as string) === 'note') {
            noteIds.add(link.entity_id);
          }
        }
      }
    }

    // Method 2: Find all notes that link to any of our tasks (note -> task)
    try {
      const allNotes = await this.codeIndexer.listNotes({ limit: 1000 }); // Get many notes
      for (const note of allNotes) {
        if (note.entity_links) {
          for (const link of note.entity_links) {
            if ((link.entity_type as string) === 'task' && taskIds.has(link.entity_id)) {
              noteIds.add(note.id);
            }
          }
        }
      }
    } catch (error) {
      // Continue if we can't list notes
    }

    // Fetch all unique notes
    for (const noteId of noteIds) {
      try {
        const note = await this.codeIndexer.getNote(noteId);
        if (note) {
          notes.push(note);
        }
      } catch (error) {
        // Continue on error
      }
    }

    return notes;
  }

  /**
   * Helper: Get linked components
   */
  private async getLinkedComponents(tasks: ITask[]): Promise<any[]> {
    const components: any[] = [];
    const processed = new Set<string>();

    // Collect component references from entity links
    for (const task of tasks) {
      if (task.entity_links) {
        for (const link of task.entity_links) {
          if (link.entity_type === 'component') {
            if (!processed.has(link.entity_id)) {
              try {
                const component = await this.codeIndexer.getComponent(link.entity_id);
                if (component) {
                  components.push({
                    id: component.id,
                    name: component.name,
                    type: component.type,
                    filePath: component.filePath
                  });
                }
              } catch (error) {
                // Continue on error
              }
              processed.add(link.entity_id);
            }
          }
        }
      }
    }

    return components;
  }

  /**
   * Helper: Find existing task by title and parent
   */
  private async findExistingTask(title: string, parentId?: string): Promise<ITask | null> {
    const tasks = await this.codeIndexer.listTasks({
      parent_id: parentId,
      limit: 1000
    });

    return tasks.find(t => t.title === title) || null;
  }
}
