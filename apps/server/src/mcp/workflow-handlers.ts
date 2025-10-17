/**
 * MCP handlers for workflow configuration management
 */

import { WorkflowConfigManager } from '../storage/WorkflowConfigManager.js';
import { WorkflowDefinition } from '../types/WorkflowTypes.js';
import { WorkflowService } from '../features/workflows/services/WorkflowService.js';
import { WorkflowScaffoldingService } from '../features/workflows/services/WorkflowScaffoldingService.js';
import { DatabaseManager } from '../features/storage/DatabaseManager.js';
import { GuidanceService } from '../features/workflows/services/GuidanceService.js';
import { WorkflowSnapshotService } from '../features/workflows/services/WorkflowSnapshotService.js';

/**
 * Handle workflow configuration tools
 */
export async function handleWorkflowTools(args: any, dbOrManager: any) {
  const { action, ...params } = args;
  // Resolve DatabaseManager and DataSource
  const dbManager: DatabaseManager | null = dbOrManager && dbOrManager.getMetadataDataSource ? dbOrManager as DatabaseManager : null;
  const metadataDs = dbManager ? dbManager.getMetadataDataSource() : dbOrManager;
  const configManager = new WorkflowConfigManager(metadataDs);

  const respond = (payload: any, text?: string) => ({
    content: [{ type: 'text', text: text ?? JSON.stringify(payload, null, 2) }],
    payload
  });

  const parseMap = (raw: unknown): Record<string, string> => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }
    if (typeof raw === 'object') {
      return raw as Record<string, string>;
    }
    return {};
  };
  
  switch (action) {
    case 'help': {
      const helpText = `
WORKFLOWS TOOL - Full Schema and Actions

Administrative tool for configuring workflow templates that define task requirements.

AVAILABLE ACTIONS:

WORKFLOW CRUD:
  - list: List all available workflows
  - get: Get workflow definition (requires: workflow_name)
  - create: Create new workflow (requires: workflow)
  - update: Update workflow (requires: workflow_name, updates)
  - delete: Delete workflow (requires: workflow_name)

DEFAULTS:
  - get_default: Get default workflow name
  - set_default: Set default workflow (requires: workflow_name)

TYPE MAPPINGS:
  - set_type_mapping: Map task type to workflow (requires: task_type, workflow_name)
  - get_type_mapping: Get all task type to workflow mappings
  - resolve: Resolve workflow for task type (requires: task_type, optional: workflow)

VALIDATION:
  - validate: Validate task against workflow (requires: task, optional: workflow)
  - scaffold: Create missing requirements (requires: task_id, workflow_name, optional: dry_run, sections)
  - guide: Get guidance for task (requires: task, optional: workflow)

STATUS CATALOG:
  - list_statuses: List all task statuses
  - upsert_status: Create/update status (requires: status with {name, display_label?, emoji?, color?, description?})
  - delete_status: Delete status (requires: status_id)

STATUS FLOWS:
  - list_status_flows: List all status flows
  - upsert_status_flow: Create/update flow (requires: flow with {name, status_ids[], display_label?, description?})
  - delete_status_flow: Delete flow (requires: flow_id)
  - get_flow_mapping: Get task type to flow mappings
  - set_flow_mapping: Set flow mapping (requires: task_type, flow_id_for_type OR flow_map object)

ADMIN:
  - reseed: Reset built-in workflows (optional: force=true to overwrite)
  - export_snapshot: Export workflows to file (requires: project_path, optional: file_path)
  - import_snapshot: Import workflows from file (requires: project_path, optional: file_path, overwrite)

PARAMETERS:
  - project: (required) Project name or path
  - action: (required) Action to perform
  - workflow_name: Workflow name for get/update/delete/resolve
  - workflow: Workflow definition object for create
  - updates: Partial updates object for update/update_config
  - task_type: Task type for mappings
  - task: Task object for validate/guide
  - task_id: Task ID for scaffold
  - sections: Array of section names for scaffold
  - dry_run: Boolean for scaffold (default: true)
  - force: Boolean for reseed (default: false)
  - status_id: Status identifier for delete
  - status: Status object for upsert
  - flow_id: Flow identifier for delete
  - flow: Flow object for upsert
  - flow_map: Bulk mapping object for set_flow_mapping
  - flow_id_for_type: Flow ID for set_flow_mapping
`;
      return respond({ help: helpText }, helpText);
    }

    case 'set_type_mapping': {
      const { task_type, workflow_name } = params;
      if (!task_type || !workflow_name) throw new Error('task_type and workflow_name are required');
      await configManager.setWorkflowForTaskType(task_type, workflow_name);
      return respond({ ok: true, task_type, workflow_name }, `Mapping set: ${task_type} -> ${workflow_name}`);
    }

    case 'get_type_mapping': {
      const cfg = await configManager.getGlobalConfig();
      const value = parseMap((cfg as any).defaults_by_task_type);
      return respond({ map: value });
    }

    case 'resolve': {
      const { task_type, workflow } = params;
      const byType = await configManager.getWorkflowForTaskType(task_type);
      const resolved = workflow || byType || await configManager.getDefaultWorkflow();
      return respond({ workflow: resolved }, resolved);
    }
    case 'get_default': {
      const defaultWorkflow = await configManager.getDefaultWorkflow();
      return respond({ workflow: defaultWorkflow }, `Default workflow: ${defaultWorkflow}`);
    }
    
    case 'set_default': {
      const { workflow_name } = params;
      if (!workflow_name) {
        throw new Error('Workflow name is required for set_default action');
      }
      
      await configManager.setDefaultWorkflow(workflow_name);
      return respond({ ok: true, workflow: workflow_name }, `Default workflow set to: ${workflow_name}`);
    }
    
    case 'list': {
      const workflows = await configManager.listAvailableWorkflows();
      return respond({ items: workflows });
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
      
      return respond({ workflow });
    }
    
    case 'create': {
      const { workflow } = params;
      if (!workflow || !workflow.name) {
        throw new Error('Workflow definition with name is required for create action');
      }
      
      await configManager.createWorkflow(workflow as WorkflowDefinition);
      return respond({ ok: true, workflow: workflow.name }, `Workflow created: ${workflow.name}`);
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
      return respond({ ok: true, workflow: workflow_name, updates }, `Workflow updated: ${workflow_name}`);
    }
    
    case 'delete': {
      const { workflow_name } = params;
      if (!workflow_name) {
        throw new Error('Workflow name is required for delete action');
      }
      
      await configManager.deleteWorkflow(workflow_name);
      return respond({ ok: true, workflow: workflow_name }, `Workflow deleted: ${workflow_name}`);
    }
    
    case 'get_config': {
      const config = await configManager.getGlobalConfig();
      return respond({ config });
    }
    
    case 'update_config': {
      const { updates } = params;
      if (!updates) {
        throw new Error('Updates are required for update_config action');
      }
      
      await configManager.updateGlobalConfig(updates);
      return respond({ ok: true, updates }, 'Global workflow configuration updated');
    }

    case 'export_snapshot': {
      if (!dbManager) throw new Error('DatabaseManager required for export_snapshot');
      const projectPath = params.project || params.project_path;
      if (!projectPath) throw new Error('project path is required for export_snapshot');
      const snapshotService = new WorkflowSnapshotService(dbManager);
      const result = await snapshotService.exportSnapshot(projectPath, { filePath: params.file_path });
      return respond(result);
    }

    case 'import_snapshot': {
      if (!dbManager) throw new Error('DatabaseManager required for import_snapshot');
      const projectPath = params.project || params.project_path;
      if (!projectPath) throw new Error('project path is required for import_snapshot');
      const snapshotService = new WorkflowSnapshotService(dbManager);
      const result = await snapshotService.importSnapshot(projectPath, { filePath: params.file_path, overwrite: params.overwrite !== false });
      return respond(result);
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
      return respond({ guidance });
    }

    case 'reseed': {
      const { force } = params;
      await configManager.reseedBuiltIns(!!force);
      return respond({ ok: true, force: !!force }, 'Built-in workflows reseeded');
    }
    
    case 'validate': {
      const { task, workflow } = params;
      if (!dbManager) throw new Error('DatabaseManager required for validate');
      if (!task) throw new Error('task is required for validate');
      const timeoutMs = Number(process.env.WORKFLOW_VALIDATE_TIMEOUT_MS || 8000);
      const svc = new WorkflowService(dbManager);
      console.error(`[workflows.validate] start for task=${task.id || task.title || 'unknown'}`);
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
        console.error(`[workflows.validate] done for task=${task.id || task.title || 'unknown'}`);
        return respond(enriched);
      }
      console.error(`[workflows.validate] done (no guidance) for task=${task.id || task.title || 'unknown'}`);
      return respond(result);
    }
    
    case 'scaffold': {
      const { workflow_name, task_id, dry_run = true, sections, stubs } = params;
      if (!dbManager) throw new Error('DatabaseManager required for scaffold');
      if (!workflow_name) throw new Error('workflow_name is required');
      if (!task_id) throw new Error('task_id is required');
      const svc = new WorkflowScaffoldingService(dbManager);
      const result = await svc.scaffoldMissing(task_id, workflow_name, { dryRun: !!dry_run, sections, stubs });
      return respond(result);
    }

    case 'list_statuses': {
      const statuses = await configManager.listTaskStatuses();
      return respond({ statuses });
    }

    case 'upsert_status': {
      const statusInput = params.status ?? params;
      if (!statusInput || !statusInput.name) {
        throw new Error('status.name is required for upsert_status');
      }
      const status = await configManager.upsertTaskStatus(statusInput);
      return respond({ status }, `Status saved: ${status.id}`);
    }

    case 'delete_status': {
      const statusId = params.status_id || params.id;
      if (!statusId) throw new Error('status_id is required for delete_status');
      await configManager.deleteTaskStatus(String(statusId));
      return respond({ ok: true, status_id: String(statusId) }, `Status deleted: ${statusId}`);
    }

    case 'list_status_flows': {
      const [flows, presets] = await Promise.all([
        configManager.listTaskStatusFlows(),
        Promise.resolve(configManager.getStatePresets())
      ]);
      return respond({ flows, presets });
    }

    case 'upsert_status_flow': {
      const flowInput = params.flow ?? params;
      if (!flowInput || !flowInput.name) {
        throw new Error('flow.name is required for upsert_status_flow');
      }
      if (!Array.isArray(flowInput.status_ids) || !flowInput.status_ids.length) {
        throw new Error('flow.status_ids must be a non-empty array');
      }
      const flow = await configManager.upsertTaskStatusFlow(flowInput);
      return respond({ flow }, `Flow saved: ${flow.id}`);
    }

    case 'delete_status_flow': {
      const flowId = params.flow_id || params.id;
      if (!flowId) throw new Error('flow_id is required for delete_status_flow');
      await configManager.deleteTaskStatusFlow(String(flowId));
      return respond({ ok: true, flow_id: String(flowId) }, `Flow deleted: ${flowId}`);
    }

    case 'get_flow_mapping': {
      const cfg = await configManager.getGlobalConfig();
      const map = parseMap((cfg as any).status_flow_by_task_type);
      return respond({ map });
    }

    case 'set_flow_mapping': {
      const bulk = params.flow_map;
      if (bulk && typeof bulk === 'object') {
        const cfg = await configManager.getGlobalConfig();
        const existing = parseMap((cfg as any).status_flow_by_task_type);
        const merged = { ...existing };
        Object.entries(bulk as Record<string, unknown>).forEach(([taskType, flow]) => {
          if (!flow) {
            delete merged[taskType];
          } else {
            merged[taskType] = String(flow);
          }
        });
        await configManager.updateGlobalConfig({ status_flow_by_task_type: merged });
        return respond({ ok: true, map: merged }, 'Flow mapping updated');
      }
      const taskType = params.task_type;
      const flowIdRaw = params.flow_id_for_type ?? params.flow_id;
      if (!taskType) {
        throw new Error('task_type is required for set_flow_mapping');
      }
      if (!flowIdRaw) {
        await configManager.setStatusFlowForTaskType(taskType, null);
      } else {
        await configManager.setStatusFlowForTaskType(taskType, String(flowIdRaw));
      }
      const cfg = await configManager.getGlobalConfig();
      const map = parseMap((cfg as any).status_flow_by_task_type);
      return respond(
        { ok: true, task_type: taskType, flow_id: flowIdRaw ?? null, map },
        flowIdRaw ? `Flow mapping set: ${taskType} -> ${flowIdRaw}` : `Flow mapping cleared for ${taskType}`
      );
    }

    default:
      throw new Error(`Unknown workflow action: ${action}`);
  }
}
