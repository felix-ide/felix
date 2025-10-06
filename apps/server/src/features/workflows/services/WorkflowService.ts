import { WorkflowConfigManager } from '../../../storage/WorkflowConfigManager.js';
import { WorkflowValidator } from '../../../validation/WorkflowValidator.js';
import type { WorkflowDefinition, CreateTaskParams, ValidationStatus, SubtaskRequirement } from '../../../types/WorkflowTypes.js';
import { DatabaseManager } from '../../storage/DatabaseManager.js';

export class WorkflowService {
  constructor(private dbManager: DatabaseManager) {}

  private async getDefinitions(): Promise<WorkflowDefinition[]> {
    const mgr = new WorkflowConfigManager(this.dbManager.getMetadataDataSource());
    await mgr.initialize();
    return mgr.listAvailableWorkflows();
  }

  async validate(task: CreateTaskParams, workflowName?: string): Promise<ValidationStatus> {
    const defs = await this.getDefinitions();
    const validator = new WorkflowValidator(defs);
    const params = { ...task } as CreateTaskParams;
    if (workflowName) (params as any).workflow = workflowName as any;
    // Gather linked notes for strict validation (by direct note links and reverse task links)
    const notesRepo = this.dbManager.getNotesRepository();
    const notes: Array<{ id: string; title?: string; note_type?: string; content?: string }> = [];
    const seen = new Set<string>();
    try {
      // Direct links on task
      const directNoteIds = ((params as any).entity_links || [])
        .filter((l: any) => (l.entity_type as string) === 'note')
        .map((l: any) => String(l.entity_id));
      for (const nid of directNoteIds) {
        if (seen.has(nid)) continue;
        const n = await notesRepo.getNote(nid);
        if (n) { notes.push({ id: n.id, title: n.title, note_type: (n as any).note_type, content: (n as any).content }); seen.add(n.id); }
      }
      // Reverse links via note.entity_links → task.id
      const taskId = (params as any).id || (params as any).task_id;
      if (taskId) {
        const found = await notesRepo.searchNotes({ entity_type: 'task' as any, entity_id: taskId, limit: 100 } as any);
        for (const n of (found.items || [])) {
          if (seen.has(n.id)) continue;
          notes.push({ id: n.id, title: n.title, note_type: (n as any).note_type, content: (n as any).content });
          seen.add(n.id);
        }
      }
    } catch {}
    let base = await validator.validateTask(params, undefined, { notes });
    // Apply waivers (if any) to missing requirements
    try {
      const waivers: Array<{ code: string }> = (task as any).spec_waivers || [];
      if (Array.isArray(waivers) && waivers.length && base.missing_requirements?.length) {
        const waived = new Set(waivers.map(w => w.code));
        const remaining = base.missing_requirements.filter(m => !waived.has(m.section_type as any));
        if (remaining.length !== base.missing_requirements.length) {
          base = {
            ...base,
            missing_requirements: remaining,
            is_valid: remaining.length === 0,
            completion_percentage: remaining.length === 0 ? 100 : base.completion_percentage
          };
        }
      }
    } catch {}
    // Structural: subtasks requirements (if task has an id)
    const wf = defs.find(d => d.name === ((params as any).workflow || 'simple'));
    if (wf && Array.isArray((wf as any).subtasks_required) && (task as any).id) {
      const subtasks = await this.dbManager.getTasksRepository().searchTasks({ parent_id: (task as any).id });
      const children = subtasks.items || [];
      const extraMissing: any[] = [];
      for (const req of ((wf as any).subtasks_required as SubtaskRequirement[])) {
        const match = children.filter(t => (!req.task_type || t.task_type === req.task_type)
          && (!req.status_in || req.status_in.includes(t.task_status as any))
          && (!req.tags_any || (t as any).stable_tags?.some((tg: string) => req.tags_any!.includes(tg))));
        const okCount = match.length >= (req.min || 1);
        if (!okCount) {
          extraMissing.push({
            section_type: 'subtasks_required',
            description: req.label || 'Required subtasks',
            action_needed: `Create at least ${(req.min||1)} subtasks${req.task_type?` of type '${req.task_type}'`:''}.`,
            is_conditional: false
          });
        }
      }
      if (extraMissing.length) {
        base.missing_requirements = [...base.missing_requirements, ...extraMissing];
        base.is_valid = false;
        const totalReq = base.completed_requirements.length + extraMissing.length;
        if (totalReq > 0) base.completion_percentage = (base.completed_requirements.length / totalReq) * 100;
      }
    }
    return base;
  }

  async resolveWorkflowName(taskType?: string, provided?: string): Promise<string> {
    if (provided) return provided;
    const mgr = new WorkflowConfigManager(this.dbManager.getMetadataDataSource());
    await mgr.initialize();
    const fromType = await mgr.getWorkflowForTaskType(taskType);
    if (fromType) return fromType;
    return await mgr.getDefaultWorkflow();
  }
}
