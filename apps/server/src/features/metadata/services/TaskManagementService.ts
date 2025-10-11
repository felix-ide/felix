/**
 * TaskManagementService - Handles all task operations
 * Single responsibility: Task CRUD, dependencies, and hierarchy management
 */

import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { EmbeddingService } from '../../../nlp/EmbeddingServiceAdapter.js';
import type { 
  ITask, 
  CreateTaskParams, 
  UpdateTaskParams, 
  TaskSearchCriteria 
} from '@felix/code-intelligence';
import { TaskUtils } from '@felix/code-intelligence';
import type { SearchResult } from '../../../types/storage.js';
import { WorkflowService } from '../../workflows/services/WorkflowService.js';
import { WorkflowTransitionService } from '../../workflows/services/WorkflowTransitionService.js';
import type { TransitionEvaluationResult } from '../../workflows/services/WorkflowTransitionService.js';
import { WorkflowConfigManager } from '../../../storage/WorkflowConfigManager.js';
import { logger } from '../../../shared/logger.js';
import { TransitionGateError } from '../../workflows/errors/TransitionGateError.js';
 

export interface TaskDependencyParams {
  dependent_task_id: string;
  dependency_task_id: string;
  dependency_type?: 'blocks' | 'related' | 'follows';
  required?: boolean;
}

export interface TaskDependency {
  id: string;
  dependent_task_id: string;
  dependency_task_id: string;
  dependency_type: 'blocks' | 'related' | 'follows';
  required: boolean;
  created_at: string;
}

export class TaskManagementService {
  private dbManager: DatabaseManager;
  private embeddingService: EmbeddingService;
  

  constructor(
    dbManager: DatabaseManager,
    embeddingService: EmbeddingService
  ) {
    this.dbManager = dbManager;
    this.embeddingService = embeddingService;
  }

  /**
   * Add a new task
   */
  async addTask(params: CreateTaskParams): Promise<ITask> {
    const task = TaskUtils.createFromParams(params);
    // Resolve / enforce workflow from mapping/default
    try {
      const wfSvc = new WorkflowService(this.dbManager);
      const cfgMgr = new WorkflowConfigManager(this.dbManager.getMetadataDataSource());
      await cfgMgr.initialize();
      const cfg = await cfgMgr.getGlobalConfig();
      const enforce = (cfg as any).enforce_type_mapping === true || (cfg as any).enforce_type_mapping === 'true';
      const resolved = await wfSvc.resolveWorkflowName((params as any).task_type, (params as any).workflow);
      (task as any).workflow = enforce ? resolved : ((params as any).workflow || resolved);
    } catch {
      (task as any).workflow = (task as any).workflow || (params as any).workflow || 'simple';
    }
    // Preserve checklists field if present
    const taskWithChecklists = { ...task, checklists: (params as any).checklists };
    
    const result = await this.dbManager.getTasksRepository().storeTask(taskWithChecklists);
    if (!result.success) {
      throw new Error(result.error || 'Failed to add task');
    }
    
    // Generate embedding for the task asynchronously
    this.generateTaskEmbedding(task).catch(error => {
      logger.warn(`Failed to generate embedding for task ${task.id}:`, error);
    });
    
    return task;
  }

  /**
   * Get a task by ID
   */
  async getTask(id: string): Promise<ITask | null> { return await this.dbManager.getTasksRepository().getTask(id); }

  /**
   * Update a task
   */
  async updateTask(id: string, updates: UpdateTaskParams): Promise<ITask> {
    const updateWithChecklists = { ...updates, checklists: (updates as any).checklists } as any;
    let specStateUpdated = false;
    const currentTask = await this.getTask(id);
    if (!currentTask) {
      throw new Error('Task not found');
    }
    const baseTask = currentTask as ITask;

    // FIRST: Check if workflow is changing (before any validation)
    let workflowChanged = false;
    let oldWorkflow = (baseTask as any).workflow;
    try {
      const cfgMgr = new WorkflowConfigManager(this.dbManager.getMetadataDataSource());
      await cfgMgr.initialize();
      const cfg = await cfgMgr.getGlobalConfig();
      const enforce = (cfg as any).enforce_type_mapping === true || (cfg as any).enforce_type_mapping === 'true';
      if (enforce) {
        const wfSvc = new WorkflowService(this.dbManager);
        const nextType = (updates as any).task_type || baseTask?.task_type;
        const resolved = await wfSvc.resolveWorkflowName(nextType, undefined);
        (updateWithChecklists as any).workflow = resolved;
        if (oldWorkflow && resolved && oldWorkflow !== resolved) {
          workflowChanged = true;
        }
      }
    } catch {}

    // If workflow is explicitly changed or changed via type mapping, reset status to new workflow's initial_state
    if ((updates as any).workflow && (updates as any).workflow !== oldWorkflow) {
      workflowChanged = true;
    }

    if (workflowChanged) {
      try {
        const wfSvc = new WorkflowService(this.dbManager);
        const newWorkflowName = (updateWithChecklists as any).workflow;
        const workflowDef = await wfSvc.getWorkflowDefinition(newWorkflowName);
        if (workflowDef?.status_flow?.initial_state) {
          // Reset status to new workflow's initial state
          (updateWithChecklists as any).task_status = workflowDef.status_flow.initial_state;
          // Reset spec_state to draft
          (updateWithChecklists as any).spec_state = 'draft';
          // Clear any validation metadata
          (updateWithChecklists as any).last_validated_at = null;
          (updateWithChecklists as any).validated_by = null;
          logger.info(`Workflow changed from ${oldWorkflow} to ${newWorkflowName}, resetting status to ${workflowDef.status_flow.initial_state}`);
        }
      } catch (err) {
        logger.warn(`Failed to reset task status on workflow change: ${err}`);
      }
    }

    // THEN: Skip status validation if workflow changed (status was auto-reset)
    // Guard: prevent moving to in_progress unless spec_state >= spec_ready
    if (!workflowChanged && updates.task_status && updates.task_status === 'in_progress') {
      const state = (baseTask as any).spec_state || 'draft';
      if (state !== 'spec_ready') {
        throw new Error(`Cannot set task_status=in_progress when spec_state is '${state}'. Gate requires spec_state=spec_ready.`);
      }
      // Additional guard: check blocking dependencies are resolved
      const outgoing = await this.getTaskDependencies(id, 'outgoing');
      const blocking = outgoing.filter(d => d.dependency_type === 'blocks' && d.required !== false);
      if (blocking.length) {
        const unresolved: string[] = [];
        for (const dep of blocking) {
          try {
            const t = await this.getTask(dep.dependency_task_id);
            if (!t || (t.task_status !== 'done' && t.task_status !== 'cancelled')) {
              unresolved.push(dep.dependency_task_id);
            }
          } catch {
            unresolved.push(dep.dependency_task_id);
          }
        }
        if (unresolved.length) {
          throw new Error(`Cannot start work: blocking dependencies not completed: ${unresolved.join(', ')}`);
        }
      }
    }

    let transitionEvaluation: TransitionEvaluationResult | null = null;
    if (!workflowChanged && updates.task_status && updates.task_status !== baseTask.task_status) {
      const transitionService = new WorkflowTransitionService(this.dbManager);
      const evaluation = await transitionService.evaluateStatusChange(
        baseTask,
        updates.task_status,
        {
          gateToken: (updates as any).transition_gate_token,
          actor: (updates as any).updated_by
        }
      );
      if (!evaluation.allowed) {
        throw new TransitionGateError('Task status transition blocked by workflow requirements', evaluation);
      }
      transitionEvaluation = evaluation;
    }
    delete (updateWithChecklists as any).transition_gate_token;
    delete (updateWithChecklists as any).transition_gate_response;

    // If attempting to set spec_state via generic update, route through gated setter
    if ((updates as any).spec_state) {
      const next = (updates as any).spec_state as 'draft'|'spec_in_progress'|'spec_ready';
      await this.setSpecState(id, next);
      delete (updateWithChecklists as any).spec_state;
      specStateUpdated = true;
    }
    const result = await this.dbManager.getTasksRepository().updateTask(id, updateWithChecklists);
    
    // If there were no other fields to update but spec_state was already updated above,
    // do not treat "No fields to update" as an error. Return the fresh task instead.
    if (!result.success) {
      const msg = result.error || '';
      if (specStateUpdated && /No fields to update/i.test(msg)) {
        const justUpdated = await this.getTask(id);
        if (justUpdated) return justUpdated;
        // fallthrough to error if task not found
      }
      throw new Error(result.error || 'Failed to update task');
    }
    
    const updatedTask = await this.getTask(id);
    if (!updatedTask) {
      throw new Error('Task not found after update');
    }

    if (transitionEvaluation?.prompt) {
      (updatedTask as any).transition_prompt = transitionEvaluation.prompt;
    }
    if (transitionEvaluation?.bundle_results) {
      (updatedTask as any).transition_bundle_results = transitionEvaluation.bundle_results;
    }
    if (transitionEvaluation?.transition) {
      (updatedTask as any).transition_applied = transitionEvaluation.transition;
    }
    
    // Regenerate embedding if content changed
    if (updates.title || updates.description) {
      this.generateTaskEmbedding(updatedTask).catch(error => {
        logger.warn(`Failed to regenerate embedding for task ${id}:`, error);
      });
    }
    
    return updatedTask;
  }

  /**
   * Set spec_state with validation gates
   */
  async setSpecState(id: string, next: 'draft'|'spec_in_progress'|'spec_ready', actor?: string): Promise<ITask> {
    const current = await this.getTask(id) as any;
    if (!current) throw new Error('Task not found');
    const prev: 'draft'|'spec_in_progress'|'spec_ready' = current.spec_state || 'draft';

    // Allow same-state idempotency
    if (prev === next) return current as ITask;

    // Only allow forward transitions
    const order = ['draft','spec_in_progress','spec_ready'];
    if (order.indexOf(next) < order.indexOf(prev)) {
      throw new Error(`Cannot transition spec_state backwards from ${prev} to ${next}`);
    }

    // Require validation pass for spec_ready
    if (next === 'spec_ready') {
      const wfSvc = new (await import('../../workflows/services/WorkflowService.js')).WorkflowService(this.dbManager);
      const status = await wfSvc.validate(current as any, (current as any).workflow);
      if (!status.is_valid) {
        throw new Error('Cannot set spec_state=spec_ready: validation failed with missing requirements');
      }
      (current as any).last_validated_at = new Date();
      (current as any).validated_by = actor || 'system';
    }

    const result = await this.dbManager.getTasksRepository().updateTask(id, {
      ...(current as any),
      spec_state: next,
      last_validated_at: (current as any).last_validated_at,
      validated_by: (current as any).validated_by
    } as any);

    if (!result.success) throw new Error(result.error || 'Failed to update spec_state');
    const updated = await this.getTask(id);
    if (!updated) throw new Error('Task not found after spec_state update');
    return updated;
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    const result = await this.dbManager.getTasksRepository().deleteTask(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete task');
    }
  }

  /**
   * List tasks with optional criteria
   */
  async listTasks(criteria: TaskSearchCriteria = {}): Promise<ITask[]> {
    const result = await this.dbManager.getTasksRepository().searchTasks(criteria);
    return result.items;
  }

  /**
   * Search tasks with pagination
   */
  async searchTasks(criteria: TaskSearchCriteria = {}): Promise<SearchResult<ITask>> {
    return await this.dbManager.getTasksRepository().searchTasks(criteria);
  }

  /**
   * Search tasks with summary data only (for list views)
   */
  async searchTasksSummary(criteria: TaskSearchCriteria = {}): Promise<SearchResult<Partial<ITask>>> {
    const tasksRepo = this.dbManager.getTasksRepository() as any;
    if (tasksRepo.searchTasksSummary) {
      return await tasksRepo.searchTasksSummary(criteria);
    }
    // Fallback to regular search
    const result = await this.searchTasks(criteria);
    return {
      ...result,
      items: result.items.map(task => ({
        id: task.id,
        title: task.title,
        status: (task as any).status || task.task_status,
        priority: (task as any).priority || task.task_priority,
        type: (task as any).type || task.task_type,
        parent_id: task.parent_id
      }))
    };
  }

  /**
   * Get task hierarchy tree
   */
  async getTaskTree(rootId?: string, includeCompleted = true): Promise<ITask[]> {
    return await this.dbManager.getTasksRepository().getTaskTree(rootId, includeCompleted);
  }

  /**
   * Get task hierarchy tree with summary data only (for tree views)
   */
  async getTaskTreeSummary(rootId?: string, includeCompleted = true): Promise<Partial<ITask>[]> {
    const tasksRepo = this.dbManager.getTasksRepository() as any;
    if (tasksRepo.getTaskTreeSummary) {
      return await tasksRepo.getTaskTreeSummary(rootId, includeCompleted);
    }
    // Fallback to regular tree
    const tasks = await this.getTaskTree(rootId, includeCompleted);
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: (task as any).status || task.task_status,
      priority: (task as any).priority || task.task_priority,
      type: (task as any).type || task.task_type,
      parent_id: task.parent_id
    }));
  }

  /**
   * Get suggested next tasks
   */
  async getSuggestedTasks(limit = 10): Promise<ITask[]> {
    return await this.dbManager.getTasksRepository().getSuggestedTasks(limit);
  }

  /**
   * Get task count
   */
  async getTaskCount(): Promise<number> {
    return await this.dbManager.getTasksRepository().getTaskCount();
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<ITask[]> {
    const tasksRepo = this.dbManager.getTasksRepository() as any;
    if (tasksRepo.getAllTasks) {
      return await tasksRepo.getAllTasks();
    }
    const result = await this.searchTasks({ limit: 1000 });
    return result.items;
  }

  /**
   * Add a dependency between tasks
   */
  async addTaskDependency(params: TaskDependencyParams): Promise<TaskDependency> {
    const result = await this.dbManager.getTasksRepository().addTaskDependency({
      dependent_task_id: params.dependent_task_id,
      dependency_task_id: params.dependency_task_id,
      dependency_type: params.dependency_type || 'blocks',
      required: params.required !== false
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to add task dependency');
    }
    
    // Return a properly formatted TaskDependency
    return {
      id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dependent_task_id: params.dependent_task_id,
      dependency_task_id: params.dependency_task_id,
      dependency_type: params.dependency_type || 'blocks',
      required: params.required !== false,
      created_at: new Date().toISOString()
    } as TaskDependency;
  }

  /**
   * Remove a task dependency
   */
  async removeTaskDependency(dependencyId: string): Promise<void> {
    const result = await this.dbManager.getTasksRepository().removeTaskDependency(dependencyId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to remove task dependency');
    }
  }

  /**
   * Get task dependencies
   */
  async getTaskDependencies(
    taskId: string, 
    direction: 'incoming' | 'outgoing' | 'both' = 'both'
  ): Promise<TaskDependency[]> {
    const tasksRepo = this.dbManager.getTasksRepository();
    if (direction === 'outgoing') {
      return await tasksRepo.getTaskDependencies(taskId);
    } else if (direction === 'incoming') {
      return await tasksRepo.getDependentTasks(taskId);
    } else {
      const outgoing = await tasksRepo.getTaskDependencies(taskId);
      const incoming = await tasksRepo.getDependentTasks(taskId);
      return [...outgoing, ...incoming];
    }
  }

  /**
   * List all task dependencies
   */
  async listAllDependencies(): Promise<TaskDependency[]> {
    const tasksRepo = this.dbManager.getTasksRepository();
    return await tasksRepo.getAllDependencies();
  }

  /**
   * Generate embedding for a single task and store it
   */
  private async generateTaskEmbedding(task: ITask): Promise<void> {
    try {
      const embeddingResult = await this.embeddingService.generateTaskEmbedding(task);
      const embeddingRepo = this.dbManager.getEmbeddingRepository();
      await embeddingRepo.storeEmbedding(
        task.id,
        embeddingResult.embedding,
        String(embeddingResult.version),
        'task'
      );
    } catch (error) {
      logger.warn(`Failed to generate embedding for task ${task.id}:`, error);
    }
  }

  /**
   * Generate embeddings for tasks in batch
   */
  async generateTaskEmbeddingsBatch(tasks: ITask[]): Promise<void> {
    try {
      logger.info(`🧠 Generating embeddings for ${tasks.length} tasks...`);
      const startTime = Date.now();
      
      // Process tasks in smaller batches to avoid memory issues
      const BATCH_SIZE = 10;
      const results = { success: 0, failed: 0 };
      
      for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);
        
        // Generate embeddings for this batch
        const embeddingPromises = batch.map(async (task) => {
          try {
            const embeddingResult = await this.embeddingService.generateTaskEmbedding(task);
            const embeddingRepo = this.dbManager.getEmbeddingRepository();
            await embeddingRepo.storeEmbedding(
              task.id,
              embeddingResult.embedding,
              String(embeddingResult.version),
              'task'
            );
            return { success: true, taskId: task.id };
          } catch (error) {
            logger.warn(`Failed to generate embedding for task ${task.id}:`, error);
            return { success: false, taskId: task.id, error };
          }
        });
        
        const batchResults = await Promise.all(embeddingPromises);
        
        // Count successes and failures
        batchResults.forEach(result => {
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
          }
        });
      }
      
      const endTime = Date.now();
      logger.info(`✅ Generated embeddings for ${results.success} tasks (${results.failed} failed) in ${endTime - startTime}ms`);
    } catch (error) {
      logger.error('Failed to generate task embeddings in batch:', error);
    }
  }

  /**
   * Build task dependency graph
   * Returns adjacency list representation
   */
  async buildTaskDependencyGraph(): Promise<Map<string, string[]>> {
    const allTasks = await this.getAllTasks();
    const graph = new Map<string, string[]>();
    
    for (const task of allTasks) {
      const dependencies = await this.getTaskDependencies(task.id, 'outgoing');
      const dependencyIds = dependencies.map(dep => dep.dependency_task_id);
      
      if (dependencyIds.length > 0) {
        graph.set(task.id, dependencyIds);
      }
    }
    
    return graph;
  }

  /**
   * Find circular dependencies in tasks
   */
  async findCircularTaskDependencies(): Promise<string[][]> {
    const graph = await this.buildTaskDependencyGraph();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (taskId: string, path: string[]): void => {
      if (recursionStack.has(taskId)) {
        // Found a cycle
        const cycleStart = path.indexOf(taskId);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), taskId]);
        }
        return;
      }

      if (visited.has(taskId)) {
        return;
      }

      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const dependencies = graph.get(taskId) || [];
      for (const depId of dependencies) {
        dfs(depId, [...path]);
      }

      recursionStack.delete(taskId);
    };

    // Run DFS from all tasks to catch all cycles
    for (const taskId of graph.keys()) {
      if (!visited.has(taskId)) {
        dfs(taskId, []);
      }
    }

    return cycles;
  }

  /**
   * Get tasks that are blocked by a given task
   */
  async getBlockedTasks(taskId: string): Promise<ITask[]> {
    const dependencies = await this.getTaskDependencies(taskId, 'incoming');
    const blockedTaskIds = dependencies
      .filter(dep => dep.dependency_type === 'blocks')
      .map(dep => dep.dependent_task_id);
    
    const blockedTasks: ITask[] = [];
    for (const id of blockedTaskIds) {
      const task = await this.getTask(id);
      if (task) {
        blockedTasks.push(task);
      }
    }
    
    return blockedTasks;
  }

  /**
   * Get tasks that are blocking a given task
   */
  async getBlockingTasks(taskId: string): Promise<ITask[]> {
    const dependencies = await this.getTaskDependencies(taskId, 'outgoing');
    const blockingTaskIds = dependencies
      .filter(dep => dep.dependency_type === 'blocks')
      .map(dep => dep.dependency_task_id);
    
    const blockingTasks: ITask[] = [];
    for (const id of blockingTaskIds) {
      const task = await this.getTask(id);
      if (task) {
        blockingTasks.push(task);
      }
    }
    
    return blockingTasks;
  }

  /**
   * Suggest next tasks based on context and status
   */
  async suggestNextTasks(options: { context?: string; assignee?: string; limit?: number } = {}): Promise<ITask[]> {
    const { context, assignee, limit = 5 } = options;
    
    // Get all pending tasks
    const tasks = await this.searchTasks({ 
      task_status: 'todo' as any,
      assignee,
      limit: 50 
    } as any);
    
    // If context is provided, filter by relevance
    if (context) {
      // Simple relevance check - in real implementation would use embeddings
      const filtered = tasks.items.filter(task => 
        task.title?.toLowerCase().includes(context.toLowerCase()) ||
        task.description?.toLowerCase().includes(context.toLowerCase())
      );
      return filtered.slice(0, limit);
    }
    
    // Return high priority tasks first
    const sorted = tasks.items.sort((a, b) => {
      const priorityOrder: Record<string, number> = { 
        critical: 0, 
        high: 1, 
        medium: 2, 
        low: 3 
      };
      return (priorityOrder[a.task_priority || 'medium'] || 2) - 
             (priorityOrder[b.task_priority || 'medium'] || 2);
    });
    
    return sorted.slice(0, limit);
  }

  /**
   * Add checklist to a task
   */
  async addChecklist(taskId: string, checklist: { name: string; items: string[] }): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    // Initialize checklists if not exists
    const taskWithChecklists = task as any;
    if (!taskWithChecklists.checklists) {
      taskWithChecklists.checklists = [];
    }
    
    // Add new checklist
    taskWithChecklists.checklists.push({
      name: checklist.name,
      items: checklist.items.map((item: string) => ({
        text: item,
        checked: false
      }))
    });
    
    await this.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
  }

  /**
   * Toggle checklist item
   */
  async toggleChecklistItem(taskId: string, checklistName: string, itemIdentifier: string | number): Promise<void> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    const taskWithChecklists = task as any;
    const checklist = taskWithChecklists.checklists?.find((c: any) => c.name === checklistName);
    if (!checklist) {
      throw new Error('Checklist not found');
    }
    
    // Find item by index or text
    let itemIndex: number;
    if (typeof itemIdentifier === 'number') {
      itemIndex = itemIdentifier;
    } else {
      itemIndex = checklist.items.findIndex((item: any) => item.text === itemIdentifier);
    }
    
    if (itemIndex >= 0 && itemIndex < checklist.items.length) {
      checklist.items[itemIndex].checked = !checklist.items[itemIndex].checked;
      await this.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
    }
  }
}
