/**
 * Task model - Hierarchical project management with code linking
 */
/**
 * Task validation utility
 */
export class TaskValidator {
    /**
     * Validate task data
     */
    static validate(task) {
        const errors = [];
        if (!task.title || task.title.trim().length === 0) {
            errors.push('Title is required');
        }
        if (task.title && task.title.length > 200) {
            errors.push('Title exceeds maximum length (200 characters)');
        }
        if (task.task_type && !['epic', 'story', 'task', 'subtask', 'milestone', 'bug', 'spike', 'chore'].includes(task.task_type)) {
            errors.push('Invalid task type');
        }
        if (task.task_status && !['todo', 'in_progress', 'blocked', 'done', 'cancelled'].includes(task.task_status)) {
            errors.push('Invalid task status');
        }
        if (task.task_priority && !['low', 'medium', 'high', 'critical'].includes(task.task_priority)) {
            errors.push('Invalid task priority');
        }
        if (task.estimated_effort && !TaskValidator.isValidEffort(task.estimated_effort)) {
            errors.push('Invalid estimated effort format (use format like: 1h, 2d, 1w)');
        }
        if (task.actual_effort && !TaskValidator.isValidEffort(task.actual_effort)) {
            errors.push('Invalid actual effort format (use format like: 1h, 2d, 1w)');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Validate effort format (1h, 2d, 1w, etc.)
     */
    static isValidEffort(effort) {
        const effortRegex = /^\d+[hdw]$/;
        return effortRegex.test(effort);
    }
    /**
     * Validate task dependency
     */
    static validateDependency(dep) {
        const errors = [];
        if (!dep.dependent_task_id) {
            errors.push('Dependent task ID is required');
        }
        if (!dep.dependency_task_id) {
            errors.push('Dependency task ID is required');
        }
        if (dep.dependent_task_id === dep.dependency_task_id) {
            errors.push('A task cannot depend on itself');
        }
        if (dep.dependency_type && !['blocks', 'related', 'follows'].includes(dep.dependency_type)) {
            errors.push('Invalid dependency type');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
/**
 * Task utility functions
 */
export class TaskUtils {
    /**
     * Generate a unique task ID
     */
    static generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate a unique dependency ID
     */
    static generateDependencyId() {
        return `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Generate a unique link ID
     */
    static generateLinkId() {
        return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Create a task from creation parameters
     */
    static createFromParams(params) {
        const now = new Date();
        return {
            id: this.generateId(),
            parent_id: params.parent_id,
            title: params.title,
            description: params.description,
            task_type: params.task_type || 'task',
            task_status: params.task_status || 'todo',
            task_priority: params.task_priority || 'medium',
            estimated_effort: params.estimated_effort,
            due_date: params.due_date,
            entity_links: params.entity_links,
            tags: params.stable_tags ? { stable_tags: params.stable_tags } : undefined,
            sort_order: 0,
            depth_level: 0, // Will be calculated when stored
            created_at: now,
            updated_at: now
        };
    }
    /**
     * Convert database row to Task object
     */
    static fromDbRow(row) {
        const task = {
            id: row.id,
            title: row.title,
            task_type: row.task_type || 'task',
            task_status: row.task_status || 'todo',
            task_priority: row.task_priority || 'medium',
            sort_order: row.sort_order || 0,
            depth_level: row.depth_level || 0,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
        // Add optional properties only if they exist
        if (row.parent_id)
            task.parent_id = row.parent_id;
        if (row.description)
            task.description = row.description;
        if (row.estimated_effort)
            task.estimated_effort = row.estimated_effort;
        if (row.actual_effort)
            task.actual_effort = row.actual_effort;
        if (row.due_date)
            task.due_date = new Date(row.due_date);
        if (row.assigned_to)
            task.assigned_to = row.assigned_to;
        if (row.entity_links) {
            task.entity_links = JSON.parse(row.entity_links);
        }
        if (row.completed_at)
            task.completed_at = new Date(row.completed_at);
        // Handle links
        const hasLinks = row.stable_links || row.fragile_links || row.semantic_context;
        if (hasLinks) {
            task.links = {};
            if (row.stable_links)
                task.links.stable_links = JSON.parse(row.stable_links);
            if (row.fragile_links)
                task.links.fragile_links = JSON.parse(row.fragile_links);
            if (row.semantic_context)
                task.links.semantic_context = row.semantic_context;
        }
        // Handle tags
        const hasTags = row.stable_tags || row.auto_tags || row.contextual_tags;
        if (hasTags) {
            task.tags = {};
            if (row.stable_tags)
                task.tags.stable_tags = JSON.parse(row.stable_tags);
            if (row.auto_tags)
                task.tags.auto_tags = JSON.parse(row.auto_tags);
            if (row.contextual_tags)
                task.tags.contextual_tags = JSON.parse(row.contextual_tags);
        }
        return task;
    }
    /**
     * Convert database row to Task summary object (for list/tree views)
     */
    static fromDbRowSummary(row) {
        const task = {
            id: row.id,
            title: row.title,
            task_type: row.task_type || 'task',
            task_status: row.task_status || 'todo',
            task_priority: row.task_priority || 'medium',
            sort_order: row.sort_order || 0,
            depth_level: row.depth_level || 0,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
        // Add optional properties only if they exist
        if (row.parent_id)
            task.parent_id = row.parent_id;
        if (row.estimated_effort)
            task.estimated_effort = row.estimated_effort;
        if (row.actual_effort)
            task.actual_effort = row.actual_effort;
        if (row.due_date)
            task.due_date = new Date(row.due_date);
        if (row.assigned_to)
            task.assigned_to = row.assigned_to;
        if (row.completed_at)
            task.completed_at = new Date(row.completed_at);
        return task;
    }
    /**
     * Convert Task object to database row
     */
    static toDbRow(task) {
        return {
            id: task.id,
            parent_id: task.parent_id || null,
            title: task.title,
            description: task.description || null,
            task_type: task.task_type,
            task_status: task.task_status,
            task_priority: task.task_priority,
            estimated_effort: task.estimated_effort || null,
            actual_effort: task.actual_effort || null,
            due_date: task.due_date ? task.due_date.toISOString() : null,
            assigned_to: task.assigned_to || null,
            entity_links: task.entity_links ? JSON.stringify(task.entity_links) : null,
            stable_links: task.links?.stable_links ? JSON.stringify(task.links.stable_links) : null,
            fragile_links: task.links?.fragile_links ? JSON.stringify(task.links.fragile_links) : null,
            stable_tags: task.tags?.stable_tags ? JSON.stringify(task.tags.stable_tags) : null,
            auto_tags: task.tags?.auto_tags ? JSON.stringify(task.tags.auto_tags) : null,
            contextual_tags: task.tags?.contextual_tags ? JSON.stringify(task.tags.contextual_tags) : null,
            sort_order: task.sort_order,
            depth_level: task.depth_level,
            created_at: task.created_at.toISOString(),
            updated_at: task.updated_at.toISOString(),
            completed_at: task.completed_at ? task.completed_at.toISOString() : null
        };
    }
    /**
     * Calculate task completion percentage
     */
    static calculateCompletion(task, subtasks) {
        if (subtasks.length === 0) {
            return task.task_status === 'done' ? 100 : 0;
        }
        const completedSubtasks = subtasks.filter(subtask => subtask.task_status === 'done');
        return Math.round((completedSubtasks.length / subtasks.length) * 100);
    }
    /**
     * Parse effort string to hours
     */
    static parseEffortToHours(effort) {
        const match = effort.match(/^(\d+)([hdw])$/);
        if (!match)
            return 0;
        const [, amount, unit] = match;
        if (!amount)
            return 0;
        const num = parseInt(amount, 10);
        switch (unit) {
            case 'h': return num;
            case 'd': return num * 8; // 8 hours per day
            case 'w': return num * 40; // 40 hours per week
            default: return 0;
        }
    }
    /**
     * Format hours to effort string
     */
    static formatHoursToEffort(hours) {
        if (hours < 8) {
            return `${hours}h`;
        }
        else if (hours < 40) {
            const days = Math.round(hours / 8);
            return `${days}d`;
        }
        else {
            const weeks = Math.round(hours / 40);
            return `${weeks}w`;
        }
    }
    /**
     * Check if task is overdue
     */
    static isOverdue(task) {
        if (!task.due_date || task.task_status === 'done' || task.task_status === 'cancelled') {
            return false;
        }
        return task.due_date < new Date();
    }
    /**
     * Get task priority weight for sorting
     */
    static getPriorityWeight(priority) {
        switch (priority) {
            case 'critical': return 4;
            case 'high': return 3;
            case 'medium': return 2;
            case 'low': return 1;
            default: return 2;
        }
    }
    /**
     * Build task hierarchy tree
     */
    static buildHierarchy(tasks) {
        const taskMap = new Map();
        const rootTasks = [];
        // Create task map
        for (const task of tasks) {
            taskMap.set(task.id, { ...task, children: [] });
        }
        // Build hierarchy
        for (const task of tasks) {
            const taskWithChildren = taskMap.get(task.id);
            if (task.parent_id) {
                const parent = taskMap.get(task.parent_id);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(taskWithChildren);
                }
                else {
                    // Parent not found, treat as root
                    rootTasks.push(taskWithChildren);
                }
            }
            else {
                rootTasks.push(taskWithChildren);
            }
        }
        // Sort by sort_order
        const sortTasks = (tasks) => {
            return tasks.sort((a, b) => a.sort_order - b.sort_order).map(task => {
                const taskWithChildren = task;
                if (taskWithChildren.children && taskWithChildren.children.length > 0) {
                    taskWithChildren.children = sortTasks(taskWithChildren.children);
                }
                return task;
            });
        };
        return sortTasks(rootTasks);
    }
    /**
     * Build task hierarchy tree with summary data only
     */
    static buildHierarchySummary(tasks) {
        const taskMap = new Map();
        const rootTasks = [];
        // Create task map
        for (const task of tasks) {
            if (task.id) {
                taskMap.set(task.id, { ...task, children: [] });
            }
        }
        // Build hierarchy
        for (const task of tasks) {
            if (!task.id)
                continue;
            const taskWithChildren = taskMap.get(task.id);
            if (task.parent_id) {
                const parent = taskMap.get(task.parent_id);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(taskWithChildren);
                }
                else {
                    // Parent not found, treat as root
                    rootTasks.push(taskWithChildren);
                }
            }
            else {
                rootTasks.push(taskWithChildren);
            }
        }
        // Sort by sort_order
        const sortTasks = (tasks) => {
            return tasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(task => {
                const taskWithChildren = task;
                if (taskWithChildren.children && taskWithChildren.children.length > 0) {
                    taskWithChildren.children = sortTasks(taskWithChildren.children);
                }
                return task;
            });
        };
        return sortTasks(rootTasks);
    }
    /**
     * Calculate depth level for a task based on its parent
     */
    static calculateDepthLevel(parentId, getTaskFunction) {
        if (!parentId) {
            return 0; // Root level task
        }
        const parent = getTaskFunction(parentId);
        if (!parent) {
            return 0; // Parent not found, treat as root
        }
        return parent.depth_level + 1;
    }
    /**
     * Check for circular dependencies
     */
    static hasCircularDependency(taskId, dependencies, visited = new Set()) {
        if (visited.has(taskId)) {
            return true;
        }
        visited.add(taskId);
        const taskDependencies = dependencies.filter(dep => dep.dependent_task_id === taskId);
        for (const dep of taskDependencies) {
            if (this.hasCircularDependency(dep.dependency_task_id, dependencies, new Set(visited))) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=Task.js.map