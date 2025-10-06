/**
 * Dependency model - Task dependency relationships
 */
/**
 * Dependency validation utility
 */
export class DependencyValidator {
    /**
     * Validate dependency data
     */
    static validate(dependency) {
        const errors = [];
        if (!dependency.dependent_task_id) {
            errors.push('Dependent task ID is required');
        }
        if (!dependency.dependency_task_id) {
            errors.push('Dependency task ID is required');
        }
        if (dependency.dependent_task_id === dependency.dependency_task_id) {
            errors.push('A task cannot depend on itself');
        }
        if (dependency.dependency_type && !['blocks', 'related', 'follows'].includes(dependency.dependency_type)) {
            errors.push('Invalid dependency type');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
/**
 * Dependency utility functions
 */
export class DependencyUtils {
    /**
     * Generate a unique dependency ID
     */
    static generateId() {
        return `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Convert database row to Dependency object
     */
    static fromDbRow(row) {
        return {
            id: row.id,
            dependent_task_id: row.dependent_task_id,
            dependency_task_id: row.dependency_task_id,
            dependency_type: row.dependency_type || 'blocks',
            required: Boolean(row.required),
            auto_created: Boolean(row.auto_created),
            created_at: new Date(row.created_at)
        };
    }
    /**
     * Convert Dependency object to database row
     */
    static toDbRow(dependency) {
        return {
            id: dependency.id,
            dependent_task_id: dependency.dependent_task_id,
            dependency_task_id: dependency.dependency_task_id,
            dependency_type: dependency.dependency_type,
            required: dependency.required,
            auto_created: dependency.auto_created,
            created_at: dependency.created_at.toISOString()
        };
    }
    /**
     * Check for circular dependencies in a dependency graph
     */
    static hasCircularDependency(dependencies, startTaskId, targetTaskId, visited = new Set()) {
        if (startTaskId === targetTaskId) {
            return true;
        }
        if (visited.has(startTaskId)) {
            return false; // Already processed this path
        }
        visited.add(startTaskId);
        // Find all tasks that the current task depends on
        const taskDependencies = dependencies.filter(dep => dep.dependent_task_id === startTaskId);
        for (const dep of taskDependencies) {
            if (this.hasCircularDependency(dependencies, dep.dependency_task_id, targetTaskId, new Set(visited))) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get dependency chain for a task
     */
    static getDependencyChain(dependencies, taskId) {
        const chain = [];
        const visited = new Set();
        const buildChain = (currentTaskId) => {
            if (visited.has(currentTaskId))
                return;
            visited.add(currentTaskId);
            const taskDeps = dependencies.filter(dep => dep.dependent_task_id === currentTaskId);
            for (const dep of taskDeps) {
                chain.push(dep.dependency_task_id);
                buildChain(dep.dependency_task_id);
            }
        };
        buildChain(taskId);
        return [...new Set(chain)]; // Remove duplicates
    }
    /**
     * Get tasks that depend on a given task
     */
    static getDependentTasks(dependencies, taskId) {
        return dependencies
            .filter(dep => dep.dependency_task_id === taskId)
            .map(dep => dep.dependent_task_id);
    }
    /**
     * Get tasks that a given task depends on
     */
    static getDependencyTasks(dependencies, taskId) {
        return dependencies
            .filter(dep => dep.dependent_task_id === taskId)
            .map(dep => dep.dependency_task_id);
    }
    /**
     * Sort tasks by dependency order (topological sort)
     */
    static sortByDependencyOrder(taskIds, dependencies) {
        const graph = new Map();
        const inDegree = new Map();
        // Initialize graph and in-degree count
        for (const taskId of taskIds) {
            graph.set(taskId, []);
            inDegree.set(taskId, 0);
        }
        // Build graph and calculate in-degrees
        for (const dep of dependencies) {
            if (taskIds.includes(dep.dependent_task_id) && taskIds.includes(dep.dependency_task_id)) {
                graph.get(dep.dependency_task_id).push(dep.dependent_task_id);
                inDegree.set(dep.dependent_task_id, inDegree.get(dep.dependent_task_id) + 1);
            }
        }
        // Topological sort using Kahn's algorithm
        const queue = [];
        const result = [];
        // Find tasks with no dependencies
        for (const [taskId, degree] of inDegree) {
            if (degree === 0) {
                queue.push(taskId);
            }
        }
        while (queue.length > 0) {
            const currentTask = queue.shift();
            result.push(currentTask);
            // Update in-degrees of dependent tasks
            for (const dependentTask of graph.get(currentTask)) {
                inDegree.set(dependentTask, inDegree.get(dependentTask) - 1);
                if (inDegree.get(dependentTask) === 0) {
                    queue.push(dependentTask);
                }
            }
        }
        // Check for circular dependencies
        if (result.length !== taskIds.length) {
            throw new Error('Circular dependency detected in task graph');
        }
        return result;
    }
    /**
     * Find critical path in task dependencies
     */
    static findCriticalPath(taskIds, dependencies, taskEfforts) {
        const graph = new Map();
        const reverseGraph = new Map();
        // Initialize graphs
        for (const taskId of taskIds) {
            graph.set(taskId, []);
            reverseGraph.set(taskId, []);
        }
        // Build graphs
        for (const dep of dependencies) {
            if (dep.dependency_type === 'blocks' && dep.required) {
                if (taskIds.includes(dep.dependent_task_id) && taskIds.includes(dep.dependency_task_id)) {
                    graph.get(dep.dependency_task_id).push(dep.dependent_task_id);
                    reverseGraph.get(dep.dependent_task_id).push(dep.dependency_task_id);
                }
            }
        }
        // Find longest path (critical path)
        const longestPaths = new Map();
        const paths = new Map();
        const calculateLongestPath = (taskId, visited) => {
            if (longestPaths.has(taskId)) {
                return longestPaths.get(taskId);
            }
            if (visited.has(taskId)) {
                throw new Error('Circular dependency detected');
            }
            visited.add(taskId);
            const taskEffort = taskEfforts.get(taskId) || 0;
            let maxPredecessorPath = 0;
            let bestPredecessor = '';
            for (const predecessor of reverseGraph.get(taskId)) {
                const predecessorPath = calculateLongestPath(predecessor, new Set(visited));
                if (predecessorPath > maxPredecessorPath) {
                    maxPredecessorPath = predecessorPath;
                    bestPredecessor = predecessor;
                }
            }
            const longestPath = taskEffort + maxPredecessorPath;
            longestPaths.set(taskId, longestPath);
            // Build path
            if (bestPredecessor) {
                paths.set(taskId, [...(paths.get(bestPredecessor) || []), bestPredecessor, taskId]);
            }
            else {
                paths.set(taskId, [taskId]);
            }
            return longestPath;
        };
        // Calculate longest paths for all tasks
        let maxTotalEffort = 0;
        let criticalPathEnd = '';
        for (const taskId of taskIds) {
            const pathLength = calculateLongestPath(taskId, new Set());
            if (pathLength > maxTotalEffort) {
                maxTotalEffort = pathLength;
                criticalPathEnd = taskId;
            }
        }
        return {
            path: paths.get(criticalPathEnd) || [],
            totalEffort: maxTotalEffort
        };
    }
}
//# sourceMappingURL=Dependency.js.map