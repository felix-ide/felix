/**
 * Workflow configuration management
 */

import { DataSource } from 'typeorm';
import { WorkflowConfiguration } from '../features/storage/entities/metadata/WorkflowConfiguration.entity.js';
import { GlobalWorkflowSetting } from '../features/storage/entities/metadata/GlobalWorkflowSetting.entity.js';
import { 
  WorkflowDefinition, 
  WorkflowConfig,
  WorkflowType
} from '../types/WorkflowTypes.js';
import { BUILT_IN_WORKFLOWS } from '../validation/WorkflowDefinitions.js';

export class WorkflowConfigManager {
  private dataSource: DataSource;
  private initialized = false;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Initialize the workflow configuration system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Tables are created by TypeORM synchronize - no need to create manually
    
    // Load built-in workflows if not already present
    await this.loadBuiltInWorkflows();

    // Ensure default task_type -> workflow mapping exists
    await this.ensureDefaultTaskTypeMapping();
    
    this.initialized = true;
  }

  /**
   * Load built-in workflows into database if not present
   */
  private async loadBuiltInWorkflows(): Promise<void> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);

    for (const workflow of BUILT_IN_WORKFLOWS) {
      const existing = await workflowRepo.findOne({ where: { name: workflow.name } });

      if (!existing) {
        await workflowRepo.save({
          id: `workflow_${workflow.name}_${Date.now()}`,
          name: workflow.name,
          display_name: workflow.display_name,
          description: workflow.description,
          is_default: workflow.name === 'feature_development',
          required_sections: workflow.required_sections as any,
          conditional_requirements: workflow.conditional_requirements as any || [],
          validation_rules: workflow.validation_rules as any || [],
          use_cases: workflow.use_cases || []
        });
      } else {
        // If existing differs materially from the built-in, update it to match
        // Heuristic: update when required_sections count or section keys diverge
        const existingSections = Array.isArray(existing.required_sections) ? existing.required_sections : [];
        const builtInSections = workflow.required_sections || [];
        const differsInCount = (existingSections as any[]).length !== builtInSections.length;
        const differsInKeys = (() => {
          try {
            const a = (existingSections as any[]).map((s: any) => s.section_type || s.name).join('|');
            const b = (builtInSections as any[]).map((s: any) => s.section_type || s.name).join('|');
            return a !== b;
          } catch { return true; }
        })();

        if (differsInCount || differsInKeys) {
          await workflowRepo.update({ name: workflow.name }, {
            display_name: workflow.display_name,
            description: workflow.description,
            required_sections: workflow.required_sections as any,
            conditional_requirements: workflow.conditional_requirements as any || [],
            validation_rules: workflow.validation_rules as any || [],
            use_cases: workflow.use_cases || []
          });
        }
      }
    }
  }

  private async ensureDefaultTaskTypeMapping(): Promise<void> {
    const DEFAULTS_BY_TASK_TYPE: Record<string, string> = {
      epic: 'feature_development',
      story: 'feature_development',
      feature: 'feature_development',
      task: 'simple',
      subtask: 'simple',
      milestone: 'feature_development',
      bug: 'bugfix',
      fix: 'bugfix',
      hotfix: 'bugfix',
      spike: 'research',
      research: 'research',
      chore: 'simple',
      documentation: 'simple',
      doc: 'simple',
      refactor: 'feature_development'
    };

    // Default metadata for task types with emojis, colors, and priorities
    const TYPES_METADATA = {
      epic: { emoji: '🎯', color: '#8b5cf6', default_priority: 'high' },
      story: { emoji: '📖', color: '#3b82f6', default_priority: 'medium' },
      feature: { emoji: '✨', color: '#10b981', default_priority: 'medium' },
      task: { emoji: '✅', color: '#6b7280', default_priority: 'medium' },
      subtask: { emoji: '🔗', color: '#94a3b8', default_priority: 'low' },
      milestone: { emoji: '🏁', color: '#eab308', default_priority: 'high' },
      bug: { emoji: '🐛', color: '#ef4444', default_priority: 'high' },
      fix: { emoji: '🔧', color: '#f97316', default_priority: 'medium' },
      hotfix: { emoji: '🔥', color: '#dc2626', default_priority: 'critical' },
      spike: { emoji: '🔬', color: '#8b5cf6', default_priority: 'low' },
      research: { emoji: '🔍', color: '#a855f7', default_priority: 'low' },
      chore: { emoji: '🧹', color: '#64748b', default_priority: 'low' },
      documentation: { emoji: '📚', color: '#0ea5e9', default_priority: 'low' },
      doc: { emoji: '📄', color: '#06b6d4', default_priority: 'low' },
      refactor: { emoji: '♻️', color: '#f59e0b', default_priority: 'medium' }
    };

    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);

    // Seed defaults_by_task_type
    const row = await settingsRepo.findOne({ where: { setting_key: 'defaults_by_task_type' } });
    if (!row || !row.setting_value) {
      await settingsRepo.upsert({ setting_key: 'defaults_by_task_type', setting_value: JSON.stringify(DEFAULTS_BY_TASK_TYPE) }, ['setting_key']);
    }

    // Seed types_metadata
    const metaRow = await settingsRepo.findOne({ where: { setting_key: 'types_metadata' } });
    if (!metaRow || !metaRow.setting_value) {
      await settingsRepo.upsert({ setting_key: 'types_metadata', setting_value: JSON.stringify(TYPES_METADATA) }, ['setting_key']);
    }
  }

  /** Reseed built-ins explicitly, with optional force overwrite */
  async reseedBuiltIns(force = false): Promise<void> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    for (const w of BUILT_IN_WORKFLOWS) {
      const existing = await workflowRepo.findOne({ where: { name: w.name } });
      if (!existing) {
        await workflowRepo.insert({
          id: `workflow_${w.name}_${Date.now()}`,
          name: w.name,
          display_name: w.display_name,
          description: w.description,
          is_default: w.name === 'feature_development',
          required_sections: w.required_sections as any,
          conditional_requirements: w.conditional_requirements as any || [],
          validation_rules: w.validation_rules as any || [],
          use_cases: w.use_cases || []
        });
      } else if (force) {
        await workflowRepo.update({ name: w.name }, {
          display_name: w.display_name,
          description: w.description,
          required_sections: w.required_sections as any,
          conditional_requirements: w.conditional_requirements as any || [],
          validation_rules: w.validation_rules as any || [],
          use_cases: w.use_cases || []
        });
      }
    }
  }

  /**
   * Get the current default workflow
   */
  async getDefaultWorkflow(): Promise<WorkflowType> {
    await this.initialize();
    
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const result = await settingsRepo.findOne({
      where: { setting_key: 'default_workflow' }
    });
    
    return (result?.setting_value || 'feature_development') as WorkflowType;
  }

  /**
   * Set the default workflow
   */
  async setDefaultWorkflow(workflowName: WorkflowType): Promise<void> {
    await this.initialize();
    
    // Verify workflow exists
    const workflow = await this.getWorkflowConfig(workflowName);
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }
    
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    
    // Update global setting
    await settingsRepo.upsert({
      setting_key: 'default_workflow',
      setting_value: workflowName
    }, ['setting_key']);
    
    // Update is_default flags
    await workflowRepo.update({}, { is_default: false });
    await workflowRepo.update({ name: workflowName }, { is_default: true });
  }

  /**
   * Get a specific workflow configuration
   */
  async getWorkflowConfig(name: string): Promise<WorkflowDefinition | null> {
    await this.initialize();
    
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    const result = await workflowRepo.findOne({ where: { name } });
    
    if (!result) return null;
    
    return {
      name: result.name,
      display_name: result.display_name,
      description: result.description || '',
      required_sections: (Array.isArray(result.required_sections) ? result.required_sections : []) as any,
      conditional_requirements: (result.conditional_requirements || []) as any,
      validation_rules: (result.validation_rules || []) as any,
      use_cases: result.use_cases || []
    };
  }

  /**
   * Update workflow configuration
   */
  async updateWorkflowConfig(name: string, config: Partial<WorkflowDefinition>): Promise<void> {
    await this.initialize();
    
    const existing = await this.getWorkflowConfig(name);
    if (!existing) {
      throw new Error(`Workflow not found: ${name}`);
    }
    
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    const updateData: Partial<WorkflowConfiguration> = {};
    
    if (config.display_name !== undefined) {
      updateData.display_name = config.display_name;
    }
    
    if (config.description !== undefined) {
      updateData.description = config.description;
    }
    
    if (config.required_sections !== undefined) {
      updateData.required_sections = config.required_sections as any;
    }
    
    if (config.conditional_requirements !== undefined) {
      updateData.conditional_requirements = config.conditional_requirements as any;
    }
    
    if (config.validation_rules !== undefined) {
      updateData.validation_rules = config.validation_rules as any;
    }
    
    if (config.use_cases !== undefined) {
      updateData.use_cases = config.use_cases;
    }
    
    if (Object.keys(updateData).length > 0) {
      await workflowRepo.update({ name }, updateData);
    }
  }

  /**
   * List all available workflows
   */
  async listAvailableWorkflows(): Promise<WorkflowDefinition[]> {
    await this.initialize();
    
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    const results = await workflowRepo.find({ order: { name: 'ASC' } });
    
    return results.map(r => ({
      name: r.name,
      display_name: r.display_name,
      description: r.description || '',
      required_sections: (Array.isArray(r.required_sections) ? r.required_sections : []) as any,
      conditional_requirements: (r.conditional_requirements || []) as any,
      validation_rules: (r.validation_rules || []) as any,
      use_cases: r.use_cases || []
    }));
  }

  /**
   * Get global workflow configuration
   */
  async getGlobalConfig(): Promise<WorkflowConfig> {
    await this.initialize();
    
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const settings = await settingsRepo.find();
    
    const config: any = {};
    for (const setting of settings) {
      // Parse boolean values
      if (setting.setting_value === 'true' || setting.setting_value === 'false') {
        config[setting.setting_key] = setting.setting_value === 'true';
      } else {
        config[setting.setting_key] = setting.setting_value;
      }
    }
    
    return config as WorkflowConfig;
  }

  /**
   * Update global workflow settings
   */
  async updateGlobalConfig(updates: Partial<WorkflowConfig> | Record<string, any>): Promise<void> {
    await this.initialize();
    
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const updatePromises: Promise<any>[] = [];
    
    for (const [key, value] of Object.entries(updates)) {
      let stringValue: any;
      if (typeof value === 'boolean') {
        stringValue = value.toString();
      } else if (typeof value === 'string') {
        stringValue = value;
      } else {
        try {
          stringValue = JSON.stringify(value);
        } catch {
          stringValue = String(value);
        }
      }
      updatePromises.push(
        settingsRepo.upsert({
          setting_key: key,
          setting_value: stringValue
        }, ['setting_key'])
      );
    }
    
    await Promise.all(updatePromises);
  }

  // --- Task type → workflow mapping ---
  async getWorkflowForTaskType(taskType?: string): Promise<string | undefined> {
    await this.initialize();
    if (!taskType) return undefined;
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const row = await settingsRepo.findOne({ where: { setting_key: 'defaults_by_task_type' } });
    if (!row?.setting_value) return undefined;
    try {
      const map = JSON.parse(row.setting_value || '{}');
      return map?.[taskType];
    } catch {
      return undefined;
    }
  }

  async setWorkflowForTaskType(taskType: string, workflowName: string): Promise<void> {
    await this.initialize();
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const row = await settingsRepo.findOne({ where: { setting_key: 'defaults_by_task_type' } });
    let map: any = {};
    try { map = row?.setting_value ? JSON.parse(row.setting_value) : {}; } catch {}
    map[taskType] = workflowName;
    await settingsRepo.upsert({ setting_key: 'defaults_by_task_type', setting_value: JSON.stringify(map) }, ['setting_key']);
  }

  /**
   * Create a custom workflow
   */
  async createWorkflow(workflow: WorkflowDefinition): Promise<void> {
    await this.initialize();
    
    // Check if workflow already exists
    const existing = await this.getWorkflowConfig(workflow.name);
    if (existing) {
      throw new Error(`Workflow already exists: ${workflow.name}`);
    }
    
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    await workflowRepo.save({
      id: `workflow_${workflow.name}_${Date.now()}`,
      name: workflow.name,
      display_name: workflow.display_name,
      description: workflow.description,
      is_default: false, // Not default
      required_sections: workflow.required_sections as any,
      conditional_requirements: workflow.conditional_requirements as any || [],
      validation_rules: workflow.validation_rules as any || [],
      use_cases: workflow.use_cases || []
    });
  }

  /**
   * Delete a custom workflow
   */
  async deleteWorkflow(name: string): Promise<void> {
    await this.initialize();
    
    // Prevent deletion of built-in workflows
    const builtInNames = BUILT_IN_WORKFLOWS.map(w => w.name);
    if (builtInNames.includes(name)) {
      throw new Error(`Cannot delete built-in workflow: ${name}`);
    }
    
    // Check if it's the default workflow
    const defaultWorkflow = await this.getDefaultWorkflow();
    if (defaultWorkflow === name) {
      throw new Error('Cannot delete the default workflow');
    }
    
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    await workflowRepo.delete({ name });
  }
}
