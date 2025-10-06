import { DatabaseManager } from '../../storage/DatabaseManager.js';
import { WorkflowConfigManager } from '../../../storage/WorkflowConfigManager.js';
import type { WorkflowDefinition } from '../../../types/WorkflowTypes.js';

export class WorkflowCoordinator {
  constructor(private readonly dbManager: DatabaseManager) {}

  private createManager(): WorkflowConfigManager {
    const dataSource = this.dbManager.getMetadataDataSource();
    return new WorkflowConfigManager(dataSource);
  }

  async listWorkflows(): Promise<WorkflowDefinition[]> {
    const manager = this.createManager();
    await manager.initialize();
    return manager.listAvailableWorkflows();
  }

  async getWorkflow(name: string): Promise<WorkflowDefinition | null> {
    const manager = this.createManager();
    await manager.initialize();
    return manager.getWorkflowConfig(name);
  }

  async getDefaultWorkflow(): Promise<string> {
    const manager = this.createManager();
    await manager.initialize();
    return manager.getDefaultWorkflow();
  }
}
