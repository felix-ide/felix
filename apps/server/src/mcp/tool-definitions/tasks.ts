import type { McpToolDefinition } from './common.js';

export const TASKS_TOOL: McpToolDefinition = {
  name: 'tasks',
  description: `Task management with automatic validation and guidance. Creates epics, stories, tasks, bugs, spikes with hierarchy and dependencies.

PURPOSE: Track work with workflow-based spec gates. Tasks auto-validate and return guidance on what's missing.

WORKFLOW INTEGRATION:
- add/update returns {task, validation, guidance} showing what's needed for spec_ready
- Spec gate: Cannot set status=in_progress until spec_state=spec_ready
- Requirements vary by workflow type (see workflows tool)
- Use guidance response to know what notes/checklists/rules to add

EXAMPLE: Create task → get guidance → add required items → mark spec_ready → start work`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['add', 'get', 'list', 'update', 'delete', 'suggest_next', 'help'],
        description: 'add=create task, get=fetch one task, list=fetch many tasks, update=modify task, delete=remove task, suggest_next=get AI suggestions for next task to work on'
      },
      // For add action
      title: {
        type: 'string',
        description: 'Task title (for add action)'
      },
      description: {
        type: 'string',
        description: 'Task description (for add/update actions)'
      },
      parent_id: {
        type: 'string',
        description: 'Parent task ID for hierarchical structure (for add action)'
      },
      task_type: {
        type: 'string',
        description: 'Type of task (for add action). Custom types allowed via mapping.',
        default: 'task'
      },
      task_priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Task priority (for add/update actions)',
        default: 'medium'
      },
      estimated_effort: {
        type: 'string',
        description: 'Estimated effort (for add action)'
      },
      due_date: {
        type: 'string',
        description: 'Due date (for add/update actions)'
      },
      entity_links: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            entity_type: { type: 'string' },
            entity_id: { type: 'string' },
            entity_name: { type: 'string' },
            link_strength: { type: 'string' }
          }
        },
        description: 'Links to CODE entities (components, files, etc.). To attach notes to tasks, use the notes tool instead! (for add/update actions)'
      },
      stable_tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Task tags (for add/update actions)'
      },
      workflow: {
        type: 'string',
        description: 'Workflow type for the task (for add/update actions). When changed, task status resets to new workflow\'s initial state.'
      },
      checklists: {
        type: 'array',
        items: { type: 'object' },
        description: 'Initial checklists (for add action)'
      },
      include_guidance: {
        type: 'boolean',
        description: 'Return AI guidance pack with task (for add action)',
        default: true
      },
      // For get/update/delete actions
      task_id: {
        type: 'string',
        description: 'ID of task to get/update/delete'
      },
      // For get action
      include_notes: {
        type: 'boolean',
        description: 'Include attached notes in response (for get action)',
        default: true
      },
      include_dependencies: {
        type: 'boolean',
        description: 'Include task dependencies in response (for get action)',
        default: false
      },
      task_status: {
        type: 'string',
        enum: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
        description: 'Task status (for update action or list filter)'
      },
      spec_state: {
        type: 'string',
        enum: ['draft','spec_in_progress','spec_ready'],
        description: 'Spec gating state (for update action). Gate: status cannot move to in_progress unless spec_state=spec_ready.'
      },
      spec_waivers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            reason: { type: 'string' },
            added_by: { type: 'string' },
            added_at: { type: 'string' }
          },
          required: ['code','reason']
        },
        description: 'Structured waivers for conditional requirements (advanced)'
      },
      actual_effort: {
        type: 'string',
        description: 'Actual effort spent (for update action)'
      },
      // For list and get actions
      include_children: {
        type: 'boolean',
        description: 'Include child tasks in results (for list and get actions)',
        default: true
      },
      limit: {
        type: 'number',
        description: 'Maximum number of tasks to return (for list/suggest_next actions)',
        default: 20
      },
      offset: {
        type: 'number',
        description: 'Number of tasks to skip for pagination (for list action)',
        default: 0
      },
      // Output controls for list (optional)
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to return (e.g., ["id", "title", "status"]). Omit for full task objects.'
      },
      output_format: {
        type: 'string',
        enum: ['text','json'],
        description: 'Return optimized text (default) or JSON rows',
        default: 'text'
      },
      context_window_size: {
        type: 'number',
        description: 'Token budget for results (text mode)',
        default: 25000
      },
      // For suggest_next action
      assignee: {
        type: 'string',
        description: 'Filter by assignee (for suggest_next action)'
      },
      context: {
        type: 'string',
        description: 'Context for smart suggestions (for suggest_next action)'
      },
      // Dependency operations (for update action)
      dependency_updates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add', 'remove'],
              description: 'Operation: add (create dependency) or remove (delete dependency)'
            },
            dependency_task_id: {
              type: 'string',
              description: 'ID of the task this task depends on (for both add and remove operations)'
            },
            type: {
              type: 'string',
              enum: ['blocks', 'related', 'follows'],
              description: 'Type of dependency. For add: specifies dependency type (default: blocks). For remove: optionally filter to specific type',
              default: 'blocks'
            },
            required: {
              type: 'boolean',
              description: 'Is dependency required (for add operation)',
              default: true
            }
          },
          required: ['operation']
        },
        description: 'Atomic dependency operations (for update action). Add or remove task dependencies without separate tool calls. Example: [{operation: "add", dependency_task_id: "task_123", type: "blocks"}]'
      },
      // Checklist operations (for update action)
      checklist_updates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            checklist: {
              type: 'string',
              description: 'Name of the checklist to modify'
            },
            operation: {
              type: 'string',
              enum: ['toggle', 'add', 'remove', 'move', 'update', 'delete'],
              description: 'Operation to perform: toggle (flip completed), add (new item), remove (delete item), move (reorder), update (change text), delete (remove checklist)'
            },
            index: {
              type: 'number',
              description: 'Item index for toggle/remove/update operations (0-based)'
            },
            text: {
              type: 'string',
              description: 'Item text for add/update operations'
            },
            position: {
              type: 'number',
              description: 'Position to insert new item (for add operation, defaults to end)'
            },
            from: {
              type: 'number',
              description: 'Source index for move operation'
            },
            to: {
              type: 'number',
              description: 'Target index for move operation'
            }
          },
          required: ['checklist', 'operation']
        },
        description: 'Atomic checklist operations (for update action). Allows toggling items, adding/removing items, reordering, updating text, or deleting entire checklists without sending full checklist arrays. Example: [{checklist: "Acceptance Criteria", operation: "toggle", index: 0}]'
      }
    },
    required: ['project', 'action']
  }
};

/**
 * Rules tool - consolidated rules management
 */
/**
 * Checklists tool - manage checklists within tasks
 */
