/**
 * Workflow configuration management
 */

import { DataSource } from 'typeorm';
import { WorkflowConfiguration } from '../features/storage/entities/metadata/WorkflowConfiguration.entity.js';
import { GlobalWorkflowSetting } from '../features/storage/entities/metadata/GlobalWorkflowSetting.entity.js';
import { TaskStatus } from '../features/storage/entities/metadata/TaskStatus.entity.js';
import { TaskStatusFlow } from '../features/storage/entities/metadata/TaskStatusFlow.entity.js';
import { 
  WorkflowDefinition, 
  WorkflowConfig,
  WorkflowType,
  WorkflowValidationBundle,
  WorkflowStatusFlow
} from '../types/WorkflowTypes.js';
import { BUILT_IN_WORKFLOWS } from '../validation/WorkflowDefinitions.js';

// System workflow version - increment when making breaking changes to built-in workflows
const SYSTEM_WORKFLOW_VERSION = '1.1.0';

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

    // Run migration for existing data (one-time, idempotent)
    await this.runMigrations();

    // Load built-in workflows if not already present
    await this.loadBuiltInWorkflows();

    // Ensure default task_type -> workflow mapping exists
    await this.ensureDefaultTaskTypeMapping();

    // Seed core task statuses and flows when missing
    await this.ensureDefaultStatuses();
    await this.ensureDefaultStatusFlows();

    this.initialized = true;
  }

  /**
   * Run migrations for existing data
   */
  private async runMigrations(): Promise<void> {
    try {
      const { SystemEntityMigration } = await import('./migrations/SystemEntityMigration.js');
      const migration = new SystemEntityMigration(this.dataSource);

      const needsMigration = await migration.needsMigration();
      if (needsMigration) {
        console.error('[WorkflowConfigManager] Running system entity migration...');
        await migration.run();
      }

      // Fix workflow type mappings (epic/story should map to feature_development, not non-existent workflows)
      await this.fixWorkflowTypeMappings();
    } catch (error) {
      console.warn('[WorkflowConfigManager] Migration failed (non-fatal):', error);
      // Don't throw - migrations are best-effort
    }
  }

  /**
   * Fix incorrect workflow type mappings from initial seed
   * Epic and Story were incorrectly mapped to non-existent "epic" and "story" workflows
   * ONLY fixes the exact bad values - preserves user customizations
   */
  private async fixWorkflowTypeMappings(): Promise<void> {
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const row = await settingsRepo.findOne({ where: { setting_key: 'defaults_by_task_type' } });

    if (!row?.setting_value) {
      return; // No mappings to fix
    }

    try {
      const map = JSON.parse(row.setting_value);
      let needsUpdate = false;

      // Only fix if it's the exact bad value from the buggy seed
      // If user changed it to something else, leave it alone
      if (map.epic === 'epic') {
        console.error('[WorkflowConfigManager] Fixing buggy workflow mapping: epic "epic" → "feature_development"');
        map.epic = 'feature_development';
        needsUpdate = true;
      }

      if (map.story === 'story') {
        console.error('[WorkflowConfigManager] Fixing buggy workflow mapping: story "story" → "feature_development"');
        map.story = 'feature_development';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await settingsRepo.update(
          { setting_key: 'defaults_by_task_type' },
          { setting_value: JSON.stringify(map) }
        );
        console.error('[WorkflowConfigManager] ✅ Workflow type mappings fixed');
      }
    } catch (error) {
      console.warn('[WorkflowConfigManager] Failed to fix workflow type mappings:', error);
    }
  }

  /**
   * Load built-in workflows into database if not present
   * Auto-updates system workflows (is_system=true) to latest definitions
   */
  private async loadBuiltInWorkflows(): Promise<void> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);

    for (const workflow of BUILT_IN_WORKFLOWS) {
      const existing = await workflowRepo.findOne({ where: { name: workflow.name } });

      if (!existing) {
        // Create new system workflow with stable ID
        await workflowRepo.save({
          id: `workflow_${workflow.name}`, // Stable ID without timestamp
          name: workflow.name,
          display_name: workflow.display_name,
          description: workflow.description,
          is_default: workflow.name === 'feature_development',
          is_system: true, // Mark as system workflow
          system_version: SYSTEM_WORKFLOW_VERSION,
          required_sections: workflow.required_sections as any,
          conditional_requirements: workflow.conditional_requirements as any || [],
          validation_rules: workflow.validation_rules as any || [],
          validation_bundles: workflow.validation_bundles as WorkflowValidationBundle[] | undefined,
          status_flow_ref: workflow.status_flow_ref || null,
          status_flow: workflow.status_flow as WorkflowStatusFlow | undefined,
          child_requirements: workflow.child_requirements as any || [],
          use_cases: workflow.use_cases || []
        });
      } else if (existing.is_system) {
        // Auto-update system workflows only if version changed
        if (existing.system_version !== SYSTEM_WORKFLOW_VERSION) {
          console.error(`[WorkflowConfigManager] Updating system workflow: ${workflow.name} (${existing.system_version} → ${SYSTEM_WORKFLOW_VERSION})`);
          await workflowRepo.update({ name: workflow.name }, {
            display_name: workflow.display_name,
            description: workflow.description,
            system_version: SYSTEM_WORKFLOW_VERSION,
            required_sections: workflow.required_sections as any,
            conditional_requirements: workflow.conditional_requirements as any || [],
            validation_rules: workflow.validation_rules as any || [],
            validation_bundles: workflow.validation_bundles as WorkflowValidationBundle[] | undefined,
            status_flow_ref: workflow.status_flow_ref || null,
            status_flow: workflow.status_flow as WorkflowStatusFlow | undefined,
            child_requirements: workflow.child_requirements as any || [],
            use_cases: workflow.use_cases || []
          });
        }
      }
      // If is_system=false, user has customized it - don't update
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

    const DEFAULT_FLOWS_BY_TASK_TYPE: Record<string, string> = {
      epic: 'flow_feature',
      story: 'flow_feature',
      feature: 'flow_feature',
      task: 'flow_feature',
      subtask: 'flow_simple',
      milestone: 'flow_feature',
      bug: 'flow_bugfix',
      fix: 'flow_bugfix',
      hotfix: 'flow_bugfix',
      spike: 'flow_research',
      research: 'flow_research',
      chore: 'flow_simple',
      documentation: 'flow_simple',
      doc: 'flow_simple',
      refactor: 'flow_feature'
    };

    const flowRow = await settingsRepo.findOne({ where: { setting_key: 'status_flow_by_task_type' } });
    if (!flowRow || !flowRow.setting_value) {
      await settingsRepo.upsert({ setting_key: 'status_flow_by_task_type', setting_value: JSON.stringify(DEFAULT_FLOWS_BY_TASK_TYPE) }, ['setting_key']);
    }

    // Seed types_metadata
    const metaRow = await settingsRepo.findOne({ where: { setting_key: 'types_metadata' } });
    if (!metaRow || !metaRow.setting_value) {
      await settingsRepo.upsert({ setting_key: 'types_metadata', setting_value: JSON.stringify(TYPES_METADATA) }, ['setting_key']);
    }
  }

  private async ensureDefaultStatuses(): Promise<void> {
    const repo = this.dataSource.getRepository(TaskStatus);
    const count = await repo.count();
    if (count > 0) return;
    const defaults: Array<Partial<TaskStatus>> = [
      // Common statuses
      { id: 'todo', name: 'todo', display_label: 'To Do', emoji: '📝' },
      { id: 'in_progress', name: 'in_progress', display_label: 'In Progress', emoji: '🚧' },
      { id: 'blocked', name: 'blocked', display_label: 'Blocked', emoji: '⛔️' },
      { id: 'done', name: 'done', display_label: 'Done', emoji: '✅' },
      { id: 'cancelled', name: 'cancelled', display_label: 'Cancelled', emoji: '❌' },
      // Feature development statuses
      { id: 'planning', name: 'planning', display_label: 'Planning', emoji: '📋' },
      { id: 'spec_ready', name: 'spec_ready', display_label: 'Spec Ready', emoji: '📐' },
      { id: 'in_review', name: 'in_review', display_label: 'In Review', emoji: '👀' },
      // Bug tracking statuses
      { id: 'reported', name: 'reported', display_label: 'Reported', emoji: '🐛' },
      { id: 'analyzing', name: 'analyzing', display_label: 'Analyzing', emoji: '🔍' },
      { id: 'verified', name: 'verified', display_label: 'Verified', emoji: '✔️' },
      { id: 'wont_fix', name: 'wont_fix', display_label: "Won't Fix", emoji: '🚫' },
      // Research statuses
      { id: 'draft', name: 'draft', display_label: 'Draft', emoji: '✏️' },
      { id: 'investigating', name: 'investigating', display_label: 'Investigating', emoji: '🔬' }
    ];
    await repo.save(defaults.map((status) => repo.create(status)));
  }

  private async ensureDefaultStatusFlows(): Promise<void> {
    const repo = this.dataSource.getRepository(TaskStatusFlow);
    const count = await repo.count();
    if (count > 0) return;
    const defaults: Array<Partial<TaskStatusFlow>> = [
      {
        id: 'flow_simple',
        name: 'simple',
        display_label: 'Simple',
        description: 'Todo → In Progress → Done',
        status_ids: ['todo', 'in_progress', 'done', 'cancelled'],
        initial_state: 'todo'
      },
      {
        id: 'flow_feature',
        name: 'feature',
        display_label: 'Feature Development',
        description: 'Planning → Spec Ready → In Progress → In Review → Done',
        status_ids: ['planning', 'spec_ready', 'in_progress', 'in_review', 'done', 'cancelled'],
        initial_state: 'planning'
      },
      {
        id: 'flow_bugfix',
        name: 'bugfix',
        display_label: 'Bug Fix',
        description: 'Reported → Analyzing → In Progress → In Review → Verified → Done',
        status_ids: ['reported', 'analyzing', 'in_progress', 'in_review', 'verified', 'done', 'wont_fix'],
        initial_state: 'reported'
      },
      {
        id: 'flow_research',
        name: 'research',
        display_label: 'Research',
        description: 'Draft → Investigating → Analyzing → Done',
        status_ids: ['draft', 'investigating', 'analyzing', 'done', 'cancelled'],
        initial_state: 'draft'
      },
      // Legacy flows for backwards compatibility
      {
        id: 'flow_kanban',
        name: 'kanban',
        display_label: 'Kanban',
        description: 'Todo → In Progress → Blocked → Done',
        status_ids: ['todo', 'in_progress', 'blocked', 'done'],
        initial_state: 'todo'
      }
    ];
    await repo.save(defaults.map((flow) => repo.create(flow)));
  }

  /**
   * Reseed built-ins explicitly, with optional force overwrite
   * Only updates if force=true OR if is_system=true (not user-customized)
   */
  async reseedBuiltIns(force = false): Promise<void> {
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    for (const w of BUILT_IN_WORKFLOWS) {
      const existing = await workflowRepo.findOne({ where: { name: w.name } });
      if (!existing) {
        await workflowRepo.insert({
          id: `workflow_${w.name}`, // Stable ID
          name: w.name,
          display_name: w.display_name,
          description: w.description,
          is_default: w.name === 'feature_development',
          is_system: true,
          system_version: SYSTEM_WORKFLOW_VERSION,
          required_sections: w.required_sections as any,
          conditional_requirements: w.conditional_requirements as any || [],
          validation_rules: w.validation_rules as any || [],
          validation_bundles: w.validation_bundles as WorkflowValidationBundle[] | undefined,
          status_flow_ref: w.status_flow_ref || null,
          status_flow: w.status_flow as WorkflowStatusFlow | undefined,
          child_requirements: w.child_requirements as any || [],
          use_cases: w.use_cases || []
        });
      } else if (force || existing.is_system) {
        // Update if force=true OR if it's still a system workflow
        await workflowRepo.update({ name: w.name }, {
          display_name: w.display_name,
          description: w.description,
          system_version: SYSTEM_WORKFLOW_VERSION,
          required_sections: w.required_sections as any,
          conditional_requirements: w.conditional_requirements as any || [],
          validation_rules: w.validation_rules as any || [],
          validation_bundles: w.validation_bundles as WorkflowValidationBundle[] | undefined,
          status_flow_ref: w.status_flow_ref || null,
          status_flow: w.status_flow as WorkflowStatusFlow | undefined,
          child_requirements: w.child_requirements as any || [],
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

  async getAvailableTaskStatuses(): Promise<string[]> {
    await this.initialize();
    const defaults = ['todo', 'in_progress', 'blocked', 'done'];
    try {
      const repo = this.dataSource.getRepository(TaskStatus);
      const rows = await repo.find({ order: { name: 'ASC' } });
      if (!rows.length) {
        return defaults;
      }
      return rows.map((row) => row.id || row.name);
    } catch (error) {
      console.error('[WorkflowConfigManager] Failed to fetch task statuses', error);
      return defaults;
    }
  }

  getStatePresets(): Array<{ id: string; label: string; states: string[] }> {
    return [
      {
        id: 'kanban',
        label: 'Kanban (Todo → In Progress → Blocked → Done)',
        states: ['todo', 'in_progress', 'blocked', 'done']
      },
      {
        id: 'simple',
        label: 'Simple (Todo → Done)',
        states: ['todo', 'done']
      }
    ];
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
      validation_bundles: (result.validation_bundles || undefined) as any,
      status_flow_ref: result.status_flow_ref || null,
      status_flow: result.status_flow as any,
      child_requirements: result.child_requirements as any,
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

    if (config.validation_bundles !== undefined) {
      updateData.validation_bundles = config.validation_bundles as any;
    }

    if (config.status_flow !== undefined) {
      updateData.status_flow = config.status_flow as any;
      if (config.status_flow_ref === undefined) {
        updateData.status_flow_ref = null;
      }
    }

    if (config.status_flow_ref !== undefined) {
      updateData.status_flow_ref = config.status_flow_ref as any;
      if (config.status_flow_ref) {
        updateData.status_flow = null;
      }
    }

    if (config.use_cases !== undefined) {
      updateData.use_cases = config.use_cases;
    }

    if (config.child_requirements !== undefined) {
      updateData.child_requirements = config.child_requirements as any;
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
      validation_bundles: (r.validation_bundles || undefined) as any,
      status_flow_ref: r.status_flow_ref || null,
      status_flow: r.status_flow as any,
      child_requirements: r.child_requirements as any,
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
   * User-created workflows have is_system=false
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
      id: `workflow_custom_${workflow.name}_${Date.now()}`, // User workflows get timestamp for uniqueness
      name: workflow.name,
      display_name: workflow.display_name,
      description: workflow.description,
      is_default: false,
      is_system: false, // User-created, not system
      system_version: undefined,
      required_sections: workflow.required_sections as any,
      conditional_requirements: workflow.conditional_requirements as any || [],
      validation_rules: workflow.validation_rules as any || [],
      validation_bundles: workflow.validation_bundles as WorkflowValidationBundle[] | undefined,
      status_flow_ref: workflow.status_flow_ref || null,
      status_flow: workflow.status_flow_ref ? undefined : workflow.status_flow as WorkflowStatusFlow | undefined,
      child_requirements: workflow.child_requirements as any || [],
      use_cases: workflow.use_cases || []
    });
  }

  /**
   * Copy a workflow to create a customizable version
   * Used for "copy to customize" pattern with system workflows
   */
  async copyWorkflow(sourceName: string, newName: string, newDisplayName?: string): Promise<void> {
    await this.initialize();

    const source = await this.getWorkflowConfig(sourceName);
    if (!source) {
      throw new Error(`Source workflow not found: ${sourceName}`);
    }

    const existing = await this.getWorkflowConfig(newName);
    if (existing) {
      throw new Error(`Workflow already exists: ${newName}`);
    }

    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    await workflowRepo.save({
      id: `workflow_custom_${newName}_${Date.now()}`,
      name: newName,
      display_name: newDisplayName || `${source.display_name} (Custom)`,
      description: source.description,
      is_default: false,
      is_system: false, // Custom copy, not system
      system_version: undefined,
      required_sections: source.required_sections as any,
      conditional_requirements: source.conditional_requirements as any || [],
      validation_rules: source.validation_rules as any || [],
      validation_bundles: source.validation_bundles as WorkflowValidationBundle[] | undefined,
      status_flow_ref: source.status_flow_ref || null,
      status_flow: source.status_flow as WorkflowStatusFlow | undefined,
      child_requirements: source.child_requirements as any || [],
      use_cases: source.use_cases || []
    });
  }

  /**
   * Delete a custom workflow
   */
  async deleteWorkflow(name: string): Promise<void> {
    await this.initialize();

    // Prevent deletion of system workflows
    const workflowRepo = this.dataSource.getRepository(WorkflowConfiguration);
    const workflow = await workflowRepo.findOne({ where: { name } });
    if (workflow?.is_system) {
      throw new Error(`Cannot delete system workflow: ${name}`);
    }

    // Check if it's the default workflow
    const defaultWorkflow = await this.getDefaultWorkflow();
    if (defaultWorkflow === name) {
      throw new Error('Cannot delete the default workflow');
    }

    await workflowRepo.delete({ name });
  }

  // --- Task Status Management -------------------------------------------------
  async listTaskStatuses(): Promise<TaskStatus[]> {
    await this.initialize();
    const repo = this.dataSource.getRepository(TaskStatus);
    return repo.find({ order: { name: 'ASC' } });
  }

  async upsertTaskStatus(status: {
    id?: string;
    name: string;
    display_label?: string;
    emoji?: string;
    color?: string;
    description?: string;
  }): Promise<TaskStatus> {
    await this.initialize();
    const repo = this.dataSource.getRepository(TaskStatus);
    const id = status.id || slugify(status.name);
    const entity = repo.create({
      id,
      name: status.name,
      display_label: status.display_label,
      emoji: status.emoji,
      color: status.color,
      description: status.description
    });
    await repo.save(entity);
    return entity;
  }

  async deleteTaskStatus(id: string): Promise<void> {
    await this.initialize();
    const repo = this.dataSource.getRepository(TaskStatus);
    await repo.delete({ id });
  }

  // --- Task Status Flow Management --------------------------------------------
  async listTaskStatusFlows(): Promise<TaskStatusFlow[]> {
    await this.initialize();
    const repo = this.dataSource.getRepository(TaskStatusFlow);
    return repo.find({ order: { name: 'ASC' } });
  }

  async upsertTaskStatusFlow(flow: {
    id?: string;
    name: string;
    display_label?: string;
    description?: string;
    status_ids: string[];
    metadata?: Record<string, unknown>;
  }): Promise<TaskStatusFlow> {
    await this.initialize();
    const repo = this.dataSource.getRepository(TaskStatusFlow);
    const statusRepo = this.dataSource.getRepository(TaskStatus);
    const normalized = Array.from(new Set(
      (flow.status_ids || [])
        .map((id) => slugify(id))
        .filter(Boolean)
    ));
    if (!normalized.length) {
      throw new Error('A status flow must include at least one status');
    }
    const statuses = await statusRepo.findByIds(normalized);
    if (statuses.length !== normalized.length) {
      const missing = normalized.filter((id) => !statuses.find((status) => status.id === id));
      throw new Error(`Unknown status id(s): ${missing.join(', ')}`);
    }

    const id = flow.id || slugify(flow.name);
    const entity = repo.create({
      id,
      name: flow.name,
      display_label: flow.display_label,
      description: flow.description,
      status_ids: normalized,
      metadata: flow.metadata ?? null
    });
    await repo.save(entity);
    return entity;
  }

  async deleteTaskStatusFlow(id: string): Promise<void> {
    await this.initialize();
    const repo = this.dataSource.getRepository(TaskStatusFlow);
    await repo.delete({ id });
  }
  async getStatusFlowForTaskType(taskType?: string): Promise<string | undefined> {
    await this.initialize();
    if (!taskType) return undefined;
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const row = await settingsRepo.findOne({ where: { setting_key: 'status_flow_by_task_type' } });
    if (!row?.setting_value) return undefined;
    try {
      const map = JSON.parse(row.setting_value || '{}');
      return map?.[taskType];
    } catch {
      return undefined;
    }
  }

  async setStatusFlowForTaskType(taskType: string, flowId?: string | null): Promise<void> {
    await this.initialize();
    const settingsRepo = this.dataSource.getRepository(GlobalWorkflowSetting);
    const row = await settingsRepo.findOne({ where: { setting_key: 'status_flow_by_task_type' } });
    let map: any = {};
    try { map = row?.setting_value ? JSON.parse(row.setting_value) : {}; } catch {}
    if (!flowId) {
      delete map[taskType];
    } else {
      map[taskType] = flowId;
    }
    await settingsRepo.upsert({ setting_key: 'status_flow_by_task_type', setting_value: JSON.stringify(map) }, ['setting_key']);
  }
}

function slugify(input: string): string {
  const base = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || `status_${Math.random().toString(36).slice(2, 8)}`;
}
