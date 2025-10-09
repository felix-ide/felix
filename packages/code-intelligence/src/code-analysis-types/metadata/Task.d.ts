/**
 * Task model - Hierarchical project management with code linking
 */
import { EntityType, NoteLinks, NoteTags } from './Note.js';
/**
 * Task types for categorization - Hierarchical levels
 */
export type TaskType = 'epic' | 'story' | 'task' | 'subtask' | 'milestone' | 'bug' | 'spike' | 'chore';
/**
 * Task status enumeration
 */
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
/**
 * Task dependency types
 */
export type DependencyType = 'blocks' | 'related' | 'follows';
/**
 * Task-code link types
 */
export type LinkType = 'implements' | 'affects' | 'tests';
/**
 * Core Task interface
 */
export interface ITask {
    id: string;
    parent_id?: string;
    title: string;
    description?: string;
    task_type: TaskType;
    task_status: TaskStatus;
    task_priority: TaskPriority;
    estimated_effort?: string;
    actual_effort?: string;
    due_date?: Date;
    assigned_to?: string;
    entity_links?: Array<{
        entity_type: EntityType;
        entity_id: string;
        entity_name?: string;
        link_strength?: 'primary' | 'secondary' | 'reference';
    }>;
    links?: NoteLinks;
    tags?: NoteTags;
    sort_order: number;
    depth_level: number;
    created_at: Date;
    updated_at: Date;
    completed_at?: Date;
}
/**
 * Task dependency interface
 */
export interface ITaskDependency {
    id: string;
    dependent_task_id: string;
    dependency_task_id: string;
    dependency_type: DependencyType;
    required: boolean;
    auto_created: boolean;
    created_at: Date;
}
/**
 * Task-code link interface
 */
export interface ITaskCodeLink {
    id: string;
    task_id: string;
    entity_type: EntityType;
    entity_id: string;
    link_type: LinkType;
    confidence: number;
    auto_detected: boolean;
    last_verified: Date;
    code_hash?: string;
    created_at: Date;
}
/**
 * Task metrics interface
 */
export interface ITaskMetrics {
    task_id: string;
    completion_percentage: number;
    subtasks_total: number;
    subtasks_completed: number;
    dependencies_total: number;
    dependencies_completed: number;
    time_logged: string;
    linked_components: number;
    affected_files: number;
    is_blocked: boolean;
    blocking_count: number;
    critical_path: boolean;
    updated_at: Date;
}
/**
 * Task creation parameters
 */
export interface CreateTaskParams {
    title: string;
    description?: string;
    parent_id?: string;
    task_type?: TaskType;
    task_status?: TaskStatus;
    task_priority?: TaskPriority;
    estimated_effort?: string;
    actual_effort?: string;
    due_date?: Date;
    assigned_to?: string;
    entity_links?: Array<{
        entity_type: EntityType;
        entity_id: string;
        entity_name?: string;
        link_strength?: 'primary' | 'secondary' | 'reference';
    }>;
    stable_tags?: string[];
}
/**
 * Task update parameters
 */
export interface UpdateTaskParams {
    title?: string;
    description?: string;
    task_type?: TaskType;
    task_status?: TaskStatus;
    task_priority?: TaskPriority;
    assigned_to?: string;
    estimated_effort?: string;
    actual_effort?: string;
    due_date?: Date;
    stable_tags?: string[];
    transition_gate_token?: string;
    transition_gate_response?: string;
    entity_links?: Array<{
        entity_type: EntityType;
        entity_id: string;
        entity_name?: string;
        link_strength?: 'primary' | 'secondary' | 'reference';
    }>;
    parent_id?: string;
    sort_order?: number;
}
/**
 * Task search criteria
 */
export interface TaskSearchCriteria {
    parent_id?: string;
    entity_type?: EntityType;
    entity_id?: string;
    task_status?: TaskStatus;
    task_type?: TaskType;
    task_priority?: TaskPriority;
    assigned_to?: string;
    query?: string;
    include_children?: boolean;
    limit?: number;
    offset?: number;
}
/**
 * Task dependency creation parameters
 */
export interface CreateDependencyParams {
    dependent_task_id: string;
    dependency_task_id: string;
    dependency_type?: DependencyType;
    required?: boolean;
}
/**
 * Task validation utility
 */
export declare class TaskValidator {
    /**
     * Validate task data
     */
    static validate(task: Partial<ITask>): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate effort format (1h, 2d, 1w, etc.)
     */
    private static isValidEffort;
    /**
     * Validate task dependency
     */
    static validateDependency(dep: Partial<ITaskDependency>): {
        valid: boolean;
        errors: string[];
    };
}
/**
 * Task utility functions
 */
export declare class TaskUtils {
    /**
     * Generate a unique task ID
     */
    static generateId(): string;
    /**
     * Generate a unique dependency ID
     */
    static generateDependencyId(): string;
    /**
     * Generate a unique link ID
     */
    static generateLinkId(): string;
    /**
     * Create a task from creation parameters
     */
    static createFromParams(params: CreateTaskParams): ITask;
    /**
     * Convert database row to Task object
     */
    static fromDbRow(row: any): ITask;
    /**
     * Convert database row to Task summary object (for list/tree views)
     */
    static fromDbRowSummary(row: any): Partial<ITask>;
    /**
     * Convert Task object to database row
     */
    static toDbRow(task: ITask): any;
    /**
     * Calculate task completion percentage
     */
    static calculateCompletion(task: ITask, subtasks: ITask[]): number;
    /**
     * Parse effort string to hours
     */
    static parseEffortToHours(effort: string): number;
    /**
     * Format hours to effort string
     */
    static formatHoursToEffort(hours: number): string;
    /**
     * Check if task is overdue
     */
    static isOverdue(task: ITask): boolean;
    /**
     * Get task priority weight for sorting
     */
    static getPriorityWeight(priority: TaskPriority): number;
    /**
     * Build task hierarchy tree
     */
    static buildHierarchy(tasks: ITask[]): ITask[];
    /**
     * Build task hierarchy tree with summary data only
     */
    static buildHierarchySummary(tasks: Partial<ITask>[]): Partial<ITask>[];
    /**
     * Calculate depth level for a task based on its parent
     */
    static calculateDepthLevel(parentId: string | undefined, getTaskFunction: (id: string) => ITask | null): number;
    /**
     * Check for circular dependencies
     */
    static hasCircularDependency(taskId: string, dependencies: ITaskDependency[], visited?: Set<string>): boolean;
}
/**
 * Default export
 */
export { ITask as Task };
//# sourceMappingURL=Task.d.ts.map
