import { DataSource } from 'typeorm';
import { WorkflowConfiguration } from '../features/storage/entities/metadata/WorkflowConfiguration.entity.js';
import { GlobalWorkflowSetting } from '../features/storage/entities/metadata/GlobalWorkflowSetting.entity.js';
import { BUILT_IN_WORKFLOWS, DEFAULT_WORKFLOW_NAME } from './DefaultWorkflows';
import { WorkflowDefinition } from '../types/WorkflowTypes';

export class WorkflowInstaller {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Install all default workflows into the database
   */
  async installDefaultWorkflows(): Promise<void> {
    try {
      // Tables are created by TypeORM synchronize - no need to create manually

      // Install each built-in workflow
      for (const workflow of BUILT_IN_WORKFLOWS) {
        await this.installWorkflow(workflow);
      }

      // Set the default workflow
      await this.setDefaultWorkflow(DEFAULT_WORKFLOW_NAME);

      console.error('✅ Default workflows installed successfully');
    } catch (error) {
      console.error('❌ Failed to install default workflows:', error);
      throw error;
    }
  }

  /**
   * Install a single workflow into the database
   */
  private async installWorkflow(workflow: WorkflowDefinition): Promise<void> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);

    const workflowId = `workflow_${workflow.name}`;
    const isDefault = workflow.name === DEFAULT_WORKFLOW_NAME;

    // Use upsert (insert or replace)
    await workflowRepo.upsert({
      id: workflowId,
      name: workflow.name,
      display_name: workflow.display_name,
      description: workflow.description,
      is_default: isDefault,
      required_sections: workflow.required_sections as any,
      conditional_requirements: workflow.conditional_requirements as any || [],
      validation_rules: workflow.validation_rules as any || [],
      use_cases: workflow.use_cases || []
    }, ['name']); // conflict target: name column

    console.error(`📋 Installed workflow: ${workflow.display_name}`);
  }

  /**
   * Set the default workflow in global settings
   */
  private async setDefaultWorkflow(workflowName: string): Promise<void> {
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);

    // Set the global setting
    await settingsRepo.upsert({
      setting_key: 'default_workflow',
      setting_value: workflowName
    }, ['setting_key']);

    // Update workflow configurations - set all to false first, then the target to true
    await workflowRepo.update({}, { is_default: false });
    await workflowRepo.update({ name: workflowName }, { is_default: true });

    console.error(`🎯 Set default workflow: ${workflowName}`);
  }

  /**
   * Get all installed workflows
   */
  async getInstalledWorkflows(): Promise<WorkflowDefinition[]> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);

    const workflows = await workflowRepo.find({
      select: ['name', 'display_name', 'description', 'required_sections', 'conditional_requirements', 'validation_rules', 'use_cases'],
      order: { name: 'ASC' }
    });

    return workflows.map(workflow => ({
      name: workflow.name,
      display_name: workflow.display_name,
      description: workflow.description || '',
      required_sections: (Array.isArray(workflow.required_sections) ? workflow.required_sections : []) as any,
      conditional_requirements: (workflow.conditional_requirements || []) as any,
      validation_rules: (workflow.validation_rules || []) as any,
      use_cases: workflow.use_cases || []
    }));
  }

  /**
   * Get the current default workflow
   */
  async getDefaultWorkflow(): Promise<string> {
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);

    const setting = await settingsRepo.findOne({
      where: { setting_key: 'default_workflow' }
    });

    return setting?.setting_value || DEFAULT_WORKFLOW_NAME;
  }

  /**
   * Check if workflows are installed
   */
  async areWorkflowsInstalled(): Promise<boolean> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);

    const count = await workflowRepo.count();
    return count >= BUILT_IN_WORKFLOWS.length;
  }

  /**
   * Reinstall all workflows (useful for updates)
   */
  async reinstallWorkflows(): Promise<void> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);

    // Clear existing workflows
    await workflowRepo.clear();

    // Reinstall all workflows
    await this.installDefaultWorkflows();

    console.error('🔄 Workflows reinstalled successfully');
  }
}