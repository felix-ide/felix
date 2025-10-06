import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { WorkflowService } from './WorkflowService.js';
import type { CreateTaskParams, WorkflowSectionType, SubtaskRequirement, WorkflowDefinition } from '../../../types/WorkflowTypes.js';
import { EmbeddingService } from '../../../nlp/EmbeddingServiceAdapter.js';
import { TaskManagementService } from '../../metadata/services/TaskManagementService.js';

export class WorkflowScaffoldingService {
  private workflowService: WorkflowService;
  constructor(private dbManager: DatabaseManager) {
    this.workflowService = new WorkflowService(dbManager);
  }

  async scaffoldMissing(taskId: string, workflowName?: string, options?: { dryRun?: boolean; sections?: WorkflowSectionType[]; stubs?: any[] }): Promise<{ created?: any; skipped?: any; templates?: any }>{
    const tasks = this.dbManager.getTasksRepository();
    const notes = this.dbManager.getNotesRepository();
    const task = await tasks.getTask(taskId);
    if (!task) throw new Error('Task not found');

    // Build a CreateTaskParams snapshot for validation
    const params: CreateTaskParams = {
      title: task.title,
      description: task.description || '',
      entity_links: task.entity_links as any,
      stable_tags: (task as any).stable_tags || [],
      checklists: (task as any).checklists || []
    } as any;
    const status = await this.workflowService.validate(params, workflowName);
    const missing = status.missing_requirements.map(m => m.section_type);

    const created: any = { notes: [], checklists: [] };
    const skipped: any = { notes: [], checklists: [] };
    const templates: any = { notes: {}, checklists: {} };

    // Helper to check existing notes for idempotency
    const existingNotes = await notes.getNotesByEntity('task', taskId);
    const hasNoteLike = (keyword: string) => existingNotes.some(n => (n.title||'').toLowerCase().includes(keyword));

    // Checklists idempotency
    const existingChecklists = ((task as any).checklists || []) as Array<{ name: string; items: any[] }>;
    const hasChecklist = (name: string) => existingChecklists.some(c => c.name.toLowerCase() === name.toLowerCase());

    // Create artifacts per missing section
    const allow = new Set((options?.sections || missing) as string[]);
    const dryRun = options?.dryRun !== false; // default true
    for (const section of missing) {
      if (!allow.has(section)) continue;
      switch (section as WorkflowSectionType) {
        case 'architecture': {
          const title = `Architecture for: ${task.title}`;
          const content = '```mermaid\nflowchart LR\n  A[Start] --> B[Implement]\n```';
          if (dryRun) { templates.notes['architecture'] = { title, content, note_type: 'documentation' }; break; }
          if (hasNoteLike('architecture')) { skipped.notes.push('architecture'); break; }
          await notes.createNote({ title, content, note_type: 'documentation' as any, entity_links: [{ entity_type: 'task', entity_id: taskId, link_strength: 'primary' }] } as any);
          created.notes.push('architecture');
          break;
        }
        case 'mockups': {
          const title = `Mockups for: ${task.title}`;
          const content = '{"type":"excalidraw","elements":[]}';
          if (dryRun) { templates.notes['mockups'] = { title, content, note_type: 'excalidraw' }; break; }
          if (hasNoteLike('mockup') || hasNoteLike('wireframe')) { skipped.notes.push('mockups'); break; }
          await notes.createNote({ title, content, note_type: 'excalidraw' as any, entity_links: [{ entity_type: 'task', entity_id: taskId, link_strength: 'primary' }] } as any);
          created.notes.push('mockups');
          break;
        }
        case 'implementation_checklist': {
          const name = 'Implementation Checklist';
          const items = ['Implement core changes', 'Update related files', 'Run lint & build'];
          if (dryRun) { templates.checklists[name] = items; break; }
          if (hasChecklist(name)) { skipped.checklists.push(name); break; }
          const taskWithChecklists = (task as any);
          taskWithChecklists.checklists = taskWithChecklists.checklists || [];
          taskWithChecklists.checklists.push({ name, items: items.map(t => ({ text: t, checked: false })) });
          await tasks.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
          created.checklists.push(name);
          break;
        }
        case 'acceptance_criteria': {
          const name = 'Acceptance Criteria';
          const items = [
            'Given initial state, When action performed, Then expected outcome',
            'Given invalid input, When submitted, Then validation error shown',
            'Given unauthenticated user, When accessing protected route, Then 401'
          ];
          if (dryRun) { templates.checklists[name] = items; break; }
          if (hasChecklist(name)) { skipped.checklists.push(name); break; }
          const taskWithChecklists = (task as any);
          taskWithChecklists.checklists = taskWithChecklists.checklists || [];
          taskWithChecklists.checklists.push({ name, items: items.map(t => ({ text: t, checked: false })) });
          await tasks.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
          created.checklists.push(name);
          break;
        }
        case 'test_checklist': {
          const name = 'Tests';
          const items = ['Add unit tests', 'Add integration tests', 'Verify edge cases'];
          if (dryRun) { templates.checklists[name] = items; break; }
          if (hasChecklist(name)) { skipped.checklists.push(name); break; }
          const taskWithChecklists = (task as any);
          taskWithChecklists.checklists = taskWithChecklists.checklists || [];
          taskWithChecklists.checklists.push({ name, items: items.map(t => ({ text: t, checked: false })) });
          await tasks.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
          created.checklists.push(name);
          break;
        }
        case 'reproduction_steps': {
          const name = 'Reproduction Steps';
          const items = ['Describe environment', 'Steps to reproduce', 'Expected vs actual'];
          if (dryRun) { templates.checklists[name] = items; break; }
          if (hasChecklist(name)) { skipped.checklists.push(name); break; }
          const taskWithChecklists = (task as any);
          taskWithChecklists.checklists = taskWithChecklists.checklists || [];
          taskWithChecklists.checklists.push({ name, items: items.map(t => ({ text: t, checked: false })) });
          await tasks.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
          created.checklists.push(name);
          break;
        }
        case 'root_cause_analysis': {
          const title = `Root Cause Analysis: ${task.title}`;
          const content = 'Root cause:\n\nImpact:\n\nFix plan:\n';
          if (dryRun) { templates.notes['root_cause_analysis'] = { title, content, note_type: 'note' }; break; }
          if (hasNoteLike('root cause')) { skipped.notes.push('root_cause_analysis'); break; }
          await notes.createNote({ title, content, note_type: 'note' as any, entity_links: [{ entity_type: 'task', entity_id: taskId, link_strength: 'primary' }] } as any);
          created.notes.push('root_cause_analysis');
          break;
        }
        case 'test_verification': {
          const name = 'Test Verification';
          const items = ['Unit tests cover core logic', 'Integration/E2E happy path executes'];
          if (dryRun) { templates.checklists[name] = items; break; }
          if (hasChecklist(name)) { skipped.checklists.push(name); break; }
          const taskWithChecklists = (task as any);
          taskWithChecklists.checklists = taskWithChecklists.checklists || [];
          taskWithChecklists.checklists.push({ name, items: items.map(t => ({ text: t, checked: false })) });
          await tasks.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
          created.checklists.push(name);
          break;
        }
        case 'regression_testing': {
          const name = 'Regression Testing';
          const items = ['Define regression scope', 'Execute suite', 'Record results'];
          if (dryRun) { templates.checklists[name] = items; break; }
          if (hasChecklist(name)) { skipped.checklists.push(name); break; }
          const taskWithChecklists = (task as any);
          taskWithChecklists.checklists = taskWithChecklists.checklists || [];
          taskWithChecklists.checklists.push({ name, items: items.map(t => ({ text: t, checked: false })) });
          await tasks.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
          created.checklists.push(name);
          break;
        }
        case 'research_goals': {
          const name = 'Research Goals';
          const items = ['Define questions', 'Outline scope', 'Identify resources'];
          if (dryRun) { templates.checklists[name] = items; break; }
          if (hasChecklist(name)) { skipped.checklists.push(name); break; }
          const taskWithChecklists = (task as any);
          taskWithChecklists.checklists = taskWithChecklists.checklists || [];
          taskWithChecklists.checklists.push({ name, items: items.map(t => ({ text: t, checked: false })) });
          await tasks.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
          created.checklists.push(name);
          break;
        }
        case 'findings_documentation': {
          const title = `Findings: ${task.title}`;
          const content = 'Key findings:\n\nEvidence:\n\nImplications:\n';
          if (dryRun) { templates.notes['findings_documentation'] = { title, content, note_type: 'documentation' }; break; }
          if (hasNoteLike('findings')) { skipped.notes.push('findings_documentation'); break; }
          await notes.createNote({ title, content, note_type: 'documentation' as any, entity_links: [{ entity_type: 'task', entity_id: taskId, link_strength: 'primary' }] } as any);
          created.notes.push('findings_documentation');
          break;
        }
        case 'conclusions': {
          const title = `Conclusions: ${task.title}`;
          const content = 'Conclusions:\n\nRecommendations:\n';
          if (dryRun) { templates.notes['conclusions'] = { title, content, note_type: 'note' }; break; }
          if (hasNoteLike('conclusion')) { skipped.notes.push('conclusions'); break; }
          await notes.createNote({ title, content, note_type: 'note' as any, entity_links: [{ entity_type: 'task', entity_id: taskId, link_strength: 'primary' }] } as any);
          created.notes.push('conclusions');
          break;
        }
        case 'next_steps': {
          const name = 'Next Steps';
          const items = ['Prioritize actions', 'Create follow-up tasks', 'Schedule reviews'];
          if (dryRun) { templates.checklists[name] = items; break; }
          if (hasChecklist(name)) { skipped.checklists.push(name); break; }
          const taskWithChecklists = (task as any);
          taskWithChecklists.checklists = taskWithChecklists.checklists || [];
          taskWithChecklists.checklists.push({ name, items: items.map(t => ({ text: t, checked: false })) });
          await tasks.updateTask(taskId, { checklists: taskWithChecklists.checklists } as any);
          created.checklists.push(name);
          break;
        }
        case 'knowledge_rules':
        case 'rules_creation': {
          const title = `Proposed Rules: ${task.title}`;
          const content = '- Describe best practices\n- Consider automation\n- Add validation rules';
          if (dryRun) { templates.notes['rules_creation'] = { title, content, note_type: 'note' }; break; }
          if (hasNoteLike('rule')) { skipped.notes.push('rules_creation'); break; }
          await notes.createNote({ title, content, note_type: 'note' as any, entity_links: [{ entity_type: 'task', entity_id: taskId, link_strength: 'secondary' }] } as any);
          created.notes.push('rules_creation');
          break;
        }
        default:
          break;
      }
    }

    // Handle subtasks (structural) if requested
    if (allow.has('subtasks' as any)) {
      // Build plan from workflow definition requirements
      const defs: WorkflowDefinition[] = await (new WorkflowService(this.dbManager) as any).getDefinitions?.() || [];
      const wf = defs.find(d => d.name === (workflowName || 'simple')) as any;
      const reqs = (wf?.subtasks_required || []) as SubtaskRequirement[];
      const children = (await this.dbManager.getTasksRepository().searchTasks({ parent_id: taskId })).items || [];
      const plan: any[] = [];
      for (const r of reqs) {
        const matches = children.filter(t => (!r.task_type || t.task_type === r.task_type)
          && (!r.status_in || r.status_in.includes(t.task_status as any))
          && (!r.tags_any || (t as any).stable_tags?.some((tg: string) => r.tags_any!.includes(tg))));
        const needed = Math.max((r.min || 1) - matches.length, 0);
        for (let i = 0; i < needed; i++) {
          plan.push({
            parent_id: taskId,
            title: r.label ? `${r.label} #${i+1}` : `Subtask #${i+1}`,
            task_type: r.task_type || 'task',
            task_status: 'todo',
            task_priority: 'medium',
            stable_tags: r.tags_any || []
          });
        }
      }
      if (dryRun) {
        templates.subtasks = plan;
      } else if (options?.stubs && Array.isArray(options.stubs)) {
        const tms = new TaskManagementService(this.dbManager, new EmbeddingService());
        for (const stub of options.stubs) {
          try {
            await tms.addTask({
              title: stub.title,
              description: stub.description,
              parent_id: stub.parent_id || taskId,
              task_type: stub.task_type || 'task',
              task_status: stub.task_status || 'todo',
              task_priority: stub.task_priority || 'medium',
              stable_tags: stub.stable_tags || []
            } as any);
          } catch {}
        }
      }
    }

    return dryRun ? { templates } : { created, skipped };
  }
}
