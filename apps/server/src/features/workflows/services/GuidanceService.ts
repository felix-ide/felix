import { WorkflowService } from './WorkflowService.js';
import type { DatabaseManager } from '../../storage/DatabaseManager.js';
import type { CreateTaskParams } from '@felix/code-intelligence';
import type { AIGuidance, GuidanceItem, ActionSpec } from '../../../types/GuidanceTypes.js';
import { HelpService } from '../../help/services/HelpService.js';

export class GuidanceService {
  constructor(private db: DatabaseManager) {}

  async build(task: CreateTaskParams): Promise<AIGuidance> {
    const wf = new WorkflowService(this.db);
    const name = (task as any).workflow || await wf.resolveWorkflowName((task as any).task_type, (task as any).workflow);
    const status = await wf.validate(task, name);

    const items: GuidanceItem[] = [];
    for (const miss of status.missing_requirements) {
      const actions = this.actionsFor(miss.section_type, task);
      items.push({ section_type: miss.section_type, description: miss.description || miss.action_needed || miss.section_type, actions });
    }

    const guidance: AIGuidance = {
      workflow: name,
      completion_target: 100,
      missing: items,
      tips: this.tipsFor(name),
      quality_gates: this.gatesFor(name),
      validate_endpoint: '/api/workflows/validate',
      ai_guide: HelpService.get('tasks').ai_guide
    };
    return guidance;
  }

  private actionsFor(section: string, task: CreateTaskParams): ActionSpec[] {
    const taskId = (task as any).id || (task as any).task_id || '';
    switch (section) {
      case 'architecture':
        return [{ kind: 'create_note', note_type: 'documentation', title_template: 'Architecture for: {{title}}', content_template: '## Architecture\n\n```mermaid\nflowchart TD\n  A[Component A] --> B[Component B]\n```\n', link_to_task: taskId }];
      case 'erd':
        return [{ kind: 'create_note', note_type: 'documentation', title_template: 'ERD for: {{title}}', content_template: '## ERD\n\n```mermaid\nerDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  USER {\n    string id PK\n    string email\n  }\n```\n', link_to_task: taskId }];
      case 'api_contract':
        return [{ kind: 'create_note', note_type: 'documentation', title_template: 'API Contract for: {{title}}', content_template: '## API Contract\n\n```yaml\nopenapi: 3.1.0\ninfo:\n  title: {{title}}\n  version: 0.1.0\npaths:\n  /example:\n    get:\n      summary: Example\n      responses:\n        "200": { description: OK }\n```\n', link_to_task: taskId }];
      case 'mockups':
        return [{ kind: 'create_note', note_type: 'excalidraw', title_template: 'Mockups for: {{title}}', content_template: 'excalidraw://new', link_to_task: taskId }];
      case 'acceptance_criteria':
        return [{ kind: 'ensure_checklist', name: 'Acceptance Criteria', min_items: 3, default_items: [ 'Given [context], When [action], Then [outcome]', 'Given [alt context], When [action], Then [error/edge case]', 'Given [state], When [negative action], Then [denied]' ], merge: 'append' }];
      case 'observability':
        return [{ kind: 'create_note', note_type: 'documentation', title_template: 'Observability for: {{title}}', content_template: '## Metrics\n- [ ] Metric name\n\n## Logs\n- [ ] Key log line\n\n## Alerts\n- [ ] Alert rule\n', link_to_task: taskId }];
      case 'implementation_checklist':
        return [{ kind: 'ensure_checklist', name: 'Implementation Checklist', min_items: 3, default_items: [ 'Define data model changes', 'Wire API routes + validation', 'Update UI states (loading/empty/error)' ], merge: 'append' }];
      case 'test_checklist':
        return [{ kind: 'ensure_checklist', name: 'Test Verification', min_items: 2, default_items: [ 'Unit tests for core logic', 'Integration/E2E happy path' ], merge: 'append' }];
      case 'reproduction_steps':
        return [{ kind: 'ensure_checklist', name: 'Reproduction Steps', min_items: 2, default_items: [ 'Environment + version', 'Minimal steps to reproduce' ], merge: 'append' }];
      case 'test_verification':
        // Must include tokens for 'unit' and 'integration|e2e'
        return [{ kind: 'ensure_checklist', name: 'Test Verification', min_items: 2, default_items: [ 'Unit tests cover core logic', 'Integration/E2E happy path executes' ], merge: 'append' }];
      case 'regression_testing':
        return [{ kind: 'ensure_checklist', name: 'Regression Testing', min_items: 1, default_items: [ 'Retest impacted areas' ], merge: 'append' }];
      case 'rules_creation':
      case 'knowledge_rules': {
        const taskId = (task as any).id || (task as any).task_id || '';
        return [
          // 1) Ensure at least one rule exists (AI may choose an existing one or create new)
          { kind: 'create_rules', min_rules: 1, templates: [ { title: 'Practice: {{title}}', body: 'Describe the rule clearly with rationale and scope.' } ] },
          // 2) Ensure the task has a link to a rule (this is what the validator checks)
          { kind: 'ensure_rule_link', task_id_template: taskId, rule_id_hint: '{{new_or_existing_rule_id}}', instructions: 'Update the task to include entity_links: [{ entity_type: "rule", entity_id: "<RULE_ID>" }]. Keep existing links.' }
        ];
      }
      default:
        return [{ kind: 'validate' }];
    }
  }

  private tipsFor(workflow: string): string[] {
    if (workflow === 'feature_development') return [ 'Add negative tests for critical paths', 'Prefer internal module names for diagram nodes' ];
    if (workflow === 'bugfix') return [ 'Keep reproduction steps minimal and deterministic' ];
    if (workflow === 'research') return [ 'Cite findings and capture actionable next steps' ];
    return [];
  }

  private gatesFor(workflow: string): Array<{id: string; description: string}> {
    if (workflow === 'feature_development') return [ { id: 'checklist_quality', description: 'Checklists contain actionable, non-empty items' } ];
    return [];
  }
}
