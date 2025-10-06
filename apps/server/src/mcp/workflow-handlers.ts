/**
 * MCP handlers for workflow configuration management
 */

import { WorkflowConfigManager } from '../storage/WorkflowConfigManager.js';
import { WorkflowDefinition } from '../types/WorkflowTypes.js';
import { WorkflowService } from '../features/workflows/services/WorkflowService.js';
import { WorkflowScaffoldingService } from '../features/workflows/services/WorkflowScaffoldingService.js';
import { DatabaseManager } from '../features/storage/DatabaseManager.js';
import { GuidanceService } from '../features/workflows/services/GuidanceService.js';

/**
 * Handle workflow configuration tools
 */
export async function handleWorkflowTools(args: any, dbOrManager: any) {
  const { action, ...params } = args;
  // Resolve DatabaseManager and DataSource
  const dbManager: DatabaseManager | null = dbOrManager && dbOrManager.getMetadataDataSource ? dbOrManager as DatabaseManager : null;
  const metadataDs = dbManager ? dbManager.getMetadataDataSource() : dbOrManager;
  const configManager = new WorkflowConfigManager(metadataDs);
  
  switch (action) {
    case 'set_type_mapping': {
      const { task_type, workflow_name } = params;
      if (!task_type || !workflow_name) throw new Error('task_type and workflow_name are required');
      await configManager.setWorkflowForTaskType(task_type, workflow_name);
      return { content: [{ type: 'text', text: `Mapping set: ${task_type} -> ${workflow_name}` }] };
    }

    case 'get_type_mapping': {
      const cfg = await configManager.getGlobalConfig();
      const value = (cfg as any).defaults_by_task_type || {};
      return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
    }

    case 'resolve': {
      const { task_type, workflow } = params;
      const byType = await configManager.getWorkflowForTaskType(task_type);
      const resolved = workflow || byType || await configManager.getDefaultWorkflow();
      return { content: [{ type: 'text', text: resolved }] };
    }
    case 'get_default': {
      const defaultWorkflow = await configManager.getDefaultWorkflow();
      return {
        content: [
          {
            type: 'text',
            text: `Default workflow: ${defaultWorkflow}`
          }
        ]
      };
    }
    
    case 'set_default': {
      const { workflow_name } = params;
      if (!workflow_name) {
        throw new Error('Workflow name is required for set_default action');
      }
      
      await configManager.setDefaultWorkflow(workflow_name);
      return {
        content: [
          {
            type: 'text',
            text: `Default workflow set to: ${workflow_name}`
          }
        ]
      };
    }
    
    case 'list': {
      const workflows = await configManager.listAvailableWorkflows();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(workflows, null, 2)
          }
        ]
      };
    }
    
    case 'get': {
      const { workflow_name } = params;
      if (!workflow_name) {
        throw new Error('Workflow name is required for get action');
      }
      
      const workflow = await configManager.getWorkflowConfig(workflow_name);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflow_name}`);
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(workflow, null, 2)
          }
        ]
      };
    }
    
    case 'create': {
      const { workflow } = params;
      if (!workflow || !workflow.name) {
        throw new Error('Workflow definition with name is required for create action');
      }
      
      await configManager.createWorkflow(workflow as WorkflowDefinition);
      return {
        content: [
          {
            type: 'text',
            text: `Workflow created: ${workflow.name}`
          }
        ]
      };
    }
    
    case 'update': {
      const { workflow_name, updates } = params;
      if (!workflow_name) {
        throw new Error('Workflow name is required for update action');
      }
      if (!updates) {
        throw new Error('Updates are required for update action');
      }
      
      await configManager.updateWorkflowConfig(workflow_name, updates);
      return {
        content: [
          {
            type: 'text',
            text: `Workflow updated: ${workflow_name}`
          }
        ]
      };
    }
    
    case 'delete': {
      const { workflow_name } = params;
      if (!workflow_name) {
        throw new Error('Workflow name is required for delete action');
      }
      
      await configManager.deleteWorkflow(workflow_name);
      return {
        content: [
          {
            type: 'text',
            text: `Workflow deleted: ${workflow_name}`
          }
        ]
      };
    }
    
    case 'get_config': {
      const config = await configManager.getGlobalConfig();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(config, null, 2)
          }
        ]
      };
    }
    
    case 'update_config': {
      const { updates } = params;
      if (!updates) {
        throw new Error('Updates are required for update_config action');
      }
      
      await configManager.updateGlobalConfig(updates);
      return {
        content: [
          {
            type: 'text',
            text: 'Global workflow configuration updated'
          }
        ]
      };
    }

    case 'guide': {
      if (!dbManager) throw new Error('DatabaseManager required for guide');
      const { task, workflow } = params;
      if (!task) throw new Error('task is required for guide');
      // Ensure workflow is resolved on the task for accurate templates
      const wf = new WorkflowService(dbManager);
      (task as any).workflow = await wf.resolveWorkflowName(task.task_type, workflow);
      const svc = new GuidanceService(dbManager);
      const guidance = await svc.build(task);
      return { content: [{ type: 'text', text: JSON.stringify(guidance, null, 2) }] };
    }

    case 'reseed': {
      const { force } = params;
      await configManager.reseedBuiltIns(!!force);
      return { content: [{ type: 'text', text: 'Built-in workflows reseeded' }] };
    }
    
    case 'validate': {
      const { task, workflow } = params;
      if (!dbManager) throw new Error('DatabaseManager required for validate');
      if (!task) throw new Error('task is required for validate');
      const timeoutMs = Number(process.env.WORKFLOW_VALIDATE_TIMEOUT_MS || 8000);
      const svc = new WorkflowService(dbManager);
      console.log(`[workflows.validate] start for task=${task.id || task.title || 'unknown'}`);
      // Hydrate task from DB if id is present so checklists/entity_links are included
      let taskForValidation: any = task;
      try {
        if (task && task.id) {
          const repo = dbManager.getTasksRepository();
          const full = await repo.getTask(task.id);
          if (full) taskForValidation = { ...full, ...task };
        }
      } catch {}
      const wfName = await svc.resolveWorkflowName(taskForValidation.task_type, workflow);

      const withTimeout = async <T>(p: Promise<T>, label: string): Promise<T> => {
        return await Promise.race([
          p,
          new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs))
        ]) as T;
      };

      const result = await withTimeout(svc.validate(taskForValidation, wfName), 'validate');
      // Optional guidance enrichment (can be disabled via env)
      if (String(process.env.WORKFLOW_VALIDATE_INCLUDE_GUIDANCE || 'true').toLowerCase() === 'true') {
        const Guide = (await import('../features/workflows/services/GuidanceService.js')).GuidanceService;
        const guideSvc = new Guide(dbManager);
        const guidance = await withTimeout(guideSvc.build({ ...taskForValidation, workflow: wfName } as any), 'guidance');
        const enriched = { ...result, guidance };
        console.log(`[workflows.validate] done for task=${task.id || task.title || 'unknown'}`);
        return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] };
      }
      console.log(`[workflows.validate] done (no guidance) for task=${task.id || task.title || 'unknown'}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    
    case 'scaffold': {
      const { workflow_name, task_id, dry_run = true, sections, stubs } = params;
      if (!dbManager) throw new Error('DatabaseManager required for scaffold');
      if (!workflow_name) throw new Error('workflow_name is required');
      if (!task_id) throw new Error('task_id is required');
      const svc = new WorkflowScaffoldingService(dbManager);
      const result = await svc.scaffoldMissing(task_id, workflow_name, { dryRun: !!dry_run, sections, stubs });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
    
    default:
      throw new Error(`Unknown workflow action: ${action}`);
  }
}
