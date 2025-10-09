import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import type { ITask } from '@felix/code-intelligence';
import {
  MissingRequirement,
  ValidationStatus,
  WorkflowDefinition,
  WorkflowStatusFlow,
  WorkflowTransition
} from '../../../types/WorkflowTypes.js';
import { WorkflowValidator } from '../../../validation/WorkflowValidator.js';
import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { WorkflowService } from './WorkflowService.js';
import { TransitionGate } from '../../storage/entities/metadata/TransitionGate.entity.js';

export interface TransitionEvaluationResult {
  allowed: boolean;
  workflow?: WorkflowDefinition;
  transition?: WorkflowTransition;
  bundle_results?: ValidationStatus[];
  missing_requirements?: MissingRequirement[];
  prompt?: string;
  gate?: TransitionGate;
  gate_required?: boolean;
}

interface EvaluateOptions {
  gateToken?: string;
  actor?: string;
}

interface PromptContext {
  [key: string]: string | undefined;
}

export class WorkflowTransitionService {
  private workflowService: WorkflowService;

  constructor(private dbManager: DatabaseManager) {
    this.workflowService = new WorkflowService(dbManager);
  }

  async evaluateStatusChange(task: ITask, targetStatus: string, options: EvaluateOptions = {}): Promise<TransitionEvaluationResult> {
    const workflowName = (task as any).workflow || 'simple';
    const workflow = await this.workflowService.getWorkflowDefinition(workflowName);

    if (!workflow) {
      return { allowed: true };
    }

    const flow = workflow.status_flow as WorkflowStatusFlow | undefined;
    if (!flow || !Array.isArray(flow.transitions) || flow.transitions.length === 0) {
      return { allowed: true, workflow };
    }

    const currentStatus = (task as any).task_status || flow.initial_state || 'todo';
    const transition = this.resolveTransition(flow, currentStatus, targetStatus);

    if (!transition) {
      // No explicit transition rule — allow by default.
      return { allowed: true, workflow };
    }

    const bundleResults = await this.evaluateBundles(workflow, transition, task);
    const missingRequirements = bundleResults.flatMap(result => result.missing_requirements ?? []);

    const context = this.buildPromptContext(workflow, transition, task, targetStatus, bundleResults, missingRequirements);
    const basePrompt = transition.pre_prompt_template ? this.renderTemplate(transition.pre_prompt_template, context) : undefined;

    if (missingRequirements.length > 0) {
      const missingPrompt = basePrompt || this.defaultMissingPrompt(bundleResults);
      return {
        allowed: false,
        workflow,
        transition,
        bundle_results: bundleResults,
        missing_requirements: missingRequirements,
        prompt: missingPrompt
      };
    }

    if (transition.gate?.require_acknowledgement) {
      return await this.handleGate(workflow, transition, task, targetStatus, context, bundleResults, options);
    }

    await this.applyAutoChecklist(task, transition);

    const postPrompt = transition.post_prompt_template
      ? this.renderTemplate(transition.post_prompt_template, context)
      : undefined;

    return {
      allowed: true,
      workflow,
      transition,
      bundle_results: bundleResults,
      prompt: postPrompt
    };
  }

  private async evaluateBundles(
    workflow: WorkflowDefinition,
    transition: WorkflowTransition,
    task: ITask
  ): Promise<ValidationStatus[]> {
    const bundleIds = transition.required_bundles || [];
    if (!bundleIds.length) return [];

    const bundles = workflow.validation_bundles || [];
    const validator = new WorkflowValidator([workflow]);
    const notes = await this.collectNotes(task);
    const params = { ...(task as any), workflow: workflow.name } as any;

    const results: ValidationStatus[] = [];
    for (const bundleId of bundleIds) {
      const bundle = bundles.find(b => b.id === bundleId);
      if (!bundle) {
        results.push({
          is_valid: false,
          completion_percentage: 0,
          missing_requirements: [{
            section_type: 'title',
            description: `Bundle '${bundleId}' not found in workflow`,
            action_needed: 'Update workflow configuration to include this bundle',
            is_conditional: false
          }],
          completed_requirements: [],
          workflow: workflow.name,
          can_override: false,
          bundle_id: bundleId,
          bundle_name: bundleId
        });
        continue;
      }

      const result = await validator.validateBundle(
        bundle,
        workflow,
        params,
        undefined,
        { notes }
      );
      results.push(result);
    }
    return results;
  }

  private resolveTransition(flow: WorkflowStatusFlow, currentStatus: string, targetStatus: string): WorkflowTransition | undefined {
    return flow.transitions.find(transition => {
      if (transition.to !== targetStatus) return false;
      return transition.from === currentStatus || transition.from === '*' || transition.from === 'any';
    });
  }

  private async collectNotes(task: ITask): Promise<Array<{ id: string; title?: string; note_type?: string; content?: string }>> {
    const notesRepo = this.dbManager.getNotesRepository();
    const notes: Array<{ id: string; title?: string; note_type?: string; content?: string }> = [];
    const seen = new Set<string>();
    try {
      const directNoteIds = ((task as any).entity_links || [])
        .filter((link: any) => (link.entity_type as string) === 'note')
        .map((link: any) => String(link.entity_id));
      for (const noteId of directNoteIds) {
        if (seen.has(noteId)) continue;
        const note = await notesRepo.getNote(noteId);
        if (note) {
          notes.push({ id: note.id, title: note.title, note_type: (note as any).note_type, content: (note as any).content });
          seen.add(note.id);
        }
      }

      const taskId = (task as any).id;
      if (taskId) {
        const reverse = await notesRepo.searchNotes({ entity_type: 'task' as any, entity_id: taskId, limit: 100 } as any);
        for (const note of (reverse.items || [])) {
          if (seen.has(note.id)) continue;
          notes.push({ id: note.id, title: note.title, note_type: (note as any).note_type, content: (note as any).content });
          seen.add(note.id);
        }
      }
    } catch {
      // ignore note lookup failures
    }
    return notes;
  }

  private async handleGate(
    workflow: WorkflowDefinition,
    transition: WorkflowTransition,
    task: ITask,
    targetStatus: string,
    context: PromptContext,
    bundleResults: ValidationStatus[],
    options: EvaluateOptions
  ): Promise<TransitionEvaluationResult> {
    const repo = this.getGateRepository();
    const existing = await repo.findOne({
      where: {
        task_id: (task as any).id,
        transition_id: transition.id,
        state: 'pending'
      }
    });

    if (existing) {
      if (options.gateToken && existing.issued_token && existing.issued_token === options.gateToken) {
        existing.state = 'acknowledged';
        existing.acknowledged_at = new Date();
        await repo.save(existing);
        await this.applyAutoChecklist(task, transition);
        const postPrompt = transition.post_prompt_template
          ? this.renderTemplate(transition.post_prompt_template, context)
          : undefined;
        return {
          allowed: true,
          workflow,
          transition,
          bundle_results: bundleResults,
          prompt: postPrompt
        };
      }

      const ackPrompt = existing.prompt || this.renderTemplate(
        transition.gate?.acknowledgement_prompt_template || transition.pre_prompt_template || '',
        { ...context, gate_token: existing.issued_token ?? '' }
      );
      return {
        allowed: false,
        workflow,
        transition,
        bundle_results: bundleResults,
        gate: existing,
        gate_required: true,
        prompt: ackPrompt
      };
    }

    const token = this.generateToken();
    const prompt = this.renderTemplate(
      transition.gate?.acknowledgement_prompt_template || transition.pre_prompt_template || 'Please confirm completion before continuing.',
      { ...context, gate_token: token }
    );

    const gate = repo.create({
      task_id: (task as any).id,
      workflow: workflow.name,
      transition_id: transition.id,
      target_status: targetStatus,
      state: 'pending',
      issued_token: token,
      prompt,
      metadata: {
        actor: options.actor,
        bundle_ids: (transition.required_bundles || []),
        auto_checklist: transition.gate?.auto_checklist
      }
    });
    await repo.save(gate);

    await this.applyAutoChecklist(task, transition);

    return {
      allowed: false,
      workflow,
      transition,
      bundle_results: bundleResults,
      gate,
      gate_required: true,
      prompt
    };
  }

  private async applyAutoChecklist(task: ITask, transition?: WorkflowTransition): Promise<void> {
    if (!transition?.gate?.auto_checklist) return;
    const { name, items, merge_strategy } = transition.gate.auto_checklist;
    if (!name || !Array.isArray(items) || items.length === 0) return;

    const taskId = (task as any).id;
    if (!taskId) return;

    const tasksRepo = this.dbManager.getTasksRepository();
    const fullTask = await tasksRepo.getTask(taskId);
    if (!fullTask) return;

    const checklistName = String(name).trim();
    if (!checklistName) return;

    const normalizedItems = items
      .map((item) => String(item || '').trim())
      .filter((item) => item.length > 0);
    if (!normalizedItems.length) return;

    const mergeStrategy = merge_strategy === 'replace' ? 'replace' : 'append';

    const currentLists: Array<{ name: string; items: Array<{ text: string; checked?: boolean }> }> =
      Array.isArray((fullTask as any).checklists) ? JSON.parse(JSON.stringify((fullTask as any).checklists)) : [];

    const existingIndex = currentLists.findIndex(
      (checklist) => (checklist.name || '').toLowerCase() === checklistName.toLowerCase()
    );

    const incomingItems = normalizedItems.map((text) => ({ text, checked: false }));

    if (existingIndex === -1) {
      currentLists.push({
        name: checklistName,
        items: incomingItems
      });
    } else {
      const existing = currentLists[existingIndex] || { name: checklistName, items: [] };
      if (mergeStrategy === 'replace') {
        currentLists[existingIndex] = {
          name: checklistName,
          items: incomingItems
        };
      } else {
        const existingItems = Array.isArray(existing.items) ? existing.items : [];
        const existingTexts = new Set(existingItems.map((entry) => String(entry.text || '').trim().toLowerCase()));
        const appended = [...existingItems];
        for (const entry of incomingItems) {
          if (!existingTexts.has(entry.text.toLowerCase())) {
            appended.push(entry);
          }
        }
        currentLists[existingIndex] = {
          name: checklistName,
          items: appended
        };
      }
    }

    await tasksRepo.updateTask(taskId, { checklists: currentLists } as any);
    (task as any).checklists = currentLists;
  }

  private buildPromptContext(
    workflow: WorkflowDefinition,
    transition: WorkflowTransition,
    task: ITask,
    targetStatus: string,
    bundleResults: ValidationStatus[],
    missingRequirements: MissingRequirement[]
  ): PromptContext {
    const bundleSummary = bundleResults
      .map(result => `${result.bundle_name || result.bundle_id || 'bundle'}: ${result.is_valid ? '✅' : '❌'}`)
      .join('\n');
    const missingSummary = missingRequirements
      .map(miss => `• ${miss.section_type}: ${miss.action_needed}`)
      .join('\n');

    return {
      'task.title': (task as any).title,
      'task.id': (task as any).id,
      'workflow.name': workflow.name,
      'transition.label': transition.label || transition.id,
      'transition.description': transition.description,
      current_status: (task as any).task_status,
      target_status: targetStatus,
      bundle_summary: bundleSummary,
      missing_summary: missingSummary
    };
  }

  private renderTemplate(template: string, context: PromptContext): string {
    if (!template) return '';
    return template.replace(/\{\{\s*([.\w]+)\s*\}\}/g, (_match, key) => {
      if (context.hasOwnProperty(key)) {
        const value = context[key];
        return value !== undefined ? String(value) : '';
      }
      return '';
    });
  }

  private defaultMissingPrompt(results: ValidationStatus[]): string {
    if (!results.length) return 'Additional validation is required before this transition can continue.';
    const summary = results
      .filter(result => !(result.is_valid))
      .map(result => {
        const title = result.bundle_name || result.bundle_id || 'Bundle';
        const details = result.missing_requirements
          .map(req => `• ${req.section_type}: ${req.action_needed}`)
          .join('\n');
        return `${title}\n${details}`;
      })
      .join('\n\n');
    return `Transition blocked by missing requirements:\n${summary}`;
  }

  private getGateRepository(): Repository<TransitionGate> {
    const dataSource = this.dbManager.getMetadataDataSource();
    return dataSource.getRepository(TransitionGate);
  }

  private generateToken(): string {
    return randomBytes(16).toString('hex');
  }
}
