import { WorkflowDefinition } from '../types/WorkflowTypes';
import { SimpleWorkflow } from './definitions/SimpleWorkflow';
import { FeatureDevelopmentWorkflow } from './definitions/FeatureDevelopmentWorkflow';
import { BugfixWorkflow } from './definitions/BugfixWorkflow';
import { ResearchWorkflow } from './definitions/ResearchWorkflow';

export class WorkflowRegistry {
  private static instance: WorkflowRegistry;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private defaultWorkflow: string = 'feature_development';

  private constructor() {
    this.registerBuiltInWorkflows();
  }

  public static getInstance(): WorkflowRegistry {
    if (!WorkflowRegistry.instance) {
      WorkflowRegistry.instance = new WorkflowRegistry();
    }
    return WorkflowRegistry.instance;
  }

  private registerBuiltInWorkflows(): void {
    this.workflows.set('simple', SimpleWorkflow);
    this.workflows.set('feature_development', FeatureDevelopmentWorkflow);
    this.workflows.set('bugfix', BugfixWorkflow);
    this.workflows.set('research', ResearchWorkflow);
  }

  public getWorkflow(name: string): WorkflowDefinition | undefined {
    return this.workflows.get(name);
  }

  public getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  public getWorkflowNames(): string[] {
    return Array.from(this.workflows.keys());
  }

  public getDefaultWorkflow(): WorkflowDefinition {
    const workflow = this.workflows.get(this.defaultWorkflow);
    if (!workflow) {
      throw new Error(`Default workflow '${this.defaultWorkflow}' not found`);
    }
    return workflow;
  }

  public setDefaultWorkflow(workflowName: string): void {
    if (!this.workflows.has(workflowName)) {
      throw new Error(`Workflow '${workflowName}' does not exist`);
    }
    this.defaultWorkflow = workflowName;
  }

  public registerWorkflow(workflow: WorkflowDefinition): void {
    this.validateWorkflowDefinition(workflow);
    this.workflows.set(workflow.name, workflow);
  }

  public unregisterWorkflow(workflowName: string): boolean {
    // Prevent removal of built-in workflows
    const builtInWorkflows = ['simple', 'feature_development', 'bugfix', 'research'];
    if (builtInWorkflows.includes(workflowName)) {
      throw new Error(`Cannot remove built-in workflow '${workflowName}'`);
    }
    
    return this.workflows.delete(workflowName);
  }

  public workflowExists(workflowName: string): boolean {
    return this.workflows.has(workflowName);
  }

  public getWorkflowsForTaskType(taskType: string): WorkflowDefinition[] {
    // Return suggested workflows based on task type
    switch (taskType) {
      case 'bug':
        return [this.workflows.get('bugfix')!, this.workflows.get('simple')!];
      case 'spike':
        return [this.workflows.get('research')!, this.workflows.get('simple')!];
      case 'chore':
        return [this.workflows.get('simple')!, this.workflows.get('feature_development')!];
      case 'epic':
      case 'story':
      case 'task':
        return [this.workflows.get('feature_development')!, this.workflows.get('simple')!];
      default:
        return this.getAllWorkflows();
    }
  }

  private validateWorkflowDefinition(workflow: WorkflowDefinition): void {
    if (!workflow.name || workflow.name.trim() === '') {
      throw new Error('Workflow name is required');
    }

    if (!workflow.display_name || workflow.display_name.trim() === '') {
      throw new Error('Workflow display name is required');
    }

    if (!workflow.description || workflow.description.trim() === '') {
      throw new Error('Workflow description is required');
    }

    if (!Array.isArray(workflow.required_sections)) {
      throw new Error('Workflow must have required_sections array');
    }

    // Validate each required section
    for (const section of workflow.required_sections) {
      if (!section.section_type) {
        throw new Error('Each workflow section must have a section_type');
      }

      if (typeof section.required !== 'boolean') {
        throw new Error('Each workflow section must specify if it is required (boolean)');
      }
    }

    // Validate conditional requirements
    if (workflow.conditional_requirements) {
      for (const condition of workflow.conditional_requirements) {
        if (!condition.section_type || !condition.condition) {
          throw new Error('Conditional requirements must have section_type and condition');
        }
      }
    }
  }

  public exportWorkflows(): { [key: string]: WorkflowDefinition } {
    const exported: { [key: string]: WorkflowDefinition } = {};
    for (const [name, workflow] of this.workflows) {
      exported[name] = { ...workflow };
    }
    return exported;
  }

  public importWorkflows(workflows: { [key: string]: WorkflowDefinition }): void {
    for (const [name, workflow] of Object.entries(workflows)) {
      this.validateWorkflowDefinition(workflow);
      this.workflows.set(name, workflow);
    }
  }
}