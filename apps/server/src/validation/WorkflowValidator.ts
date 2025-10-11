/**
 * Workflow validation logic for structured task creation
 */

import {
  WorkflowDefinition,
  WorkflowSection,
  CreateTaskParams,
  ValidationStatus,
  MissingRequirement,
  WorkflowValidationError,
  TaskContext,
  ConditionalRequirement,
  WorkflowSectionType,
  WorkflowValidationBundle
} from '../types/WorkflowTypes.js';
import { logger } from '../shared/logger.js';

export class WorkflowValidator {
  private workflowDefinitions: Map<string, WorkflowDefinition>;
  private currentNotes?: Array<{ id: string; title?: string; note_type?: string; content?: string }>;

  constructor(workflows: WorkflowDefinition[]) {
    this.workflowDefinitions = new Map();
    workflows.forEach(workflow => {
      this.workflowDefinitions.set(workflow.name, workflow);
    });
  }

  /**
   * Validate a task against its workflow requirements
   */
  async validateTask(
    taskParams: CreateTaskParams,
    context?: TaskContext,
    opts?: {
      notes?: Array<{ id: string; title?: string; note_type?: string; content?: string }>,
      childTasks?: Array<{ id: string; task_type: string; task_status: string; workflow?: string }>
    }
  ): Promise<ValidationStatus> {
    // Cache notes for strict checks during this validation run
    this.currentNotes = opts?.notes || undefined;
    const workflowName = taskParams.workflow || 'simple';
    const workflow = this.workflowDefinitions.get(workflowName);

    if (!workflow) {
      throw new Error(`Unknown workflow type: ${workflowName}`);
    }

    const missingRequirements: MissingRequirement[] = [];
    const completedRequirements: string[] = [];

    // Check each required section
    for (const section of workflow.required_sections) {
      const isRequired = this.isSectionRequired(section, workflow, context);

      logger.debug(`[DEBUG] Section ${section.section_type}: required=${isRequired}, conditional=${!!section.conditional_logic}, context=${context?.type}`);

      if (isRequired) {
        const sectionValid = await this.validateSection(section, taskParams);

        if (sectionValid) {
          completedRequirements.push(section.section_type);
        } else {
          missingRequirements.push({
            section_type: section.section_type,
            description: this.getSectionDescription(section),
            action_needed: this.getActionNeeded(section),
            is_conditional: !!section.conditional_logic,
            condition_not_met: section.conditional_logic
          });
        }
      } else if (section.conditional_logic) {
        // Section was skipped due to conditional logic
        const conditionalReq = workflow.conditional_requirements.find(
          cr => cr.section_type === section.section_type
        );
        const skipReason = conditionalReq?.fallback_message ||
          `Not required for ${context?.type || 'this'} task`;
        completedRequirements.push(`${section.section_type} (skipped - ${skipReason})`);
      }
    }

    // Validate child task requirements
    if (workflow.child_requirements && workflow.child_requirements.length > 0) {
      const childTasks = opts?.childTasks || [];

      for (const childReq of workflow.child_requirements) {
        const childrenOfType = childTasks.filter(t => t.task_type === childReq.child_task_type);
        const minCount = childReq.min_count ?? 1;

        // If optional (min_count: 0) and no children exist, skip entirely
        if (minCount === 0 && childrenOfType.length === 0) {
          continue;
        }

        // Check minimum count (only if min_count > 0)
        if (minCount > 0 && childrenOfType.length < minCount) {
          missingRequirements.push({
            section_type: 'children' as any,
            description: `${childReq.label || childReq.child_task_type} (${childrenOfType.length}/${minCount})`,
            action_needed: `Add ${minCount - childrenOfType.length} more ${childReq.child_task_type}(s)${childReq.description ? ': ' + childReq.description : ''}`,
            is_conditional: false
          });
          continue;
        }

        // Validate workflow matching if required_workflow is specified
        if (childReq.required_workflow) {
          const childrenWithWrongWorkflow = childrenOfType.filter(
            t => t.workflow && t.workflow !== childReq.required_workflow
          );
          if (childrenWithWrongWorkflow.length > 0) {
            missingRequirements.push({
              section_type: 'children' as any,
              description: `${childReq.label || childReq.child_task_type} workflow mismatch`,
              action_needed: `${childrenWithWrongWorkflow.length} ${childReq.child_task_type}(s) must use '${childReq.required_workflow}' workflow`,
              is_conditional: false
            });
          }
        }

        // Check status validation
        if (childReq.validation?.all_must_be_in) {
          const requiredStatuses = childReq.validation.all_must_be_in;
          const childrenNotInStatus = childrenOfType.filter(
            t => !requiredStatuses.includes(t.task_status as any)
          );
          if (childrenNotInStatus.length > 0) {
            missingRequirements.push({
              section_type: 'children' as any,
              description: `${childReq.label || childReq.child_task_type} status requirements`,
              action_needed: `All ${childReq.child_task_type}(s) must be in status: ${requiredStatuses.join(' or ')}`,
              is_conditional: false
            });
          }
        }

        if (childReq.validation?.at_least_one_in) {
          const requiredStatuses = childReq.validation.at_least_one_in;
          const hasAtLeastOne = childrenOfType.some(
            t => requiredStatuses.includes(t.task_status as any)
          );
          if (!hasAtLeastOne) {
            missingRequirements.push({
              section_type: 'children' as any,
              description: `${childReq.label || childReq.child_task_type} progress requirement`,
              action_needed: `At least one ${childReq.child_task_type} must be in status: ${requiredStatuses.join(' or ')}`,
              is_conditional: false
            });
          }
        }

        // If all validations passed, mark as completed
        if (childrenOfType.length >= minCount) {
          completedRequirements.push(`${childReq.label || childReq.child_task_type} (${childrenOfType.length})`);
        }
      }
    }

    // Count only required child requirements (min_count > 0)
    const requiredChildCount = (workflow.child_requirements || []).filter(cr => (cr.min_count ?? 1) > 0).length;

    const totalRequired = workflow.required_sections.filter(s =>
      this.isSectionRequired(s, workflow, context)
    ).length + requiredChildCount;

    const completionPercentage = totalRequired > 0
      ? (completedRequirements.length / totalRequired) * 100
      : 100;

    return {
      is_valid: missingRequirements.length === 0,
      completion_percentage: completionPercentage,
      missing_requirements: missingRequirements,
      completed_requirements: completedRequirements,
      workflow: workflowName,
      can_override: true
    };
  }

  /**
   * Check if a section is required based on conditional logic
   */
  private isSectionRequired(
    section: WorkflowSection,
    workflow: WorkflowDefinition,
    context?: TaskContext
  ): boolean {
    // First check if there's a conditional requirement for this section
    const conditionalReq = workflow.conditional_requirements.find(
      cr => cr.section_type === section.section_type
    );

    if (conditionalReq && context) {
      // If there's a conditional requirement, evaluate it
      return this.evaluateCondition(conditionalReq, context);
    }

    // If no conditional requirement, fall back to the required field
    if (!section.required) {
      return false;
    }

    // If required but has conditional_logic without matching conditional requirement
    if (section.conditional_logic && !context) {
      // No context to evaluate, assume required
      return true;
    }

    return section.required;
  }

  /**
   * Evaluate a conditional requirement
   */
  private evaluateCondition(
    requirement: ConditionalRequirement,
    context: TaskContext
  ): boolean {
    const condition = requirement.condition.toLowerCase();

    // Handle different condition patterns
    if (condition === 'frontend_work' || condition === 'frontend_only') {
      return context.type === 'frontend' 
        ? requirement.required_when_true 
        : requirement.required_when_false;
    }
    
    if (condition === 'backend_work' || condition === 'backend_only') {
      return context.type === 'backend'
        ? requirement.required_when_true
        : requirement.required_when_false;
    }
    
    if (condition === 'full_stack' || condition === 'has_ui_components') {
      return context.type === 'full-stack'
        ? requirement.required_when_true
        : requirement.required_when_false;
    }

    // Handle negation conditions
    if (condition === '!backend' || condition === 'not_backend') {
      return context.type !== 'backend'
        ? requirement.required_when_true
        : requirement.required_when_false;
    }
    
    if (condition === '!frontend' || condition === 'not_frontend') {
      return context.type !== 'frontend'
        ? requirement.required_when_true
        : requirement.required_when_false;
    }

    // Handle complex conditions
    if (condition.includes('task_type != \'backend\'')) {
      return context.type !== 'backend'
        ? requirement.required_when_true
        : requirement.required_when_false;
    }
    
    if (condition.includes('task_type == \'backend\'')) {
      return context.type === 'backend'
        ? requirement.required_when_true
        : requirement.required_when_false;
    }

    // Check confidence-based conditions
    if (condition.includes('high_confidence') && context.confidence > 0.8) {
      return requirement.required_when_true;
    }

    // Default to required_when_false
    return requirement.required_when_false;
  }

  /**
   * Validate a specific section
   */
  private async validateSection(
    section: WorkflowSection,
    taskParams: CreateTaskParams
  ): Promise<boolean> {
    switch (section.section_type) {
      case 'title':
        return !!taskParams.title && taskParams.title.trim().length > 0;

      case 'description':
        return !!taskParams.description && taskParams.description.trim().length > 0;

      case 'architecture':
        return this.hasNoteForSection('architecture', section.validation_criteria);

      case 'erd':
        // Prefer strict content-based validation against currently-linked notes
        // Falls back to any explicit task->note link if notes were not supplied
        if (this.hasNoteForSection('erd', { note_type: 'documentation' })) return true;
        return this.hasLinkedNote(taskParams, 'erd', 'erDiagram');

      case 'api_contract':
        // Prefer strict content-based validation against currently-linked notes
        // Falls back to any explicit task->note link if notes were not supplied
        if (this.hasNoteForSection('api_contract', { note_type: 'documentation' })) return true;
        return this.hasLinkedNote(taskParams, 'api_contract', 'openapi');

      case 'observability':
        return this.hasNoteForSection('observability', section.validation_criteria);

      case 'mockups':
        return this.hasNoteForSection('mockups', section.validation_criteria);

      case 'implementation_checklist':
        return this.hasChecklist(taskParams, 'implementation', section.min_items);

      case 'test_checklist':
        return this.hasChecklist(taskParams, 'test', section.min_items);

      case 'acceptance_criteria':
        return this.hasGherkinChecklist(taskParams, 'Acceptance Criteria', section.min_items || 3);

      case 'rules':
      case 'rules_creation':
        return this.hasLinkedRules(taskParams, section.min_rules);

      case 'reproduction_steps':
        return this.hasChecklist(taskParams, 'reproduction|reproduce|steps to');

      case 'root_cause_analysis':
        return this.hasNoteForSection('root_cause_analysis', section.validation_criteria);

      case 'test_verification':
        return this.hasChecklistCoverage(taskParams, 'Test Verification', ['unit', 'integration|e2e'], section.min_items || 2);

      case 'regression_testing':
        return this.hasChecklist(taskParams, 'regression');

      case 'research_goals':
        return this.hasChecklist(taskParams, 'goals|objectives');

      case 'findings_documentation':
        return this.hasNoteForSection('findings_documentation', section.validation_criteria);

      case 'findings':
        return this.hasNoteForSection('findings', section.validation_criteria);

      case 'conclusions':
        return this.hasNoteForSection('conclusions', section.validation_criteria);

      case 'next_steps':
        return this.hasChecklist(taskParams, 'next steps|action items');

      case 'knowledge_rules':
        return this.hasLinkedRules(taskParams, section.min_rules);

      case 'scope_definition':
        return this.hasChecklist(taskParams, 'scope|included|excluded', section.min_items);

      default:
        return true;
    }
  }

  /**
   * Check if task has a linked note of specific type
   */
  private hasLinkedNote(
    taskParams: CreateTaskParams,
    noteType: string,
    contentPattern?: string
  ): boolean {
    // Check entity_links for notes
    if (taskParams.entity_links) {
      const hasNoteLink = taskParams.entity_links.some(link => 
        (link.entity_type as string) === 'note'
      );
      if (hasNoteLink) return true;
    }
    // No fallback to description parsing — structured links only
    return false;
  }

  /**
   * Check if task has linked rules
   */
  private hasLinkedRules(
    taskParams: CreateTaskParams,
    minRules?: number
  ): boolean {
    const requiredRules = minRules || 1;
    
    // Check entity_links for rules
    if (taskParams.entity_links) {
      const ruleLinks = taskParams.entity_links.filter(link => 
        (link.entity_type as string) === 'rule'
      );
      if (ruleLinks.length >= requiredRules) return true;
    }

    // No fallback to description parsing — structured links only
    return false;
  }

  /**
   * Check if task has a checklist with matching name
   */
  private hasChecklist(
    taskParams: CreateTaskParams,
    namePattern?: string,
    minItems?: number
  ): boolean {
    // Check if task has checklists field (we extend CreateTaskParams to include it)
    const checklists = (taskParams as any).checklists;
    
    logger.debug('DEBUG: hasChecklist - checklists:', checklists);
    logger.debug('DEBUG: hasChecklist - type:', typeof checklists);
    logger.debug('DEBUG: hasChecklist - isArray:', Array.isArray(checklists));
    
    // Ensure checklists is an array
    if (!checklists || !Array.isArray(checklists) || checklists.length === 0) {
      return false;
    }

    const requiredItems = minItems || 1;

    if (namePattern) {
      // Look for a checklist with name matching the pattern
      const pattern = new RegExp(namePattern, 'i');
      const matchingChecklist = checklists.find((checklist: any) => 
        pattern.test(checklist.name)
      );
      
      if (!matchingChecklist) return false;
      return matchingChecklist.items.length >= requiredItems;
    }

    // If no pattern, just check if any checklist has enough items
    return checklists.some((checklist: any) => 
      checklist.items.length >= requiredItems
    );
  }

  // Gherkin Acceptance Criteria: require Given/When/Then coverage and min items
  private hasGherkinChecklist(
    taskParams: CreateTaskParams,
    exactName: string,
    minItems: number
  ): boolean {
    const checklists = (taskParams as any).checklists;
    if (!Array.isArray(checklists)) return false;
    const list = checklists.find((c: any) => (c.name || '').toLowerCase() === exactName.toLowerCase());
    if (!list || !Array.isArray(list.items) || list.items.length < minItems) return false;
    const texts = list.items.map((i: any) => String(i.text || ''));
    const hasGiven = texts.some((t: string) => /\bGiven\b/i.test(t));
    const hasWhen = texts.some((t: string) => /\bWhen\b/i.test(t));
    const hasThen = texts.some((t: string) => /\bThen\b/i.test(t));
    return hasGiven && hasWhen && hasThen;
  }

  // Test coverage: ensure tokens like 'unit' and 'integration|e2e' appear across items
  private hasChecklistCoverage(
    taskParams: CreateTaskParams,
    exactName: string,
    requiredTokens: string[],
    minItems: number
  ): boolean {
    const checklists = (taskParams as any).checklists;
    if (!Array.isArray(checklists)) return false;
    const list = checklists.find((c: any) => (c.name || '').toLowerCase() === exactName.toLowerCase());
    if (!list || !Array.isArray(list.items) || list.items.length < minItems) return false;
    const text = list.items.map((i: any) => String(i.text || '')).join('\n');
    return requiredTokens.every(tok => new RegExp(tok, 'i').test(text));
  }

  // Strict note validation using cached notes (if present); fallback to any note link otherwise
  private hasNoteForSection(
    section: WorkflowSectionType,
    criteria?: { note_type?: string; must_contain_mermaid?: boolean; must_contain_sections?: string[] }
  ): boolean {
    if (this.currentNotes && this.currentNotes.length) {
      const wantType = (criteria?.note_type || (section === 'mockups' ? 'excalidraw' : 'documentation')).toLowerCase();
      const notes = this.currentNotes.filter(n => (n.note_type || '').toLowerCase() === wantType);
      if (notes.length === 0) return false;

      const needsMermaid = Boolean(criteria?.must_contain_mermaid) || section === 'architecture';
      const mustSections = criteria?.must_contain_sections || [];

      const ok = notes.some(n => {
        const c = n.content || '';
        if (needsMermaid && !/```\s*mermaid/i.test(c)) return false;
        if (section === 'erd' && !/erDiagram/i.test(c)) return false;
        if (section === 'api_contract' && !/openapi:\s*3\.1(\.\d+)?/i.test(c)) return false;
        if (section === 'observability') {
          if (!/##\s*Metrics/i.test(c) || !/##\s*Logs/i.test(c) || !/##\s*Alerts/i.test(c)) return false;
        }
        if (mustSections.length && !mustSections.every(s => c.includes(s))) return false;
        return true;
      });
      return ok;
    }
    // Fallback when notes are not supplied to validator
    return true;
  }

  /**
   * Get human-readable section description
   */
  private getSectionDescription(section: WorkflowSection): string {
    const descriptions: Record<WorkflowSectionType, string> = {
      title: 'Task title',
      description: 'Task description',
      architecture: 'Architecture notes with mermaid diagrams',
      erd: 'ERD note with mermaid erDiagram',
      api_contract: 'API contract note with OpenAPI 3.1 snippet',
      observability: 'Observability plan (metrics/logs/alerts)',
      acceptance_criteria: 'Acceptance Criteria (Given/When/Then)',
      decision_record: 'Decision record documenting chosen approach',
      mockups: 'UI mockups using excalidraw',
      implementation_checklist: `Implementation checklist (${section.min_items || 1}+ items)`,
      test_checklist: `Test verification checklist (${section.min_items || 1}+ items)`,
      rules: `Linked rules (${section.min_rules || 1}+ rules)`,
      rules_creation: `Create rules for best practices (${section.min_rules || 1}+ rules)`,
      reproduction_steps: 'Bug reproduction steps checklist',
      root_cause_analysis: 'Root cause analysis notes',
      test_verification: 'Test verification checklist',
      regression_testing: 'Regression testing checklist',
      research_goals: 'Research goals/objectives checklist',
      findings_documentation: 'Research findings documentation notes',
      findings: 'Research findings notes',
      conclusions: 'Research conclusions notes',
      next_steps: 'Next steps/action items checklist',
      knowledge_rules: `Knowledge rules (${section.min_rules || 1}+ rules)`,
      scope_definition: 'Scope definition checklist'
    };

    return descriptions[section.section_type] || section.section_type;
  }

  /**
   * Get action needed for missing section
   */
  private getActionNeeded(section: WorkflowSection): string {
    const actions: Record<WorkflowSectionType, string> = {
      title: 'Provide a clear, descriptive task title',
      description: 'Add a detailed task description',
      architecture: 'Create linked note with mermaid architecture diagrams',
      erd: 'Create linked documentation note with a mermaid erDiagram',
      api_contract: 'Attach a documentation note with OpenAPI 3.1 snippet',
      observability: 'Create documentation note for metrics, logs, and alerts',
      acceptance_criteria: 'Add 3+ Gherkin items (Given/When/Then) to Acceptance Criteria',
      decision_record: 'Create a decision record documenting the chosen approach',
      mockups: 'Create linked excalidraw note with UI mockups',
      implementation_checklist: 'Add implementation checklist items to task description',
      test_checklist: 'Add test verification checklist to task description',
      rules: 'Link or create rules for this task',
      rules_creation: 'Create rules capturing best practices',
      reproduction_steps: 'Add reproduction steps as a checklist',
      root_cause_analysis: 'Create note documenting root cause analysis',
      test_verification: 'Add test verification checklist',
      regression_testing: 'Add regression testing checklist',
      research_goals: 'Add research goals/objectives as checklist',
      findings_documentation: 'Create note documenting research findings',
      findings: 'Create note documenting research findings',
      conclusions: 'Create note with research conclusions',
      next_steps: 'Add next steps as actionable checklist',
      knowledge_rules: 'Create rules from research learnings',
      scope_definition: 'Define scope with what is included/excluded as checklist'
    };

    return actions[section.section_type] || `Complete ${section.section_type}`;
  }

  /**
   * Execute validation rule checks
   */
  private async executeValidationRule(
    ruleId: string,
    workflow: WorkflowDefinition,
    taskParams: CreateTaskParams
  ): Promise<{ valid: boolean; error?: string }> {
    const rule = workflow.validation_rules.find(r => r.id === ruleId);
    if (!rule) return { valid: true };

    const checklists = (taskParams as any).checklists || [];
    const notes = this.currentNotes || [];

    switch (ruleId) {
      case 'architecture_mermaid_quality':
        const archNotes = notes.filter(n => n.note_type === 'documentation' && /```\s*mermaid/i.test(n.content || ''));
        return {
          valid: archNotes.length > 0,
          error: rule.error_message
        };

      case 'erd_validation':
        const erdNotes = notes.filter(n => /erDiagram/i.test(n.content || ''));
        return {
          valid: erdNotes.length > 0,
          error: rule.error_message
        };

      case 'excalidraw_mockup_completeness':
        const mockups = notes.filter(n => n.note_type === 'excalidraw');
        return {
          valid: mockups.length > 0,
          error: rule.error_message
        };

      case 'checklist_non_empty':
        const hasEmptyItems = checklists.some((cl: any) =>
          cl.items.some((item: any) => {
            const text = (item.text || '').trim().toLowerCase();
            return !text || text === 'todo' || text === 'tbd' || text === '...' || text === '-';
          })
        );
        return {
          valid: !hasEmptyItems,
          error: rule.error_message
        };

      case 'acceptance_criteria_gherkin':
        const acChecklist = checklists.find((cl: any) => /acceptance criteria/i.test(cl.name));
        if (!acChecklist) return { valid: false, error: rule.error_message };
        const texts = acChecklist.items.map((i: any) => String(i.text || ''));
        const hasGiven = texts.some((t: string) => /\bGiven\b/i.test(t));
        const hasWhen = texts.some((t: string) => /\bWhen\b/i.test(t));
        const hasThen = texts.some((t: string) => /\bThen\b/i.test(t));
        return {
          valid: hasGiven && hasWhen && hasThen,
          error: rule.error_message
        };

      case 'test_coverage_validation':
        const testChecklist = checklists.find((cl: any) => /test verification/i.test(cl.name));
        if (!testChecklist) return { valid: false, error: rule.error_message };
        const testText = testChecklist.items.map((i: any) => String(i.text || '')).join('\n');
        const hasUnit = /\bunit\b/i.test(testText);
        const hasIntegration = /\b(integration|e2e)\b/i.test(testText);
        return {
          valid: hasUnit && hasIntegration,
          error: rule.error_message
        };

      case 'reproduction_steps_clarity':
        const reproChecklist = checklists.find((cl: any) => /reproduction|reproduce/i.test(cl.name));
        if (!reproChecklist) return { valid: false, error: rule.error_message };
        const hasVagueSteps = reproChecklist.items.some((item: any) => {
          const text = (item.text || '').toLowerCase();
          return /try to|test the|reproduce|check if/i.test(text) && text.length < 30;
        });
        return {
          valid: !hasVagueSteps && reproChecklist.items.length >= 2,
          error: rule.error_message
        };

      case 'root_cause_depth':
        const rcaNotes = notes.filter(n => /root cause/i.test(n.title || '') || /root cause/i.test(n.content || ''));
        if (rcaNotes.length === 0) return { valid: false, error: rule.error_message };
        const hasWhy = rcaNotes.some(n => /why/i.test(n.content || ''));
        const hasExplanation = rcaNotes.some(n => (n.content || '').length > 100);
        return {
          valid: hasWhy && hasExplanation,
          error: rule.error_message
        };

      case 'regression_test_validation':
        const regressionChecklist = checklists.find((cl: any) => /regression/i.test(cl.name));
        return {
          valid: !!regressionChecklist && regressionChecklist.items.length > 0,
          error: rule.error_message
        };

      default:
        return { valid: true };
    }
  }

  /**
   * Validate a named validation bundle against the current task parameters.
   */
  async validateBundle(
    bundle: WorkflowValidationBundle,
    workflow: WorkflowDefinition,
    taskParams: CreateTaskParams,
    context?: TaskContext,
    opts?: { notes?: Array<{ id: string; title?: string; note_type?: string; content?: string }> }
  ): Promise<ValidationStatus> {
    this.currentNotes = opts?.notes || undefined;
    const requiredSections = bundle.sections || [];
    const optionalSections = bundle.optional_sections || [];
    const bundleRules = bundle.rules || [];
    const missingRequirements: MissingRequirement[] = [];
    const completedRequirements: string[] = [];
    let completedRequiredCount = 0;

    for (const sectionType of requiredSections) {
      const section = this.findSection(workflow, sectionType);
      if (!section) {
        missingRequirements.push({
          section_type: sectionType,
          description: `${sectionType} (missing section definition)`,
          action_needed: `Add section definition for ${sectionType}`,
          is_conditional: false
        });
        continue;
      }

      const isRequired = this.isSectionRequired(section, workflow, context);
      if (!isRequired) {
        completedRequirements.push(`${section.section_type} (not required in context)`);
        completedRequiredCount += 1;
        continue;
      }

      const sectionValid = await this.validateSection(section, taskParams);
      if (sectionValid) {
        completedRequirements.push(section.section_type);
        completedRequiredCount += 1;
      } else {
        missingRequirements.push({
          section_type: section.section_type,
          description: this.getSectionDescription(section),
          action_needed: this.getActionNeeded(section),
          is_conditional: !!section.conditional_logic,
          condition_not_met: section.conditional_logic
        });
      }
    }

    for (const optionalSection of optionalSections) {
      const section = this.findSection(workflow, optionalSection);
      if (!section) continue;
      const sectionValid = await this.validateSection(section, taskParams);
      if (sectionValid) {
        completedRequirements.push(section.section_type);
      }
    }

    // Validate bundle-specific rules
    for (const ruleId of bundleRules) {
      const result = await this.executeValidationRule(ruleId, workflow, taskParams);
      if (result.valid) {
        completedRequirements.push(`Rule: ${ruleId}`);
        completedRequiredCount += 1;
      } else {
        const rule = workflow.validation_rules.find(r => r.id === ruleId);
        missingRequirements.push({
          section_type: 'validation_rule' as any,
          description: rule?.name || ruleId,
          action_needed: result.error || rule?.error_message || `Fix validation rule: ${ruleId}`,
          is_conditional: false
        });
      }
    }

    const requiredCount = requiredSections.length + bundleRules.length;
    const completionPercentage = requiredCount > 0
      ? (completedRequiredCount / requiredCount) * 100
      : 100;

    return {
      is_valid: missingRequirements.length === 0,
      completion_percentage: completionPercentage,
      missing_requirements: missingRequirements,
      completed_requirements: completedRequirements,
      workflow: workflow.name,
      can_override: true,
      bundle_id: bundle.id,
      bundle_name: bundle.name
    };
  }

  /**
   * Format validation error for response
   */
  formatValidationError(status: ValidationStatus): WorkflowValidationError {
    return {
      error: `Task creation failed - Missing required items for '${status.workflow}' workflow`,
      missing_requirements: status.missing_requirements.map(req => 
        `${req.section_type}: ${req.action_needed}`
      ),
      workflow_used: status.workflow,
      can_override: status.can_override,
      suggestions: this.getSuggestions(status)
    };
  }

  /**
   * Get helpful suggestions based on validation status
   */
  private getSuggestions(status: ValidationStatus): string[] {
    const suggestions: string[] = [];

    if (status.missing_requirements.some(r => r.section_type === 'architecture')) {
      suggestions.push('Use the notes tool to create an architecture note with mermaid diagrams');
    }

    if (status.missing_requirements.some(r => r.section_type === 'mockups')) {
      suggestions.push('Create an excalidraw note with UI mockups and link it to the task');
    }

    if (status.missing_requirements.some(r => r.section_type.includes('checklist'))) {
      suggestions.push('Add checklist items via the Checklists panel on the task');
    }

    if (status.completion_percentage > 80) {
      suggestions.push('You\'re almost there! Complete the remaining items or use skip_validation=true');
    }

    return suggestions;
  }

  private findSection(workflow: WorkflowDefinition, sectionType: WorkflowSectionType): WorkflowSection | undefined {
    return workflow.required_sections.find(section => section.section_type === sectionType);
  }
}
