import { WorkflowDefinition } from '../types/WorkflowTypes';
import { WorkflowRegistry } from './WorkflowRegistry';
import { SimpleWorkflow } from './definitions/SimpleWorkflow';
import { FeatureDevelopmentWorkflow } from './definitions/FeatureDevelopmentWorkflow';
import { BugfixWorkflow } from './definitions/BugfixWorkflow';
import { ResearchWorkflow } from './definitions/ResearchWorkflow';

export const BUILT_IN_WORKFLOWS: WorkflowDefinition[] = [
  SimpleWorkflow,
  FeatureDevelopmentWorkflow,
  BugfixWorkflow,
  ResearchWorkflow
];

export const DEFAULT_WORKFLOW_NAME = 'feature_development';

export function getDefaultWorkflows(): WorkflowDefinition[] {
  return [...BUILT_IN_WORKFLOWS];
}

export function getWorkflowByName(name: string): WorkflowDefinition | undefined {
  return BUILT_IN_WORKFLOWS.find(workflow => workflow.name === name);
}

export function getDefaultWorkflow(): WorkflowDefinition {
  const defaultWorkflow = getWorkflowByName(DEFAULT_WORKFLOW_NAME);
  if (!defaultWorkflow) {
    throw new Error(`Default workflow '${DEFAULT_WORKFLOW_NAME}' not found`);
  }
  return defaultWorkflow;
}

export function initializeWorkflowRegistry(): WorkflowRegistry {
  const registry = WorkflowRegistry.getInstance();
  
  // Verify all built-in workflows are registered
  for (const workflow of BUILT_IN_WORKFLOWS) {
    if (!registry.workflowExists(workflow.name)) {
      registry.registerWorkflow(workflow);
    }
  }
  
  // Set the default workflow
  registry.setDefaultWorkflow(DEFAULT_WORKFLOW_NAME);
  
  return registry;
}

export function detectWorkflowFromTaskType(taskType: string): string {
  switch (taskType) {
    case 'bug':
      return 'bugfix';
    case 'spike':
      return 'research';
    case 'chore':
      return 'simple';
    case 'epic':
    case 'story':
    case 'task':
    case 'subtask':
    case 'milestone':
    default:
      return DEFAULT_WORKFLOW_NAME;
  }
}

export function detectWorkflowFromContent(title: string, description: string = ''): string {
  const content = `${title} ${description}`.toLowerCase();
  
  // Check for bug-related keywords
  const bugKeywords = ['bug', 'fix', 'error', 'issue', 'broken', 'crash', 'fail'];
  if (bugKeywords.some(keyword => content.includes(keyword))) {
    return 'bugfix';
  }
  
  // Check for research-related keywords
  const researchKeywords = ['research', 'investigate', 'explore', 'analyze', 'study', 'spike'];
  if (researchKeywords.some(keyword => content.includes(keyword))) {
    return 'research';
  }
  
  // Check for simple task keywords
  const simpleKeywords = ['update', 'tweak', 'small', 'quick', 'minor', 'config'];
  if (simpleKeywords.some(keyword => content.includes(keyword))) {
    return 'simple';
  }
  
  // Default to feature development
  return DEFAULT_WORKFLOW_NAME;
}

export function getWorkflowRequiredSections(workflowName: string): string[] {
  const workflow = getWorkflowByName(workflowName);
  if (!workflow) {
    return [];
  }
  
  return workflow.required_sections
    .filter(section => section.required)
    .map(section => section.section_type);
}

export function getWorkflowValidationRules(workflowName: string): any[] {
  const workflow = getWorkflowByName(workflowName);
  if (!workflow) {
    return [];
  }
  
  return workflow.validation_rules || [];
}

export {
  SimpleWorkflow,
  FeatureDevelopmentWorkflow,
  BugfixWorkflow,
  ResearchWorkflow
};