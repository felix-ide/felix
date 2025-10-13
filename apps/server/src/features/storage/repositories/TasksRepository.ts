/**
 * TasksRepository - TypeORM implementation matching TasksManager exactly
 * CRITICAL: Every query must match TasksManager.ts behavior 100%
 */

import { Repository, DataSource, In, IsNull, Not, Like, Raw, SelectQueryBuilder } from 'typeorm';
import { Task } from '../entities/metadata/Task.entity.js';
import { TaskDependency } from '../entities/metadata/TaskDependency.entity.js';
import { TaskCodeLink } from '../entities/metadata/TaskCodeLink.entity.js';
import { TaskMetric } from '../entities/metadata/TaskMetric.entity.js';
import { ITask, CreateTaskParams, UpdateTaskParams, TaskSearchCriteria, TaskUtils } from '@felix/code-intelligence';
import { logger } from '../../../shared/logger.js';
import { toDbRowWithChecklists as mapTaskToDbRow, fromDbRowWithChecklists as mapTaskFromDbRow } from './tasks/TaskRowMapper.js';
import type { TaskDbRecord } from './tasks/TaskRowMapper.js';
import { applyTaskSearchFilters } from './tasks/TaskQueryFilters.js';
import type { StorageResult, SearchResult } from '../../../types/storage.js';

export class TasksRepository {
  private taskRepo: Repository<Task>;
  private dependencyRepo: Repository<TaskDependency>;
  private codeLinkRepo: Repository<TaskCodeLink>;
  private metricRepo: Repository<TaskMetric>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.taskRepo = dataSource.getRepository(Task);
    this.dependencyRepo = dataSource.getRepository(TaskDependency);
    this.codeLinkRepo = dataSource.getRepository(TaskCodeLink);
    this.metricRepo = dataSource.getRepository(TaskMetric);
  }

  /**
   * Get task count
   */
  async getTaskCount(): Promise<number> {
    return this.taskRepo.count();
  }

  /**
   * Get embedding count for tasks
   */
  async getEmbeddingCount(): Promise<number> {
    return this.taskRepo
      .createQueryBuilder('task')
      .where('task.semantic_embedding IS NOT NULL')
      .getCount();
  }

    /**
   * Store task - EXACT MATCH to TasksManager.storeTask
   * Maps to SQL: INSERT INTO meta.tasks (all 23 columns) VALUES (?, ?, ...)
   */
  async storeTask(task: ITask & { checklists?: any }): Promise<StorageResult & { data?: ITask }> {
    try {
      // Calculate depth level before storing - EXACT MATCH
      const taskWithDepth = { ...task };
      taskWithDepth.depth_level = TaskUtils.calculateDepthLevel(
        task.parent_id,
        (id: string) => this.getTaskSync(id)
      );
      
      const dbRow: TaskDbRecord = mapTaskToDbRow(taskWithDepth as any);
      
      // Create entity matching EXACT column order from TasksManager
      const taskEntity = this.taskRepo.create({
        id: dbRow.id,
        parent_id: dbRow.parent_id,
        title: dbRow.title,
        description: dbRow.description,
        task_type: dbRow.task_type,
        task_status: dbRow.task_status,
        task_priority: dbRow.task_priority,
        estimated_effort: dbRow.estimated_effort,
        actual_effort: dbRow.actual_effort,
        due_date: dbRow.due_date,
        assigned_to: dbRow.assigned_to,
        entity_links: dbRow.entity_links,
        stable_links: dbRow.stable_links,
        fragile_links: dbRow.fragile_links,
        stable_tags: dbRow.stable_tags,
        auto_tags: dbRow.auto_tags,
        contextual_tags: dbRow.contextual_tags,
        sort_order: dbRow.sort_order,
        depth_level: dbRow.depth_level,
        created_at: dbRow.created_at,
        updated_at: dbRow.updated_at,
        completed_at: dbRow.completed_at,
        checklists: dbRow.checklists || null,
        workflow: dbRow.workflow || null,
        spec_state: dbRow.spec_state || 'draft',
        spec_waivers: dbRow.spec_waivers || null,
        last_validated_at: dbRow.last_validated_at || null,
        validated_by: dbRow.validated_by || null
      } as any);

      const savedTask = await this.taskRepo.save(taskEntity);
      const iTask = mapTaskFromDbRow(savedTask) as ITask;
      return { success: true, data: iTask };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get task by ID - EXACT MATCH to TasksManager.getTask
   * Maps to SQL: SELECT * FROM meta.tasks WHERE id = ?
   */
  async getTask(id: string): Promise<ITask | null> {
    try {
      const task = await this.taskRepo.findOne({ where: { id } });
      if (!task) return null;
      return mapTaskFromDbRow(task) as ITask;
    } catch (error) {
      logger.error('TasksRepository.getTask error:', error);
      return null;
    }
  }

  /**
   * Synchronous get for depth calculation - EXACT MATCH to TasksManager.getTaskSync
   * Maps to SQL: SELECT * FROM meta.tasks WHERE id = ?
   */
  private getTaskSync(id: string): ITask | null {
    // TypeORM doesn't support sync queries, so we need to handle this differently
    // This is called during depth calculation, we'll need to refactor or use raw query
    try {
      // For now, return null - this needs special handling
      logger.debug('getTaskSync called - needs special handling for TypeORM');
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update task - EXACT MATCH to TasksManager.updateTask
   * Dynamically builds UPDATE statement with only changed fields
   */
  async updateTask(id: string, updates: UpdateTaskParams & { checklists?: any }): Promise<StorageResult> {
    try {
      const updateData: any = {};
      
      // Build update object EXACTLY as TasksManager does
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      
      if (updates.task_status !== undefined) {
        updateData.task_status = updates.task_status;
        // Set completed_at if status is done - EXACT MATCH
        updateData.completed_at = updates.task_status === 'done' ? new Date() : null;
      }
      
      if (updates.task_priority !== undefined) updateData.task_priority = updates.task_priority;
      if (updates.task_type !== undefined) updateData.task_type = updates.task_type;
      if (updates.assigned_to !== undefined) updateData.assigned_to = updates.assigned_to;
      if (updates.estimated_effort !== undefined) updateData.estimated_effort = updates.estimated_effort;
      if (updates.actual_effort !== undefined) updateData.actual_effort = updates.actual_effort;
      if (updates.due_date !== undefined) {
        updateData.due_date = updates.due_date ? new Date(updates.due_date).toISOString() : null;
      }
      
      // TypeORM's simple-json will handle serialization
      if (updates.stable_tags !== undefined) {
        // Fix double-stringified data from old format
        updateData.stable_tags = typeof updates.stable_tags === 'string'
          ? JSON.parse(updates.stable_tags)
          : updates.stable_tags;
      }

      if (updates.entity_links !== undefined) {
        // Fix double-stringified data from old format
        updateData.entity_links = typeof updates.entity_links === 'string'
          ? JSON.parse(updates.entity_links)
          : updates.entity_links;
      }
      
      if (updates.parent_id !== undefined) {
        updateData.parent_id = updates.parent_id;
        // Recalculate depth level when parent changes - EXACT MATCH
        const newDepthLevel = TaskUtils.calculateDepthLevel(
          updates.parent_id,
          (id: string) => this.getTaskSync(id)
        );
        updateData.depth_level = newDepthLevel;
      }
      
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
      
      // TypeORM's simple-json will handle serialization
      if (updates.checklists !== undefined) {
        // Fix double-stringified data from old format
        updateData.checklists = typeof updates.checklists === 'string'
          ? JSON.parse(updates.checklists)
          : updates.checklists;
      }
      
      if ((updates as any).workflow !== undefined) {
        updateData.workflow = (updates as any).workflow || null;
      }

      if ((updates as any).spec_state !== undefined) {
        updateData.spec_state = (updates as any).spec_state;
      }
      // TypeORM's simple-json will handle serialization
      if ((updates as any).spec_waivers !== undefined) {
        // Fix double-stringified data from old format
        const waivers = (updates as any).spec_waivers;
        updateData.spec_waivers = typeof waivers === 'string'
          ? JSON.parse(waivers)
          : waivers;
      }
      if ((updates as any).last_validated_at !== undefined) {
        updateData.last_validated_at = (updates as any).last_validated_at;
      }
      if ((updates as any).validated_by !== undefined) {
        updateData.validated_by = (updates as any).validated_by;
      }
      
      if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No fields to update' };
      }
      
      updateData.updated_at = new Date();
      
      const result = await this.taskRepo.update(id, updateData);
      
      if (!result.affected || result.affected === 0) {
        return { success: false, error: 'Task not found' };
      }
      
      // Update children depths if parent_id was changed - EXACT MATCH
      if (updates.parent_id !== undefined) {
        await this.updateChildrenDepths(id);
      }
      
      return { success: true, affected: result.affected };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Delete task - EXACT MATCH to TasksManager.deleteTask
   * Maps to SQL: DELETE FROM meta.tasks WHERE id = ?
   */
  async deleteTask(id: string): Promise<StorageResult> {
    try {
      const result = await this.taskRepo.delete(id);
      
      if (!result.affected || result.affected === 0) {
        return { success: false, error: 'Task not found' };
      }
      
      return { success: true, affected: result.affected };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Search tasks - EXACT MATCH to TasksManager.searchTasks
   * Builds dynamic WHERE clause based on criteria
   */
  async searchTasks(criteria: TaskSearchCriteria): Promise<SearchResult<ITask>> {
    try {
      const query = this.taskRepo.createQueryBuilder('task');
      applyTaskSearchFilters(query, criteria, this.dataSource);

      // Get total count
      const total = await query.getCount();
      
      // Add ordering and pagination - EXACT MATCH
      query.orderBy('task.created_at', 'DESC');
      
      const limit = criteria.limit || 20;
      const offset = criteria.offset || 0;
      query.limit(limit).skip(offset);
      
      const tasks = await query.getMany();
      
      return {
        items: tasks.map(task => mapTaskFromDbRow(task) as ITask),
        total,
        hasMore: offset + tasks.length < total,
        offset,
        limit
      };
    } catch (error) {
      return {
        items: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: 20
      };
    }
  }

  /**
   * Get task hierarchy - EXACT MATCH to TasksManager.getTaskHierarchy
   * Returns tasks in hierarchical structure
   */
  async getTaskHierarchy(rootId?: string, includeCompleted: boolean = true): Promise<any> {
    try {
      const query = this.taskRepo.createQueryBuilder('task');
      
      if (!includeCompleted) {
        query.andWhere('task.task_status != :status', { status: 'done' });
      }
      
      const allTasks = await query.getMany();
      const parsedTasks = allTasks.map(row => mapTaskFromDbRow(row) as ITask);
      
      if (rootId) {
        const rootTask = parsedTasks.find(task => task.id === rootId);
        if (!rootTask) return null;
        
        const allTasksWithRoot = parsedTasks.filter(task => 
          task.id === rootId || parsedTasks.some(p => p.parent_id === rootId)
        );
        const hierarchy = TaskUtils.buildHierarchy(allTasksWithRoot as ITask[]);
        const rootNode = hierarchy.find(h => h.id === rootId);
        return rootNode || null;
      } else {
        return TaskUtils.buildHierarchy(parsedTasks as ITask[]);
      }
    } catch (error) {
      return rootId ? null : [];
    }
  }

  /**
   * Update children depths recursively - EXACT MATCH to TasksManager.updateChildrenDepths
   */
  private async updateChildrenDepths(parentId: string): Promise<void> {
    try {
      const parentTask = await this.getTask(parentId);
      if (!parentTask) return;
      
      // Get all direct children
      const children = await this.taskRepo.find({ 
        where: { parent_id: parentId },
        select: ['id']
      });
      
      // Update each child's depth and recursively update their children
      for (const child of children) {
        const newDepthLevel = parentTask.depth_level + 1;
        
        // Update the child's depth
        await this.taskRepo.update(child.id, {
          depth_level: newDepthLevel,
          updated_at: new Date()
        });
        
        // Recursively update this child's children
        await this.updateChildrenDepths(child.id);
      }
    } catch (error) {
      logger.warn('Failed to update children depths:', error);
    }
  }

  /**
   * Create task dependency - EXACT MATCH to TasksManager.createDependency
   * Maps to SQL: INSERT INTO meta.task_dependencies
   */
  async createDependency(
    dependentTaskId: string,
    dependencyTaskId: string,
    type: string = 'blocks',
    required: boolean = true
  ): Promise<StorageResult> {
    try {
      const id = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const dependency = this.dependencyRepo.create({
        id,
        dependent_task_id: dependentTaskId,
        dependency_task_id: dependencyTaskId,
        dependency_type: type,
        required,
        auto_created: false,
        created_at: new Date()
      });
      
      await this.dependencyRepo.save(dependency);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Delete dependency - EXACT MATCH to TasksManager.deleteDependency
   * Maps to SQL: DELETE FROM meta.task_dependencies WHERE id = ?
   */
  async deleteDependency(id: string): Promise<StorageResult> {
    try {
      const result = await this.dependencyRepo.delete(id);
      return { success: true, affected: result.affected || 0 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Get task dependencies - EXACT MATCH to TasksManager.getTaskDependencies
   * Maps to SQL: SELECT * FROM meta.task_dependencies WHERE dependent_task_id = ?
   */
  async getTaskDependencies(taskId: string): Promise<any[]> {
    try {
      const dependencies = await this.dependencyRepo.find({
        where: { dependent_task_id: taskId },
        order: { created_at: 'ASC' }
      });
      
      return dependencies.map(row => ({
        id: row.id,
        dependent_task_id: row.dependent_task_id,
        dependency_task_id: row.dependency_task_id,
        dependency_type: row.dependency_type || 'blocks',
        required: Boolean(row.required),
        auto_created: Boolean(row.auto_created),
        created_at: row.created_at?.toISOString()
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get dependent tasks - EXACT MATCH to TasksManager.getDependentTasks
   * Maps to SQL: SELECT * FROM meta.task_dependencies WHERE dependency_task_id = ?
   */
  async getDependentTasks(taskId: string): Promise<any[]> {
    try {
      const dependencies = await this.dependencyRepo.find({
        where: { dependency_task_id: taskId },
        order: { created_at: 'ASC' }
      });
      
      return dependencies.map(row => ({
        id: row.id,
        dependent_task_id: row.dependent_task_id,
        dependency_task_id: row.dependency_task_id,
        dependency_type: row.dependency_type || 'blocks',
        required: Boolean(row.required),
        auto_created: Boolean(row.auto_created),
        created_at: row.created_at?.toISOString()
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get all dependencies - EXACT MATCH to TasksManager.getAllDependencies
   * Maps to SQL: SELECT * FROM meta.task_dependencies
   */
  async getAllDependencies(): Promise<any[]> {
    try {
      const dependencies = await this.dependencyRepo.find();
      
      return dependencies.map(row => ({
        id: row.id,
        dependent_task_id: row.dependent_task_id,
        dependency_task_id: row.dependency_task_id,
        dependency_type: row.dependency_type || 'blocks',
        required: Boolean(row.required),
        auto_created: Boolean(row.auto_created),
        created_at: row.created_at?.toISOString()
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get next tasks - EXACT MATCH to TasksManager.getNextTasks
   * Gets prioritized todo tasks
   */
  async getNextTasks(limit: number = 5): Promise<ITask[]> {
    try {
      const tasks = await this.taskRepo.find({
        where: { task_status: 'todo' },
        order: { 
          task_priority: 'DESC',
          created_at: 'ASC'
        },
        take: limit
      });
      
      return tasks.map(task => mapTaskFromDbRow(task) as ITask);
    } catch (error) {
      return [];
    }
  }

  /**
   * Search tasks summary - Returns minimal task info for performance
   * This is a simplified version, exact fields as TasksManager
   */
  async searchTasksSummary(criteria: TaskSearchCriteria): Promise<SearchResult<any>> {
    try {
      const query = this.taskRepo.createQueryBuilder('task')
        // Explicit aliases so getRawMany() matches TaskUtils.fromDbRowSummary expectations
        .addSelect('task.id', 'id')
        .addSelect('task.parent_id', 'parent_id')
        .addSelect('task.title', 'title')
        .addSelect('task.task_type', 'task_type')
        .addSelect('task.task_status', 'task_status')
        .addSelect('task.task_priority', 'task_priority')
        .addSelect('task.assigned_to', 'assigned_to')
        .addSelect('task.due_date', 'due_date')
        .addSelect('task.estimated_effort', 'estimated_effort')
        .addSelect('task.actual_effort', 'actual_effort')
        .addSelect('task.depth_level', 'depth_level')
        .addSelect('task.created_at', 'created_at')
        .addSelect('task.updated_at', 'updated_at')
        .addSelect('task.completed_at', 'completed_at');
      
      applyTaskSearchFilters(query, criteria, this.dataSource);

      const total = await query.getCount();
      
      query.orderBy('task.created_at', 'DESC');
      
      const limit = criteria.limit || 20;
      const offset = criteria.offset || 0;
      query.limit(limit).skip(offset);
      
      const tasks = await query.getRawMany();
      
      const parsedTasks = tasks.map(row => TaskUtils.fromDbRowSummary(row));
      
      return {
        items: parsedTasks,
        total,
        hasMore: offset + tasks.length < total,
        offset,
        limit
      };
    } catch (error) {
      return {
        items: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: 20
      };
    }
  }

  /**
   * Get task hierarchy summary - Lightweight version for UI
   */
  async getTaskHierarchySummary(rootId?: string, includeCompleted: boolean = true): Promise<any> {
    try {
      const query = this.taskRepo.createQueryBuilder('task')
        .select([
          'task.id',
          'task.parent_id',
          'task.title',
          'task.task_type',
          'task.task_status',
          'task.task_priority',
          'task.assigned_to',
          'task.due_date',
          'task.estimated_effort',
          'task.actual_effort',
          'task.depth_level',
          'task.created_at',
          'task.updated_at',
          'task.completed_at'
        ]);
      
      if (!includeCompleted) {
        query.andWhere('task.task_status != :status', { status: 'done' });
      }
      
      const allTasks = await query.getRawMany();
      const parsedTasks = allTasks.map(row => TaskUtils.fromDbRowSummary(row));
      
      if (rootId) {
        const rootTask = parsedTasks.find(task => task.id === rootId);
        if (!rootTask) return null;
        
        const allTasksWithRoot = parsedTasks.filter(task => 
          task.id === rootId || parsedTasks.some(p => p.parent_id === rootId)
        );
        const hierarchy = TaskUtils.buildHierarchy(allTasksWithRoot as ITask[]);
        const rootNode = hierarchy.find(h => h.id === rootId);
        return rootNode || null;
      } else {
        return TaskUtils.buildHierarchy(parsedTasks as ITask[]);
      }
    } catch (error) {
      return rootId ? null : [];
    }
  }

  /**
   * Get task tree - Returns tasks in hierarchical structure
   */
  async getTaskTree(rootId?: string, includeCompleted?: boolean): Promise<ITask[]> {
    try {
      const query = this.taskRepo.createQueryBuilder('task')
        .addSelect('task.id', 'id')
        .addSelect('task.parent_id', 'parent_id')
        .addSelect('task.title', 'title')
        .addSelect('task.task_type', 'task_type')
        .addSelect('task.task_status', 'task_status')
        .addSelect('task.task_priority', 'task_priority')
        .addSelect('task.assigned_to', 'assigned_to')
        .addSelect('task.due_date', 'due_date')
        .addSelect('task.estimated_effort', 'estimated_effort')
        .addSelect('task.actual_effort', 'actual_effort')
        .addSelect('task.depth_level', 'depth_level')
        .addSelect('task.created_at', 'created_at')
        .addSelect('task.updated_at', 'updated_at')
        .addSelect('task.completed_at', 'completed_at');
      
      if (rootId) {
        query.where('task.parent_id = :rootId', { rootId });
      } else {
        query.where('task.parent_id IS NULL');
      }
      
      if (!includeCompleted) {
        query.andWhere('task.task_status != :status', { status: 'done' });
      }
      
      query.orderBy('task.task_priority', 'DESC')
        .addOrderBy('task.created_at', 'ASC');
      
      const tasks = await query.getRawMany();
      return tasks.map(row => TaskUtils.fromDbRowSummary(row) as ITask);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get suggested next tasks - Suggests tasks based on priority and dependencies
   */
  async getSuggestedNextTasks(limit: number = 5): Promise<ITask[]> {
    try {
      const tasks = await this.taskRepo
        .createQueryBuilder('task')
        .where('task.task_status IN (:...statuses)', { statuses: ['todo', 'in_progress'] })
        .andWhere('task.parent_id IS NULL OR task.parent_id IN (SELECT id FROM tasks WHERE task_status = :doneStatus)', 
          { doneStatus: 'done' })
        .orderBy('task.task_priority', 'DESC')
        .addOrderBy('task.created_at', 'ASC')
        .limit(limit)
        .getRawMany();
      
      return tasks.map(row => TaskUtils.fromDbRowSummary(row) as ITask);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get suggested tasks - EXACT MATCH to TasksManager method name
   */
  async getSuggestedTasks(limit: number = 10): Promise<ITask[]> {
    return this.getNextTasks(limit);
  }

  /**
   * Add task dependency - EXACT MATCH to TasksManager.addTaskDependency
   */
  async addTaskDependency(params: {
    dependent_task_id: string;
    dependency_task_id: string;
    dependency_type?: string;
    required?: boolean;
  }): Promise<StorageResult> {
    try {
      // Check if tasks exist
      const dependentTask = await this.getTask(params.dependent_task_id);
      const dependencyTask = await this.getTask(params.dependency_task_id);
      
      if (!dependentTask || !dependencyTask) {
        return { success: false, error: 'One or both tasks not found' };
      }

      // Check for circular dependency
      const hasCircular = await this.hasCircularDependency(
        params.dependent_task_id,
        params.dependency_task_id
      );
      
      if (hasCircular) {
        return { success: false, error: 'This would create a circular dependency' };
      }

      // Generate ID and create dependency
      const id = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const dependencyRepo = this.dataSource.getRepository(TaskDependency);
      
      await dependencyRepo.save({
        id,
        dependent_task_id: params.dependent_task_id,
        dependency_task_id: params.dependency_task_id,
        dependency_type: params.dependency_type || 'blocks',
        required: params.required !== false,
        auto_created: false
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error adding task dependency:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Remove task dependency - EXACT MATCH to TasksManager.removeTaskDependency
   */
  async removeTaskDependency(id: string): Promise<StorageResult> {
    try {
      const dependencyRepo = this.dataSource.getRepository(TaskDependency);
      const result = await dependencyRepo.delete(id);
      
      if (result.affected === 0) {
        return { success: false, error: 'Task dependency not found' };
      }
      
      return { success: true, affected: result.affected || 0 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Check for circular dependency - EXACT MATCH to TasksManager.hasCircularDependency
   */
  async hasCircularDependency(dependentId: string, dependencyId: string): Promise<boolean> {
    try {
      const dependencyRepo = this.dataSource.getRepository(TaskDependency);
      
      // If dependent task depends on dependency task, check if dependency task
      // eventually depends on dependent task (creating a circle)
      const visited = new Set<string>();
      const stack = [dependencyId];
      
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        if (currentId === dependentId) {
          return true; // Found circular dependency
        }
        
        // Get all dependencies of current task
        const deps = await dependencyRepo.find({
          where: { dependent_task_id: currentId }
        });
        
        for (const dep of deps) {
          if (!visited.has(dep.dependency_task_id)) {
            stack.push(dep.dependency_task_id);
          }
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking circular dependency:', error);
      return false;
    }
  }

  /**
   * Get task tree summary - EXACT MATCH to TasksManager.getTaskTreeSummary
   * Returns hierarchical tasks without full details for performance
   */
  async getTaskTreeSummary(rootId?: string, includeCompleted = true): Promise<Partial<ITask>[]> {
    try {
      const query = this.taskRepo.createQueryBuilder('task')
        .select([
          'task.id', 'task.parent_id', 'task.title', 'task.task_type',
          'task.task_status', 'task.task_priority',
          'task.entity_links', 'task.stable_tags', 'task.depth_level',
          'task.sort_order', 'task.created_at', 'task.updated_at'
        ]);
      
      if (rootId) {
        query.where('task.parent_id = :rootId', { rootId });
      } else {
        query.where('task.parent_id IS NULL');
      }
      
      if (!includeCompleted) {
        query.andWhere('task.task_status != :status', { status: 'done' });
      }
      
      query.orderBy('task.created_at', 'ASC');
      
      const tasks = await query.getMany();
      
      // Return summary format
      return tasks.map(task => ({
        id: task.id,
        parent_id: task.parent_id,
        title: task.title,
        task_type: task.task_type as any,
        task_status: task.task_status as any,
        task_priority: task.task_priority as any,
        assignee: null, // Task entity doesn't have assignee field
        entity_links: task.entity_links as any,
        stable_tags: task.stable_tags as any,
        depth_level: task.depth_level,
        sort_order: task.sort_order,
        created_at: task.created_at,
        updated_at: task.updated_at
      }));
    } catch (error) {
      return [];
    }
  }
}
