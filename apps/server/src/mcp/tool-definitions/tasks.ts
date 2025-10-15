import type { McpToolDefinition } from './common.js';

export const TASKS_TOOL: McpToolDefinition = {
  name: 'tasks',
  description: `Task management with automatic validation and guidance. Creates epics, stories, tasks, bugs, spikes with hierarchy and dependencies.

PURPOSE: Track work with workflow-based spec gates. Tasks auto-validate and return guidance on what's missing.

Required: project, action(add|get|list|update|delete|get_tree|get_dependencies|add_dependency|suggest_next|get_spec_bundle)
Create: title*, description, parent_id, task_type=task, task_priority(low|medium|high|critical)=medium, estimated_effort, due_date, workflow, checklists[], entity_links[], stable_tags[], include_guidance=T
Update: task_id*, task_status(todo|in_progress|blocked|done|cancelled), spec_state(draft|spec_in_progress|spec_ready), spec_waivers[], actual_effort, [any create field]
Query: task_id, include_notes=T, include_children=T, compact=T
List: task_status, task_type, limit=20, offset=0, view[ids,names,titles,summary,full], fields[], output_format(text|json)=text
Tree/Deps: root_task_id, max_depth=5, direction(incoming|outgoing|both)=both, dependency_type(blocks|related|follows)

WORKFLOW INTEGRATION:
- add/update returns {task, validation, guidance} showing what's needed for spec_ready
- Spec gate: Cannot set status=in_progress until spec_state=spec_ready
- Requirements vary by workflow type (see workflows tool)
- Use guidance response to know what notes/checklists/rules to add

EXAMPLE: Create task → get guidance → add required items → mark spec_ready → start work`,
  // Payload examples the validator accepts:
  // - Acceptance Criteria
  //   checklists: [{
  //     name: "Acceptance Criteria",
  //     items: [ {"text":"Given …, When …, Then …"}, {"text":"Given …"}, {"text":"Given …"} ]
  //   }]
  // - Implementation Checklist
  //   checklists: [{
  //     name: "Implementation Checklist",
  //     items: [ {"text":"Define data model"}, {"text":"Wire API"}, {"text":"Add UI states"} ]
  //   }]
  // - Test Verification (must include 'unit' and 'integration' or 'e2e')
  //   checklists: [{
  //     name: "Test Verification",
  //     items: [ {"text":"Unit tests cover core logic"}, {"text":"Integration/E2E happy path executes"} ]
  //   }]
  // - Regression Testing
  //   checklists: [{
  //     name: "Regression Testing",
  //     items: [ {"text":"Smoke: affected screens"} ]
  //   }]
  // - Rules Creation link on the task
  //   entity_links: [ { "entity_type": "rule", "entity_id": "<RULE_ID>" } ]
  inputSchema: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'Project name or path'
      },
      action: {
        type: 'string',
        enum: ['add', 'get', 'list', 'update', 'delete', 'get_tree', 'get_dependencies', 'add_dependency', 'suggest_next', 'get_spec_bundle', 'help'],
        description: 'Action to perform'
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
      // For get_spec_bundle
      compact: {
        type: 'boolean',
        description: 'Return a compact bundle (truncate large note content)',
        default: true
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
      view: {
        type: 'string',
        enum: ['ids','names','titles','summary','full'],
        description: 'Projection preset for list (ids|names/titles|summary|full).'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Explicit field list to return (overrides view)'
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
      // For get_tree action
      root_task_id: {
        type: 'string',
        description: 'Root task ID (for get_tree action, omit for all root tasks)'
      },
      max_depth: {
        type: 'number',
        description: 'Maximum depth to traverse (for get_tree action)',
        default: 5
      },
      include_completed: {
        type: 'boolean',
        description: 'Include completed tasks (for get_tree action)',
        default: true
      },
      // For get_dependencies action
      direction: {
        type: 'string',
        enum: ['incoming', 'outgoing', 'both'],
        description: 'Direction of dependencies to retrieve (for get_dependencies action)',
        default: 'both'
      },
      // For add_dependency action
      dependent_task_id: {
        type: 'string',
        description: 'Task that depends on another (for add_dependency action)'
      },
      dependency_task_id: {
        type: 'string',
        description: 'Task that must be completed first (for add_dependency action)'
      },
      dependency_type: {
        type: 'string',
        enum: ['blocks', 'related', 'follows'],
        description: 'Type of dependency (for add_dependency action)',
        default: 'blocks'
      },
      required: {
        type: 'boolean',
        description: 'Is dependency required (for add_dependency action)',
        default: true
      },
      // For suggest_next action
      assignee: {
        type: 'string',
        description: 'Filter by assignee (for suggest_next action)'
      },
      context: {
        type: 'string',
        description: 'Context for smart suggestions (for suggest_next action)'
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
