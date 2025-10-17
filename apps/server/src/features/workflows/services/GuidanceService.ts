import { WorkflowService } from './WorkflowService.js';
import type { DatabaseManager } from '../../storage/DatabaseManager.js';
import type { CreateTaskParams, WorkflowDefinition, MissingRequirement, WorkflowSection } from '../../../types/WorkflowTypes.js';
import type {
  AIGuidance,
  GuidanceRequirement,
  ActionSpec,
  ToolCallExample,
  TransitionInfo,
  HierarchyGuidance,
  ChildRequirementStatus
} from '../../../types/GuidanceTypes.js';
import { HelpService } from '../../help/services/HelpService.js';

/**
 * Guidance Service - Auto-generates actionable guidance from workflow definitions
 *
 * This service transforms validation results into clear, actionable instructions for AI agents.
 * It provides both structured data (for future automation) and human-readable instructions.
 */
export class GuidanceService {
  constructor(private db: DatabaseManager) {}

  async build(task: CreateTaskParams): Promise<AIGuidance> {
    const wf = new WorkflowService(this.db);
    const workflowName = (task as any).workflow || await wf.resolveWorkflowName((task as any).task_type, (task as any).workflow);
    const workflowDef = await wf.getWorkflowDefinition(workflowName);
    const validation = await wf.validate(task, workflowName);

    const taskId = (task as any).id || (task as any).task_id || '';
    const taskType = (task as any).task_type || 'task';
    const currentStatus = (task as any).task_status || 'todo';

    // Build comprehensive requirements from missing items
    const allRequirements = await this.buildRequirements(
      validation.missing_requirements,
      workflowDef,
      task
    );

    // Separate into minimum vs recommended
    const minimum = allRequirements.filter(r => r.is_minimum);
    const recommended = allRequirements.filter(r => !r.is_minimum);

    // Build clear instructions from requirements
    const instructions = this.buildInstructions(minimum, task);

    // Build status transition info
    const transitions = this.buildTransitions(currentStatus, workflowDef, validation.missing_requirements);

    // Build hierarchy guidance if applicable
    const hierarchy = this.buildHierarchy(taskType, workflowDef, validation.missing_requirements);

    return {
      task_id: taskId,
      task_type: taskType,
      workflow: workflowName,
      current_status: currentStatus,

      progress: {
        completion_percentage: validation.completion_percentage,
        completed_count: validation.completed_requirements.length,
        total_required: validation.completed_requirements.length + validation.missing_requirements.length,
        is_minimum_met: validation.is_valid,
        is_comprehensive: this.assessComprehensiveness(allRequirements, validation)
      },

      requirements: {
        minimum,
        recommended,
        blocking_transitions: transitions.available
          .filter(t => t.blocked)
          .map(t => `Cannot transition to '${t.to}': ${t.blocking_reasons.join(', ')}`)
      },

      instructions,
      transitions,
      hierarchy,

      workflow_description: workflowDef?.description,
      tips: this.buildContextualTips(workflowName, taskType, validation.missing_requirements),
      validate_endpoint: '/api/workflows/validate',
      ai_guide: HelpService.get('tasks').ai_guide
    };
  }

  private async buildRequirements(
    missing: MissingRequirement[],
    workflowDef: WorkflowDefinition | undefined,
    task: CreateTaskParams
  ): Promise<GuidanceRequirement[]> {
    return missing.map(miss => {
      const section = workflowDef?.required_sections.find(s => s.section_type === miss.section_type);
      const actionSpec = this.generateActionSpec(miss, task, workflowDef);
      const toolExample = this.generateToolExample(actionSpec, task);

      return {
        section_type: miss.section_type,
        description: miss.description,
        why_needed: this.explainWhy(miss.section_type, workflowDef),
        is_minimum: !miss.is_conditional,
        quality_bar: this.getQualityBar(miss, section),
        current_state: this.extractCurrentState(miss),
        required_state: this.extractRequiredState(miss, section),
        action_spec: actionSpec,
        how_to_complete: this.generateHowTo(miss, actionSpec),
        tool_example: toolExample
      };
    });
  }

  private buildInstructions(requirements: GuidanceRequirement[], task: CreateTaskParams): any {
    const summary = requirements.length === 0
      ? 'All minimum requirements met'
      : `${requirements.length} required item${requirements.length > 1 ? 's' : ''} to meet minimum workflow standards`;

    const next_steps = requirements.map((req, i) =>
      `${i + 1}. ${req.how_to_complete}`
    );

    const tool_calls: ToolCallExample[] = requirements.map(req => {
      const parsed = this.parseToolExample(req.tool_example);
      return {
        tool: this.extractToolName(req.action_spec),
        description: req.description,
        params: parsed,
        notes: req.quality_bar
      };
    });

    return { summary, next_steps, tool_calls };
  }

  private buildTransitions(
    currentStatus: string,
    workflowDef: WorkflowDefinition | undefined,
    missing: MissingRequirement[]
  ): { current: string; available: TransitionInfo[] } {
    if (!workflowDef?.status_flow?.transitions) {
      return { current: currentStatus, available: [] };
    }

    const available: TransitionInfo[] = workflowDef.status_flow.transitions
      .filter(t => t.from === currentStatus || t.from === '*')
      .map(t => {
        const hasRequiredBundles = t.required_bundles && t.required_bundles.length > 0;
        const hasMissing = missing.length > 0;
        const blocked = hasRequiredBundles || hasMissing;
        const blocking_reasons: string[] = [];

        if (hasMissing) {
          blocking_reasons.push(`${missing.length} requirement${missing.length > 1 ? 's' : ''} not met`);
        }

        if (hasRequiredBundles && t.required_bundles) {
          blocking_reasons.push(`Requires validation bundles: ${t.required_bundles.join(', ')}`);
        }

        return {
          to: t.to,
          label: t.label || `Move to ${t.to}`,
          blocked,
          blocking_reasons,
          required_bundles: t.required_bundles
        };
      });

    return { current: currentStatus, available };
  }

  private buildHierarchy(
    taskType: string,
    workflowDef: WorkflowDefinition | undefined,
    missing: MissingRequirement[]
  ): HierarchyGuidance | undefined {
    if (!workflowDef?.child_requirements || workflowDef.child_requirements.length === 0) {
      return undefined;
    }

    // Filter to only show child requirements that apply to THIS task type
    const requiredChildren = workflowDef.child_requirements.filter(cr =>
      (cr.when_parent_type === taskType || !cr.when_parent_type) && (cr.min_count ?? 1) > 0
    );

    // If this task type has no child requirements, don't show hierarchy guidance
    if (requiredChildren.length === 0) return undefined;

    const childStatuses: ChildRequirementStatus[] = requiredChildren.map(childReq => {
      const miss = missing.find(m =>
        m.section_type === 'children' &&
        (m as any).metadata?.child_task_type === childReq.child_task_type
      );

      const currentCount = miss ? ((miss as any).metadata?.current_count || 0) : (childReq.min_count || 0);
      const minCount = childReq.min_count || 1;
      const maxCount = childReq.max_count;

      const status: any = currentCount >= minCount ? 'satisfied' : 'needs_more';
      const qualityGuidance = currentCount >= minCount
        ? `Minimum met (${currentCount}/${minCount}). ${maxCount ? `Consider adding up to ${maxCount} total for better coverage.` : 'Add more for thorough breakdown.'}`
        : `Need ${minCount - currentCount} more to meet minimum.`;

      return {
        child_task_type: childReq.child_task_type,
        label: childReq.label || childReq.child_task_type,
        min_count: minCount,
        max_count: maxCount,
        current_count: currentCount,
        status,
        quality_guidance: qualityGuidance
      };
    });

    return {
      current_level: taskType,
      requires_children: requiredChildren.map(cr =>
        `${cr.min_count}${cr.max_count ? `-${cr.max_count}` : '+'} ${cr.label || cr.child_task_type}(s)`
      ),
      child_requirements: childStatuses
    };
  }

  // ==================== ACTION SPEC GENERATION ====================

  private generateActionSpec(miss: MissingRequirement, task: CreateTaskParams, workflowDef?: WorkflowDefinition): ActionSpec {
    const taskId = (task as any).id || '';
    const section = miss.section_type;

    // Handle child task requirements
    if (section === 'children' && (miss as any).metadata) {
      const meta = (miss as any).metadata;
      return {
        kind: 'create_child_task',
        tool: 'tasks',
        child_task_type: meta.child_task_type,
        label: meta.label || meta.child_task_type,
        min_count: meta.min_count || 1,
        max_count: meta.max_count,
        required_workflow: meta.required_workflow,
        then_child_needs: this.getChildRequirements(meta.child_task_type, workflowDef)
      };
    }

    // Handle notes
    if (['architecture', 'erd', 'api_contract', 'mockups', 'observability', 'root_cause_analysis', 'findings', 'conclusions', 'findings_documentation'].includes(section)) {
      const templates = this.getNoteTemplates(section);
      return {
        kind: 'create_note',
        tool: 'notes',
        note_type: section === 'mockups' ? 'excalidraw' : 'documentation',
        title_template: templates.title,
        content_template: templates.content,
        link_to_task: taskId
      };
    }

    // Handle checklists
    if (['acceptance_criteria', 'implementation_checklist', 'test_verification', 'regression_testing', 'reproduction_steps', 'scope_definition', 'research_goals', 'next_steps', 'test_checklist'].includes(section)) {
      const checklistInfo = this.getChecklistInfo(section);
      return {
        kind: 'ensure_checklist',
        tool: 'tasks',
        name: checklistInfo.name,
        min_items: checklistInfo.min_items,
        default_items: checklistInfo.examples,
        merge: 'append'
      };
    }

    // Handle rules
    if (['rules', 'rules_creation', 'knowledge_rules'].includes(section)) {
      return {
        kind: 'link_rule',
        tool: 'tasks',
        instructions: 'Create rule using rules tool, then link via entity_links',
        min_rules: 1
      };
    }

    // Default fallback
    return {
      kind: 'validate',
      tool: 'workflows'
    };
  }

  private generateToolExample(spec: ActionSpec, task: CreateTaskParams): string {
    const taskId = (task as any).id || '{{task_id}}';
    const projectPath = '{{project_path}}';

    if (spec.kind === 'ensure_checklist') {
      // First create the checklist via update with checklists array
      return JSON.stringify({
        project: projectPath,
        action: 'update',
        task_id: taskId,
        checklists: [{
          name: spec.name,
          items: spec.default_items.map((text: string) => ({
            text,
            checked: false,
            created_at: new Date().toISOString()
          })),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      }, null, 2);
    }

    if (spec.kind === 'create_child_task') {
      return JSON.stringify({
        project: projectPath,
        action: 'create',
        task_type: spec.child_task_type,
        parent_id: taskId,
        title: `[${spec.child_task_type} title describing user value]`,
        description: `[Detailed ${spec.child_task_type} description]`
      }, null, 2);
    }

    if (spec.kind === 'create_note') {
      return JSON.stringify({
        project: projectPath,
        action: 'create',
        title: spec.title_template.replace('{{title}}', (task as any).title || ''),
        content: spec.content_template,
        note_type: spec.note_type,
        entity_links: [{ entity_type: 'task', entity_id: taskId }]
      }, null, 2);
    }

    if (spec.kind === 'link_rule') {
      return JSON.stringify({
        project: projectPath,
        action: 'update',
        task_id: taskId,
        entity_links: [{ entity_type: 'rule', entity_id: '{{rule_id_from_creation}}' }]
      }, null, 2);
    }

    return '{}';
  }

  private generateHowTo(miss: MissingRequirement, spec: ActionSpec): string {
    if (spec.kind === 'create_child_task') {
      const meta = (miss as any).metadata;
      return `Create ${meta?.min_count || 1}${meta?.max_count ? `-${meta.max_count}` : '+'} ${meta?.child_task_type || 'child task'}(s) using tasks tool`;
    }

    if (spec.kind === 'ensure_checklist') {
      return `Add "${spec.name}" checklist with ${spec.min_items}+ items using tasks tool (update action with checklists parameter)`;
    }

    if (spec.kind === 'create_note') {
      return `Create ${spec.note_type} note "${miss.description}" using notes tool`;
    }

    if (spec.kind === 'link_rule') {
      return `Create and link ${spec.min_rules}+ rule(s) using rules tool`;
    }

    return miss.action_needed;
  }

  // ==================== HELPER METHODS ====================

  private explainWhy(section: string, workflow?: WorkflowDefinition): string {
    const explanations: Record<string, string> = {
      'children': 'Breaking down work into smaller pieces improves planning, enables parallel execution, and provides better progress tracking',
      'scope_definition': 'Prevents scope creep and ensures team alignment on what will/won\'t be built',
      'architecture': 'Documents system design decisions before coding to avoid costly refactors later',
      'erd': 'Defines data model and relationships upfront to prevent database schema issues',
      'api_contract': 'Establishes API interface contracts before implementation for better integration',
      'mockups': 'Visualizes UI/UX design before development to catch usability issues early',
      'acceptance_criteria': 'Defines success criteria upfront so everyone knows when work is done',
      'test_verification': 'Ensures quality and prevents regressions by codifying expected behavior',
      'implementation_checklist': 'Breaks down implementation into trackable steps for better execution',
      'reproduction_steps': 'Documents exact steps to reproduce bug for reliable fixes',
      'root_cause_analysis': 'Identifies underlying issues to prevent similar bugs in future',
      'regression_testing': 'Verifies fix doesn\'t break existing functionality'
    };

    return explanations[section] || 'Required by workflow definition for quality assurance';
  }

  private getQualityBar(miss: MissingRequirement, section?: WorkflowSection): string {
    const meta = (miss as any).metadata;

    if (meta && miss.section_type === 'children') {
      const range = meta.max_count ? `${meta.min_count}-${meta.max_count}` : `${meta.min_count}+`;
      return `Minimum: ${meta.min_count}. Recommended: ${meta.max_count || meta.min_count + 3}+ for thorough coverage. Each ${meta.child_task_type} should be well-scoped and independently deliverable.`;
    }

    if (section?.min_items) {
      return `Minimum: ${section.min_items} items. Recommended: ${section.min_items + 2}+ items with specific details, edge cases, and error handling covered.`;
    }

    return 'Provide comprehensive information beyond minimum requirements for production quality.';
  }

  private extractCurrentState(miss: MissingRequirement): any {
    const meta = (miss as any).metadata;
    if (meta?.current_count !== undefined) {
      return { count: meta.current_count };
    }
    return undefined;
  }

  private extractRequiredState(miss: MissingRequirement, section?: WorkflowSection): any {
    const meta = (miss as any).metadata;
    if (meta?.min_count !== undefined) {
      return {
        min: meta.min_count,
        max: meta.max_count,
        criteria: meta.description ? [meta.description] : []
      };
    }
    if (section?.min_items) {
      return {
        min: section.min_items,
        criteria: []
      };
    }
    return undefined;
  }

  private getChildRequirements(childType: string, workflowDef?: WorkflowDefinition): string[] {
    const reqs: string[] = [];

    if (childType === 'story') {
      reqs.push('Scope Definition checklist (3+ items)');
      reqs.push('2-5 child tasks when ready for implementation');
      reqs.push('Architecture/ERD/Mockups as applicable');
    } else if (childType === 'task') {
      reqs.push('Clear title and description');
      reqs.push('Implementation approach documented');
    } else if (childType === 'epic') {
      reqs.push('3-10 child stories');
      reqs.push('High-level scope and objectives defined');
    }

    return reqs;
  }

  private getNoteTemplates(section: string): { title: string; content: string } {
    const templates: Record<string, any> = {
      architecture: {
        title: 'Architecture: {{title}}',
        content: '## Architecture\n\n```mermaid\nflowchart TD\n  A[Component A] --> B[Component B]\n  B --> C[Component C]\n```\n\n## Key Decisions\n\n- Decision 1\n- Decision 2\n'
      },
      erd: {
        title: 'ERD: {{title}}',
        content: '## Entity Relationship Diagram\n\n```mermaid\nerDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ LINE_ITEM : contains\n  USER {\n    string id PK\n    string email\n    string name\n  }\n  ORDER {\n    string id PK\n    string user_id FK\n    datetime created_at\n  }\n```\n'
      },
      api_contract: {
        title: 'API Contract: {{title}}',
        content: '## API Contract\n\n```yaml\nopenapi: 3.1.0\ninfo:\n  title: {{title}}\n  version: 0.1.0\npaths:\n  /example:\n    get:\n      summary: Example endpoint\n      responses:\n        "200":\n          description: OK\n```\n'
      },
      mockups: {
        title: 'Mockups: {{title}}',
        content: 'excalidraw://new'
      },
      observability: {
        title: 'Observability: {{title}}',
        content: '## Metrics\n- Request count\n- Error rate\n\n## Logs\n- Request logs with trace IDs\n\n## Alerts\n- Error rate > 5%\n'
      },
      root_cause_analysis: {
        title: 'Root Cause: {{title}}',
        content: '## What Happened\n\n## Why It Happened\n\n## Contributing Factors\n\n## Prevention Strategy\n'
      },
      findings: {
        title: 'Findings: {{title}}',
        content: '## Key Findings\n\n1. Finding 1\n2. Finding 2\n'
      },
      conclusions: {
        title: 'Conclusions: {{title}}',
        content: '## Conclusions\n\n## Recommendations\n'
      }
    };

    return templates[section] || { title: `${section}: {{title}}`, content: '' };
  }

  private getChecklistInfo(section: string): { name: string; min_items: number; examples: string[] } {
    const checklists: Record<string, any> = {
      acceptance_criteria: {
        name: 'Acceptance Criteria',
        min_items: 3,
        examples: [
          'Given [context], When [action], Then [expected outcome]',
          'Given [alt context], When [action], Then [edge case handled]',
          'Given [error state], When [action], Then [proper error shown]'
        ]
      },
      implementation_checklist: {
        name: 'Implementation Checklist',
        min_items: 3,
        examples: [
          'Define data model and database migrations',
          'Implement API routes with request validation',
          'Add UI components with loading/error/empty states'
        ]
      },
      test_verification: {
        name: 'Test Verification',
        min_items: 2,
        examples: [
          'Unit tests cover core business logic and edge cases',
          'Integration/E2E tests cover critical user flows'
        ]
      },
      test_checklist: {
        name: 'Test Verification',
        min_items: 2,
        examples: [
          'Unit tests for core logic',
          'Integration/E2E tests for critical flows'
        ]
      },
      regression_testing: {
        name: 'Regression Testing',
        min_items: 1,
        examples: ['Verify related features still work after changes']
      },
      reproduction_steps: {
        name: 'Reproduction Steps',
        min_items: 2,
        examples: [
          'Environment: [OS, browser, version]',
          'Step 1: [Specific action]',
          'Step 2: [Specific action]',
          'Expected: [What should happen]',
          'Actual: [What actually happens]'
        ]
      },
      scope_definition: {
        name: 'Scope Definition',
        min_items: 3,
        examples: [
          'IN SCOPE: [What IS included]',
          'OUT OF SCOPE: [What is explicitly excluded]',
          'CONSTRAINTS: [Technical/business limitations]'
        ]
      },
      research_goals: {
        name: 'Research Goals',
        min_items: 2,
        examples: [
          'Primary question: [What we need to answer]',
          'Success criteria: [How we know we\'re done]'
        ]
      },
      next_steps: {
        name: 'Next Steps',
        min_items: 1,
        examples: ['[Actionable next step from research findings]']
      }
    };

    return checklists[section] || { name: section, min_items: 1, examples: ['Item 1'] };
  }

  private buildContextualTips(workflow: string, taskType: string, missing: MissingRequirement[]): string[] {
    const tips: string[] = [];

    if (workflow === 'feature_development') {
      if (missing.some(m => m.section_type === 'children')) {
        const pluralType = taskType === 'story' ? 'stories' : `${taskType}s`;
        tips.push(`Break down ${pluralType} into smaller, independently deliverable pieces for better execution.`);
      }
    }

    if (workflow === 'bugfix') {
      tips.push('Clear reproduction steps make debugging 10x faster.');
      tips.push('Root cause analysis prevents similar bugs in the future.');
    }

    if (workflow === 'research') {
      tips.push('Document findings as you go - don\'t wait until the end.');
    }

    return tips;
  }

  private assessComprehensiveness(requirements: GuidanceRequirement[], validation: any): boolean {
    // Consider comprehensive if all minimum requirements are met
    // and at least some recommended additions exist
    const hasMinimum = requirements.filter(r => r.is_minimum).length === 0;
    const hasRecommended = requirements.filter(r => !r.is_minimum).length > 0;

    return hasMinimum && !hasRecommended;
  }

  private parseToolExample(example: string): Record<string, any> {
    try {
      return JSON.parse(example);
    } catch {
      return {};
    }
  }

  private extractToolName(spec: ActionSpec): string {
    return spec.tool || 'workflows';
  }
}
