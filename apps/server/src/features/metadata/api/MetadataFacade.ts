import type { ITask, INote, IRule } from '@felix/code-intelligence';
import type { SearchResult } from '../../../types/storage.js';
import type { DatabaseManager } from '../../storage/DatabaseManager.js';
import type { TaskManagementService } from '../services/TaskManagementService.js';
import type { NoteManagementService } from '../services/NoteManagementService.js';
import type { RuleManagementService } from '../services/RuleManagementService.js';
import type { DocumentationResolverService } from '../../indexing/services/DocumentationResolverService.js';
import type { ComponentSearchService } from '../../search/services/ComponentSearchService.js';
import type { RelationshipService } from '../../relationships/services/RelationshipService.js';

export class MetadataFacade {
  constructor(
    private readonly dbManager: DatabaseManager,
    private readonly taskManagementService: TaskManagementService,
    private readonly noteManagementService: NoteManagementService,
    private readonly ruleManagementService: RuleManagementService,
    private readonly documentationResolver: DocumentationResolverService,
    private readonly componentSearchService: ComponentSearchService,
    private readonly relationshipService: RelationshipService
  ) {}

  // Task management
  async addTask(params: any): Promise<ITask> {
    return this.taskManagementService.addTask(params);
  }

  async getTask(id: string): Promise<ITask | null> {
    return this.taskManagementService.getTask(id);
  }

  async updateTask(id: string, updates: any): Promise<ITask> {
    return this.taskManagementService.updateTask(id, updates);
  }

  async deleteTask(id: string): Promise<void> {
    await this.taskManagementService.deleteTask(id);
  }

  async searchTasks(criteria?: any): Promise<SearchResult<ITask>> {
    return this.taskManagementService.searchTasks(criteria);
  }

  async listTasks(criteria?: any): Promise<ITask[]> {
    return this.taskManagementService.listTasks(criteria);
  }

  async searchTasksSummary(criteria?: any): Promise<SearchResult<Partial<ITask>>> {
    return this.taskManagementService.searchTasksSummary(criteria);
  }

  async getTaskTree(rootId?: string, includeCompleted?: boolean): Promise<ITask[]> {
    return this.taskManagementService.getTaskTree(rootId, includeCompleted);
  }

  async getTaskTreeSummary(rootId?: string, includeCompleted?: boolean): Promise<Partial<ITask>[]> {
    return this.taskManagementService.getTaskTreeSummary(rootId, includeCompleted);
  }

  async getSuggestedTasks(limit?: number): Promise<ITask[]> {
    return this.taskManagementService.getSuggestedTasks(limit);
  }

  async addTaskDependency(params: any): Promise<any> {
    return this.taskManagementService.addTaskDependency(params);
  }

  async getTaskDependencies(taskId: string, direction?: 'incoming' | 'outgoing' | 'both'): Promise<any[]> {
    return this.taskManagementService.getTaskDependencies(taskId, direction);
  }

  async removeTaskDependency(dependencyId: string): Promise<void> {
    await this.taskManagementService.removeTaskDependency(dependencyId);
  }

  async removeTaskDependencyByTasks(dependentTaskId: string, dependencyTaskId: string, type?: 'blocks' | 'related' | 'follows'): Promise<void> {
    await this.taskManagementService.removeTaskDependencyByTasks(dependentTaskId, dependencyTaskId, type);
  }

  async listTaskDependencies(): Promise<any[]> {
    const svc: any = this.taskManagementService as any;
    if (svc.listAllDependencies) {
      return svc.listAllDependencies();
    }
    const tasks = await this.taskManagementService.getAllTasks();
    const deps: any[] = [];
    for (const task of tasks) {
      const outgoing = await this.getTaskDependencies(task.id, 'outgoing');
      deps.push(...(outgoing as any));
    }
    const deduped = new Map<string, any>();
    for (const dep of deps) {
      if (dep?.id) {
        deduped.set(dep.id, dep);
      }
    }
    return deduped.size > 0 ? Array.from(deduped.values()) : deps;
  }

  async suggestNextTasks(options: { context?: string; assignee?: string; limit?: number } = {}): Promise<any[]> {
    return this.taskManagementService.suggestNextTasks(options);
  }

  async addChecklist(taskId: string, checklist: { name: string; items: string[] }): Promise<void> {
    await this.taskManagementService.addChecklist(taskId, checklist);
  }

  async toggleChecklistItem(taskId: string, checklistName: string, itemIdentifier: string | number): Promise<void> {
    await this.taskManagementService.toggleChecklistItem(taskId, checklistName, itemIdentifier);
  }

  // Note management
  async addNote(params: any): Promise<INote> {
    return this.noteManagementService.addNote(params);
  }

  async getNote(id: string): Promise<INote | null> {
    return this.noteManagementService.getNote(id);
  }

  async getNotesForEntity(entityType: string, entityId: string): Promise<INote[]> {
    return this.noteManagementService.getNotesForEntity(entityType, entityId);
  }

  async updateNote(id: string, updates: any): Promise<INote> {
    return this.noteManagementService.updateNote(id, updates);
  }

  async deleteNote(id: string): Promise<void> {
    await this.noteManagementService.deleteNote(id);
  }

  async searchNotes(criteria?: any): Promise<SearchResult<INote>> {
    return this.noteManagementService.searchNotes(criteria);
  }

  async listNotes(criteria?: any): Promise<INote[]> {
    return this.noteManagementService.listNotes(criteria);
  }

  async getNoteTree(rootId?: string, includeAll?: boolean): Promise<INote[]> {
    return this.noteManagementService.getNoteTree(rootId, includeAll);
  }

  async getNoteTreeSummary(rootId?: string, includeAll?: boolean): Promise<Partial<INote>[]> {
    return this.noteManagementService.getNoteTreeSummary(rootId, includeAll);
  }

  // Rule management
  async addRule(params: any): Promise<IRule> {
    return this.ruleManagementService.addRule(params);
  }

  async getRule(id: string): Promise<IRule | null> {
    return this.ruleManagementService.getRule(id);
  }

  async getRulesForEntity(entityType: string, entityId: string, includeInactive = false): Promise<IRule[]> {
    return this.ruleManagementService.getRulesForEntity(entityType, entityId, includeInactive);
  }

  async updateRule(id: string, updates: any): Promise<IRule> {
    return this.ruleManagementService.updateRule(id, updates);
  }

  async deleteRule(id: string): Promise<void> {
    await this.ruleManagementService.deleteRule(id);
  }

  async searchRules(criteria?: any): Promise<SearchResult<IRule>> {
    return this.ruleManagementService.searchRules(criteria);
  }

  async listRules(criteria?: any): Promise<IRule[]> {
    return this.ruleManagementService.listRules(criteria);
  }

  async getRulesByIds(ids: string[], includeInactive = true): Promise<IRule[]> {
    return this.ruleManagementService.getRulesByIds(ids, includeInactive);
  }

  async getRuleTree(rootId?: string, includeInactive?: boolean): Promise<IRule[]> {
    return this.ruleManagementService.getRuleTree(rootId, includeInactive);
  }

  async applyRule(ruleId: string, entityType: string, entityId: string, context?: any): Promise<any> {
    return this.ruleManagementService.applyRule(ruleId, entityType, entityId, context);
  }

  async getRuleAnalytics(options: any): Promise<any> {
    const daysSince = options?.days_since || 30;
    return this.dbManager.getRulesRepository().getRuleAnalytics(daysSince);
  }

  async trackRuleApplication(ruleId: string, data: any): Promise<void> {
    await this.dbManager.getRulesRepository().trackRuleApplication(
      ruleId,
      data.entity_type || 'component',
      data.entity_id || '',
      data.applied_context || {},
      data.user_action || 'applied',
      data.generated_code,
      data.feedback_score
    );
  }

  async getRulesApplicable(context: any): Promise<any[]> {
    const entityType = context?.entity_type || 'component';
    const entityId = context?.entity_id || '';
    return this.ruleManagementService.getApplicableRules(entityType, entityId, context);
  }

  async indexAllMetadataEntities(): Promise<{ tasksIndexed: number; notesIndexed: number; rulesIndexed: number; errors: unknown[] }> {
    const results = {
      tasksIndexed: 0,
      notesIndexed: 0,
      rulesIndexed: 0,
      errors: [] as unknown[]
    };

    const tasks = await this.listTasks({ limit: 1000 });
    if (tasks.length > 0) {
      await this.taskManagementService.generateTaskEmbeddingsBatch(tasks);
      results.tasksIndexed = tasks.length;
    }

    const notes = await this.listNotes({ limit: 1000 });
    if (notes.length > 0) {
      await this.noteManagementService.generateNoteEmbeddingsBatch(notes);
      results.notesIndexed = notes.length;
    }

    const rules = await this.listRules();
    if (rules.length > 0) {
      await this.ruleManagementService.generateRuleEmbeddingsBatch(rules);
      results.rulesIndexed = rules.length;
    }

    return results;
  }

  async getStats(): Promise<any> {
    const componentCount = await this.componentSearchService.getComponentCount();
    const relationshipCount = await this.relationshipService.getRelationshipCount();
    const taskCount = await this.taskManagementService.getTaskCount();
    const noteCount = await this.noteManagementService.getNoteCount();
    const ruleCount = await this.ruleManagementService.getRuleCount();

    const languageBreakdown: Record<string, number> = {};
    const components = await this.componentSearchService.searchComponents({ limit: 1000 });
    for (const component of components.items) {
      if (component.language) {
        languageBreakdown[component.language] = (languageBreakdown[component.language] || 0) + 1;
      }
    }

    const filePaths = new Set<string>();
    for (const component of components.items) {
      if (component.filePath) {
        filePaths.add(component.filePath);
      }
    }

    let componentEmbeddingCount = 0;
    let ruleEmbeddingCount = 0;
    let taskEmbeddingCount = 0;
    let noteEmbeddingCount = 0;
    try {
      const embeddingRepo = this.dbManager.getEmbeddingRepository();
      [componentEmbeddingCount, ruleEmbeddingCount, taskEmbeddingCount, noteEmbeddingCount] = await Promise.all([
        embeddingRepo.countEmbeddingsByType('component'),
        embeddingRepo.countEmbeddingsByType('rule'),
        embeddingRepo.countEmbeddingsByType('task'),
        embeddingRepo.countEmbeddingsByType('note')
      ]);
    } catch {
      // Ignore embedding count errors for now
    }

    return {
      components: componentCount,
      relationships: relationshipCount,
      tasks: taskCount,
      notes: noteCount,
      rules: ruleCount,
      total: componentCount + relationshipCount + taskCount + noteCount + ruleCount,
      componentCount,
      relationshipCount,
      fileCount: filePaths.size,
      indexSize: 0,
      lastUpdated: new Date(),
      languageBreakdown,
      taskCount,
      noteCount,
      ruleCount,
      componentEmbeddingCount,
      ruleEmbeddingCount,
      taskEmbeddingCount,
      noteEmbeddingCount
    };
  }

  async resolveDocumentationLinks(options?: { limitPerKind?: number }): Promise<{ created: number; inspected: number }> {
    return this.documentationResolver.resolveAll(options);
  }

  getServices() {
    return {
      taskManagement: this.taskManagementService,
      noteManagement: this.noteManagementService,
      ruleManagement: this.ruleManagementService
    };
  }

}
