import type { INote, IRule, ITask } from '@felix/code-intelligence';
import type { SearchResult } from '../../../types/storage.js';
import { MetadataFacade } from '../api/MetadataFacade.js';
import { TaskManagementService } from '../services/TaskManagementService.js';
import { NoteManagementService } from '../services/NoteManagementService.js';
import { RuleManagementService } from '../services/RuleManagementService.js';
import { FileIndexingService } from '../../indexing/services/FileIndexingService.js';
import { ComponentSearchService } from '../../search/services/ComponentSearchService.js';
import { RelationshipService } from '../../relationships/services/RelationshipService.js';

export class MetadataCoordinator {
  constructor(
    private readonly metadataFacade: MetadataFacade,
    private readonly fileIndexingService: FileIndexingService,
    private readonly componentSearchService: ComponentSearchService,
    private readonly relationshipService: RelationshipService,
    private readonly taskManagementService: TaskManagementService,
    private readonly noteManagementService: NoteManagementService,
    private readonly ruleManagementService: RuleManagementService
  ) {}

  async indexAllMetadataEntities(): Promise<any> {
    return this.metadataFacade.indexAllMetadataEntities();
  }

  async addTask(params: any): Promise<ITask> {
    return this.metadataFacade.addTask(params);
  }

  async getTask(id: string): Promise<ITask | null> {
    return this.metadataFacade.getTask(id);
  }

  async updateTask(id: string, updates: any): Promise<ITask> {
    return this.metadataFacade.updateTask(id, updates);
  }

  async deleteTask(id: string): Promise<void> {
    await this.metadataFacade.deleteTask(id);
  }

  async searchTasks(criteria?: any): Promise<SearchResult<ITask>> {
    return this.metadataFacade.searchTasks(criteria);
  }

  async listTasks(criteria?: any): Promise<ITask[]> {
    return this.metadataFacade.listTasks(criteria);
  }

  async searchTasksSummary(criteria?: any): Promise<SearchResult<Partial<ITask>>> {
    return this.metadataFacade.searchTasksSummary(criteria);
  }

  async getTaskTree(rootId?: string, includeCompleted?: boolean): Promise<ITask[]> {
    return this.metadataFacade.getTaskTree(rootId, includeCompleted);
  }

  async getTaskTreeSummary(rootId?: string, includeCompleted?: boolean): Promise<Partial<ITask>[]> {
    return this.metadataFacade.getTaskTreeSummary(rootId, includeCompleted);
  }

  async getSuggestedTasks(limit?: number): Promise<ITask[]> {
    return this.metadataFacade.getSuggestedTasks(limit);
  }

  async addTaskDependency(params: any): Promise<any> {
    return this.metadataFacade.addTaskDependency(params);
  }

  async getTaskDependencies(taskId: string, direction?: 'incoming' | 'outgoing' | 'both'): Promise<any[]> {
    return this.metadataFacade.getTaskDependencies(taskId, direction);
  }

  async removeTaskDependency(dependencyId: string): Promise<void> {
    await this.metadataFacade.removeTaskDependency(dependencyId);
  }

  async listTaskDependencies(): Promise<any[]> {
    return this.metadataFacade.listTaskDependencies();
  }

  async addNote(params: any): Promise<INote> {
    return this.metadataFacade.addNote(params);
  }

  async getNote(id: string): Promise<INote | null> {
    return this.metadataFacade.getNote(id);
  }

  async updateNote(id: string, updates: any): Promise<INote> {
    return this.metadataFacade.updateNote(id, updates);
  }

  async deleteNote(id: string): Promise<void> {
    await this.metadataFacade.deleteNote(id);
  }

  async searchNotes(criteria?: any): Promise<SearchResult<INote>> {
    return this.metadataFacade.searchNotes(criteria);
  }

  async listNotes(criteria?: any): Promise<INote[]> {
    return this.metadataFacade.listNotes(criteria);
  }

  async getNoteTree(rootId?: string, includeAll?: boolean): Promise<INote[]> {
    return this.metadataFacade.getNoteTree(rootId, includeAll);
  }

  async getNoteTreeSummary(rootId?: string, includeAll?: boolean): Promise<Partial<INote>[]> {
    return this.metadataFacade.getNoteTreeSummary(rootId, includeAll);
  }

  async addRule(params: any): Promise<IRule> {
    return this.metadataFacade.addRule(params);
  }

  async getRule(id: string): Promise<IRule | null> {
    return this.metadataFacade.getRule(id);
  }

  async updateRule(id: string, updates: any): Promise<IRule> {
    return this.metadataFacade.updateRule(id, updates);
  }

  async deleteRule(id: string): Promise<void> {
    await this.metadataFacade.deleteRule(id);
  }

  async searchRules(criteria?: any): Promise<SearchResult<IRule>> {
    return this.metadataFacade.searchRules(criteria);
  }

  async listRules(criteria?: any): Promise<IRule[]> {
    return this.metadataFacade.listRules(criteria);
  }

  async getRulesByIds(ids: string[]): Promise<IRule[]> {
    return this.metadataFacade.getRulesByIds(ids);
  }

  async getRuleTree(rootId?: string, includeAll?: boolean): Promise<IRule[]> {
    return this.metadataFacade.getRuleTree(rootId, includeAll);
  }

  async applyRule(ruleId: string, entityType: string, entityId: string, context?: any): Promise<any> {
    return this.metadataFacade.applyRule(ruleId, entityType, entityId, context);
  }

  async getRuleAnalytics(options: any): Promise<any> {
    return this.metadataFacade.getRuleAnalytics(options);
  }

  async trackRuleApplication(ruleId: string, data: any): Promise<void> {
    await this.metadataFacade.trackRuleApplication(ruleId, data);
  }

  async getStats(): Promise<any> {
    return this.metadataFacade.getStats();
  }

  async resolveDocumentationLinks(options?: { limitPerKind?: number }): Promise<{ created: number; inspected: number }> {
    return this.metadataFacade.resolveDocumentationLinks(options);
  }

  async getRulesApplicable(context: any): Promise<any[]> {
    return this.metadataFacade.getRulesApplicable(context);
  }

  async suggestNextTasks(options: { context?: string; assignee?: string; limit?: number } = {}): Promise<any[]> {
    return this.metadataFacade.suggestNextTasks(options);
  }

  async addChecklist(taskId: string, checklist: { name: string; items: string[] }): Promise<void> {
    await this.metadataFacade.addChecklist(taskId, checklist);
  }

  async toggleChecklistItem(taskId: string, checklistName: string, itemIdentifier: string | number): Promise<void> {
    await this.metadataFacade.toggleChecklistItem(taskId, checklistName, itemIdentifier);
  }

  async getDegradationStatus(): Promise<any> {
    return this.metadataFacade.getDegradationStatus();
  }

  async runDegradationCleanup(): Promise<any> {
    return this.metadataFacade.runDegradationCleanup();
  }

  async configureDegradation(config: any): Promise<any> {
    return this.metadataFacade.configureDegradation(config);
  }

  async startDegradation(): Promise<any> {
    return this.metadataFacade.startDegradation();
  }

  async stopDegradation(): Promise<any> {
    return this.metadataFacade.stopDegradation();
  }

  async exportIndex(format: 'json' | 'markdown' = 'json'): Promise<string> {
    const stats = await this.getStats();
    const components = await this.componentSearchService.getAllComponents();
    const relationships = await this.relationshipService.getAllRelationships();
    const tasks = await this.taskManagementService.getAllTasks();
    const notes = await this.noteManagementService.getAllNotes();
    const rules = await this.ruleManagementService.getAllRules();

    if (format === 'json') {
      return JSON.stringify(
        {
          statistics: stats,
          components,
          relationships,
          tasks,
          notes,
          rules
        },
        null,
        2
      );
    }

    let markdown = '# Code Index Export\n\n';
    markdown += '## Statistics\n\n';
    markdown += `- Components: ${stats.components}\n`;
    markdown += `- Relationships: ${stats.relationships}\n`;
    markdown += `- Tasks: ${stats.tasks}\n`;
    markdown += `- Notes: ${stats.notes}\n`;
    markdown += `- Rules: ${stats.rules}\n\n`;

    markdown += '## Components\n\n';
    if (components && 'items' in components) {
      components.items.forEach((component: any) => {
        markdown += `### ${component.name}\n`;
        markdown += `- Type: ${component.type}\n`;
        markdown += `- File: ${component.filePath}\n`;
        markdown += `- Lines: ${component.startLine}-${component.endLine}\n\n`;
      });
    }

    return markdown;
  }

  getServices() {
    return {
      fileIndexing: this.fileIndexingService,
      componentSearch: this.componentSearchService,
      relationship: this.relationshipService,
      ...this.metadataFacade.getServices()
    };
  }
}
