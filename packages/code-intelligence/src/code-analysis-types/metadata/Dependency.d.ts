/**
 * Dependency model - Task dependency relationships
 */
import { DependencyType } from './Task.js';
/**
 * Task dependency interface
 */
export interface IDependency {
    id: string;
    dependent_task_id: string;
    dependency_task_id: string;
    dependency_type: DependencyType;
    required: boolean;
    auto_created: boolean;
    created_at: Date;
}
/**
 * Dependency creation parameters
 */
export interface CreateDependencyParams {
    dependent_task_id: string;
    dependency_task_id: string;
    dependency_type?: DependencyType;
    required?: boolean;
}
/**
 * Dependency search criteria
 */
export interface DependencySearchCriteria {
    task_id?: string;
    direction?: 'incoming' | 'outgoing' | 'both';
    dependency_type?: DependencyType;
    required?: boolean;
    limit?: number;
    offset?: number;
}
/**
 * Dependency validation utility
 */
export declare class DependencyValidator {
    /**
     * Validate dependency data
     */
    static validate(dependency: Partial<IDependency>): {
        valid: boolean;
        errors: string[];
    };
}
/**
 * Dependency utility functions
 */
export declare class DependencyUtils {
    /**
     * Generate a unique dependency ID
     */
    static generateId(): string;
    /**
     * Convert database row to Dependency object
     */
    static fromDbRow(row: any): IDependency;
    /**
     * Convert Dependency object to database row
     */
    static toDbRow(dependency: IDependency): any;
    /**
     * Check for circular dependencies in a dependency graph
     */
    static hasCircularDependency(dependencies: IDependency[], startTaskId: string, targetTaskId: string, visited?: Set<string>): boolean;
    /**
     * Get dependency chain for a task
     */
    static getDependencyChain(dependencies: IDependency[], taskId: string): string[];
    /**
     * Get tasks that depend on a given task
     */
    static getDependentTasks(dependencies: IDependency[], taskId: string): string[];
    /**
     * Get tasks that a given task depends on
     */
    static getDependencyTasks(dependencies: IDependency[], taskId: string): string[];
    /**
     * Sort tasks by dependency order (topological sort)
     */
    static sortByDependencyOrder(taskIds: string[], dependencies: IDependency[]): string[];
    /**
     * Find critical path in task dependencies
     */
    static findCriticalPath(taskIds: string[], dependencies: IDependency[], taskEfforts: Map<string, number>): {
        path: string[];
        totalEffort: number;
    };
}
/**
 * Default export
 */
export { IDependency as Dependency };
//# sourceMappingURL=Dependency.d.ts.map