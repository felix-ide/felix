import type { WorkflowCoordinator } from '../../../workflows/coordinators/WorkflowCoordinator.js';

export interface WorkflowApi {
  listWorkflows: WorkflowCoordinator['listWorkflows'];
  getWorkflow: WorkflowCoordinator['getWorkflow'];
  getDefaultWorkflow: WorkflowCoordinator['getDefaultWorkflow'];
}

export function attachWorkflowApi(target: any, coordinator: WorkflowCoordinator): void {
  target.listWorkflows = coordinator.listWorkflows.bind(coordinator);
  target.getWorkflow = coordinator.getWorkflow.bind(coordinator);
  target.getDefaultWorkflow = coordinator.getDefaultWorkflow.bind(coordinator);
}
