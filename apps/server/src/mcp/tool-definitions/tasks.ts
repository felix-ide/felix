import type { McpToolDefinition } from './common.js';

export const TASKS_TOOL: McpToolDefinition = {
  name: 'tasks',
  description: `Tasks (compact). Create/list/update; supports hierarchy, dependencies, checklists, and links.

AI UX improvements:
- add/update responses now include structured { task, validation, guidance } so agents do not need to call workflows.validate explicitly.
- Canonical checklist expectations (validator):
  • Acceptance Criteria — checklist name "Acceptance Criteria", ≥3 items with Given/When/Then tokens.
  • Implementation Checklist — checklist name contains "Implementation", ≥3 items.
  • Test Verification — checklist name "Test Verification", ≥2 items containing 'unit' and 'integration' or 'e2e'.
  • Regression Testing — checklist name contains "Regression", ≥1 item.
  • Rules Creation — add entity_links with at least one { entity_type:'rule', entity_id }.

Spec gating:
- Gate: task_status cannot be 'in_progress' unless spec_state='spec_ready'.
- Forward-only spec_state: draft → spec_in_progress → spec_ready.

Usage flow:
- Prefer: tasks.add/update (reads guidance) → notes.add/checklists.add per guidance → tasks.update(spec_state='spec_ready') → tasks.update(task_status='in_progress').

Allowed actions by spec_state:
- draft/spec_in_progress: read, update metadata, link notes/rules, manage checklists/subtasks, set spec_state forward; cannot set task_status=in_progress.
- spec_ready+: all above, and may set task_status=in_progress.

Idempotency: update/add are idempotent by field; repeated calls safe.
Results may be truncated; use filters + paging.`,
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
