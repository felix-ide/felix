import type { McpToolDefinition } from './common.js';

export const TASKS_TOOL: McpToolDefinition = {
  name: 'tasks',
  description: `Task management with workflows, spec gating, and AI validation.

TASK_TYPE → WORKFLOW MAPPING:
- epic, story, feature → feature_development workflow (requires Architecture + ERD + API Contract notes, 4 checklists, rule links)
- task, chore → simple workflow (requires description + basic checklist)
- bug, bugfix → bugfix workflow (requires root cause + test verification)
- spike, research → research workflow (requires research goals + findings)

HOW IT WORKS:
1. Create task with title + description + task_type → System auto-assigns workflow based on mapping above
2. System validates and returns guidance showing EXACTLY what's required for spec_ready
3. Follow guidance to create requirements:
   - Use notes tool to create Architecture/ERD/API Contract notes (for feature_development)
   - Use update action with checklist_updates to add required checklists
   - Use update action with entity_links to link coding rules
4. Once all requirements met → update spec_state=spec_ready
5. ONLY THEN can task_status move to in_progress (spec gate blocks otherwise)

IMPORTANT: Always read the guidance response after creating/updating a task - it tells you exactly what's missing!

ACTIONS: create, get, update, delete, list, suggest_next
CHECKLISTS: Add via checklist_updates array in update action
DEPENDENCIES: Add via dependency_updates array in update action`,
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['create', 'get', 'update', 'delete', 'list', 'suggest_next'],
        description: 'create=new task, get=fetch one, update=modify, delete=remove, list=fetch many, suggest_next=AI task suggestions'
      },

      // For create/update
      task_id: {
        type: 'string',
        description: '[get/update/delete] Task ID'
      },
      title: {
        type: 'string',
        description: '[create/update] Task title'
      },
      description: {
        type: 'string',
        description: '[create/update] Task description'
      },
      parent_id: {
        type: 'string',
        description: '[create/update/list] Parent task ID for hierarchical structure'
      },
      task_type: {
        type: 'string',
        description: '[create/update/list] Type of task (epic, story, task, bug, etc). Custom types allowed via mapping.',
        default: 'task'
      },
      task_status: {
        type: 'string',
        enum: ['todo', 'in_progress', 'blocked', 'done', 'cancelled'],
        description: '[create/update/list] Task status'
      },
      task_priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: '[create/update] Task priority',
        default: 'medium'
      },
      spec_state: {
        type: 'string',
        enum: ['draft', 'spec_in_progress', 'spec_ready'],
        description: '[create/update] Spec gating state. Gate: status cannot move to in_progress unless spec_state=spec_ready.'
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
          required: ['code', 'reason']
        },
        description: '[create/update] Structured waivers for conditional requirements (advanced)'
      },
      estimated_effort: {
        type: 'string',
        description: '[create/update] Estimated effort'
      },
      actual_effort: {
        type: 'string',
        description: '[create/update] Actual effort spent'
      },
      due_date: {
        type: 'string',
        description: '[create/update] Due date'
      },
      assigned_to: {
        type: 'string',
        description: '[create/update] User assigned to this task'
      },
      workflow: {
        type: 'string',
        description: '[create/update] Workflow type for the task. When changed, task status resets to new workflow\'s initial state.'
      },
      checklists: {
        type: 'array',
        items: { type: 'object' },
        description: '[create] Initial checklists'
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
        description: '[create/update] Links to CODE entities (components, files, etc.). To attach notes to tasks, use notes tool.'
      },
      stable_tags: {
        type: 'array',
        items: { type: 'string' },
        description: '[create/update] Task tags'
      },
      sort_order: {
        type: 'number',
        description: '[create/update] Manual sort order for tasks'
      },
      transition_gate_token: {
        type: 'string',
        description: '[update] Token for workflow transition gates (internal)'
      },
      transition_gate_response: {
        type: 'string',
        description: '[update] Response for workflow transition gates (internal)'
      },
      skip_validation: {
        type: 'boolean',
        description: '[create/update] Skip validation and guidance generation',
        default: false
      },
      include_guidance: {
        type: 'boolean',
        description: '[create/update] Return AI guidance pack with task',
        default: true
      },

      // Checklist management (via update action)
      checklist_updates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            checklist: { type: 'string', description: 'Checklist name' },
            operation: { type: 'string', enum: ['add', 'update', 'toggle', 'move', 'remove', 'delete'], description: 'Operation to perform' },
            index: { type: 'number', description: 'Item index for update/toggle/remove' },
            text: { type: 'string', description: 'Item text for add/update' },
            position: { type: 'number', description: 'Insert position for add' },
            from: { type: 'number', description: 'Source index for move' },
            to: { type: 'number', description: 'Target index for move' }
          },
          required: ['checklist', 'operation']
        },
        description: '[update] Array of checklist operations to perform. Operations: add (new item), update (change text), toggle (check/uncheck), move (reorder), remove (delete item), delete (remove checklist)'
      },

      // Dependency management (via update action)
      dependency_updates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['add', 'remove'], description: 'add=create dependency, remove=delete dependency' },
            dependency_task_id: { type: 'string', description: 'Task ID that this task depends on' },
            type: { type: 'string', enum: ['blocks', 'related', 'follows'], description: 'Type of dependency', default: 'blocks' },
            required: { type: 'boolean', description: 'Is this dependency required', default: true }
          },
          required: ['operation', 'dependency_task_id']
        },
        description: '[update] Array of dependency operations to perform. Operations: add (create dependency), remove (delete dependency)'
      },

      // For get
      include_notes: {
        type: 'boolean',
        description: '[get] Include attached notes in response',
        default: true
      },
      include_children: {
        type: 'boolean',
        description: '[get/list] Include child tasks in response',
        default: true
      },
      include_dependencies: {
        type: 'boolean',
        description: '[get] Include task dependencies in response',
        default: false
      },

      // For list
      limit: {
        type: 'number',
        description: '[list/suggest_next] Maximum number of tasks to return',
        default: 20
      },
      offset: {
        type: 'number',
        description: '[list] Number of tasks to skip for pagination',
        default: 0
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: '[list] Specific fields to return (e.g., ["id", "title", "status"]). Omit for full task objects.'
      },
      output_format: {
        type: 'string',
        enum: ['text', 'json'],
        description: '[list] Return optimized text or JSON rows',
        default: 'text'
      },
      context_window_size: {
        type: 'number',
        description: '[list] Token budget for results (text mode)',
        default: 25000
      },

      // For suggest_next
      assignee: {
        type: 'string',
        description: '[suggest_next] Filter by assignee'
      },
      context: {
        type: 'string',
        description: '[suggest_next] Context for smart suggestions'
      }
    },
    required: ['project', 'action']
  }
};
