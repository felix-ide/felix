import express from 'express';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';
import { BUILT_IN_WORKFLOWS } from '../../validation/WorkflowDefinitions.js';
import { WorkflowService } from '../../features/workflows/services/WorkflowService.js';
import { WorkflowScaffoldingService } from '../../features/workflows/services/WorkflowScaffoldingService.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import { GuidanceService } from '../../features/workflows/services/GuidanceService.js';
import { WorkflowSnapshotService } from '../../features/workflows/services/WorkflowSnapshotService.js';

const DEFAULT_STATE_PRESETS = [
  {
    id: 'kanban',
    label: 'Kanban (Todo → In Progress → Blocked → Done)',
    states: ['todo', 'in_progress', 'blocked', 'done']
  },
  {
    id: 'spec_gate',
    label: 'Spec Gate (Todo → Spec Ready → In Progress → Done)',
    states: ['todo', 'spec_ready', 'in_progress', 'done']
  },
  {
    id: 'simple',
    label: 'Simple (Todo → Done)',
    states: ['todo', 'done']
  }
] as const;
const DEFAULT_STATUSES = Array.from(new Set(DEFAULT_STATE_PRESETS.flatMap((preset) => preset.states)));

const router = express.Router();

// Attach project resolution
router.use(resolveProject);

// List workflows and default
router.get('/workflows', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const [items, defaultWorkflow] = await Promise.all([
      indexer.listWorkflows(),
      indexer.getDefaultWorkflow()
    ]);
    res.json({ items, default: defaultWorkflow });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get default workflow name
router.get('/workflows/default', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = (req as any).projectIndexer;
    if (!indexer) {
      // Safe default when no project yet
      return res.json({ default: 'feature_development' });
    }
    const name = await indexer.getDefaultWorkflow();
    res.json({ default: name });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Set default workflow name
router.post('/workflows/default', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgr = new (await import('../../storage/WorkflowConfigManager.js')).WorkflowConfigManager(db);
    await mgr.initialize();
    await mgr.setDefaultWorkflow(name);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Registry summary (Phase 1: built-in count only; DB/file breakdown later)
router.get('/workflows/registry', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const [items, defaultWorkflow] = await Promise.all([
      indexer.listWorkflows(),
      indexer.getDefaultWorkflow()
    ]);
    res.json({
      sources: {
        db: items.length, // Phase 1: all in DB after seeding
        file: 0,
        builtin: BUILT_IN_WORKFLOWS.length
      },
      default: defaultWorkflow
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
router.post('/workflows/export', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    if (!req.projectPath) {
      return res.status(400).json({ error: 'Project path is required for workflow export' });
    }
    const dbManager: DatabaseManager = (indexer as any).dbManager;
    const snapshotService = new WorkflowSnapshotService(dbManager);
    const result = await snapshotService.exportSnapshot(req.projectPath, { filePath: (req.body || {}).file_path });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/workflows/import', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    if (!req.projectPath) {
      return res.status(400).json({ error: 'Project path is required for workflow import' });
    }
    const { file_path, overwrite } = req.body || {};
    const dbManager: DatabaseManager = (indexer as any).dbManager;
    const snapshotService = new WorkflowSnapshotService(dbManager);
    const result = await snapshotService.importSnapshot(req.projectPath, { filePath: file_path, overwrite });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create/Update workflow (upsert)
router.post('/workflows', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const { def, upsert } = req.body || {};
    if (!def || !def.name) return res.status(400).json({ error: 'def.name is required' });
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgr = new (await import('../../storage/WorkflowConfigManager.js')).WorkflowConfigManager(db);
    await mgr.initialize();
    const existing = await mgr.getWorkflowConfig(def.name);
    if (existing && !upsert) return res.status(409).json({ error: 'Workflow exists' });
    if (existing) {
      await mgr.updateWorkflowConfig(def.name, def);
    } else {
      await mgr.createWorkflow(def);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete workflow
router.delete('/workflows/:name', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgr = new (await import('../../storage/WorkflowConfigManager.js')).WorkflowConfigManager(db);
    await mgr.initialize();
    await mgr.deleteWorkflow(req.params.name as string);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get global workflow config (including defaults_by_task_type mapping)
router.get('/workflows/config', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = (req as any).projectIndexer;
    if (!indexer) {
      // Safe default when no project yet
      return res.json({ config: { default_workflow: 'feature_development', allow_override: true, strict_validation: true, emergency_bypass_enabled: true, conditional_rules_enabled: true }, mapping: {} });
    }
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgr = new (await import('../../storage/WorkflowConfigManager.js')).WorkflowConfigManager(db);
    await mgr.initialize();
    const cfg = await mgr.getGlobalConfig();
    let mapping: Record<string, string> = {};
    try {
      mapping = typeof (cfg as any).defaults_by_task_type === 'string' ? JSON.parse((cfg as any).defaults_by_task_type) : ((cfg as any).defaults_by_task_type || {});
    } catch {}
    res.json({ config: cfg, mapping });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/workflows/statuses', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = (req as any).projectIndexer;
    if (!indexer) {
      return res.json({ statuses: DEFAULT_STATUSES.map((id) => ({ id, name: id })) });
    }
    const dbManager: DatabaseManager = (indexer as any).dbManager;
    const dataSource = dbManager.getMetadataDataSource();
    const { WorkflowConfigManager } = await import('../../storage/WorkflowConfigManager.js');
    const manager = new WorkflowConfigManager(dataSource);
    const statuses = await manager.listTaskStatuses();
    res.json({ statuses });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/workflows/statuses', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const payload = req.body || {};
    const dbManager: DatabaseManager = (indexer as any).dbManager;
    const dataSource = dbManager.getMetadataDataSource();
    const { WorkflowConfigManager } = await import('../../storage/WorkflowConfigManager.js');
    const manager = new WorkflowConfigManager(dataSource);
    const status = await manager.upsertTaskStatus({
      id: payload.id,
      name: payload.name,
      display_label: payload.display_label,
      emoji: payload.emoji,
      color: payload.color,
      description: payload.description
    });
    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/workflows/statuses/:id', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const dbManager: DatabaseManager = (indexer as any).dbManager;
    const dataSource = dbManager.getMetadataDataSource();
    const { WorkflowConfigManager } = await import('../../storage/WorkflowConfigManager.js');
    const manager = new WorkflowConfigManager(dataSource);
    await manager.deleteTaskStatus(String(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/workflows/status-flows', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = (req as any).projectIndexer;
    if (!indexer) {
      return res.json({ flows: [] });
    }
    const dbManager: DatabaseManager = (indexer as any).dbManager;
    const dataSource = dbManager.getMetadataDataSource();
    const { WorkflowConfigManager } = await import('../../storage/WorkflowConfigManager.js');
    const manager = new WorkflowConfigManager(dataSource);
    const flows = await manager.listTaskStatusFlows();
    res.json({ flows, presets: DEFAULT_STATE_PRESETS });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/workflows/status-flows', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const payload = req.body || {};
    const dbManager: DatabaseManager = (indexer as any).dbManager;
    const dataSource = dbManager.getMetadataDataSource();
    const { WorkflowConfigManager } = await import('../../storage/WorkflowConfigManager.js');
    const manager = new WorkflowConfigManager(dataSource);
    const flow = await manager.upsertTaskStatusFlow({
      id: payload.id,
      name: payload.name,
      display_label: payload.display_label,
      description: payload.description,
      status_ids: Array.isArray(payload.status_ids) ? payload.status_ids : [],
      metadata: payload.metadata
    });
    res.json({ flow });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/workflows/status-flows/:id', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const dbManager: DatabaseManager = (indexer as any).dbManager;
    const dataSource = dbManager.getMetadataDataSource();
    const { WorkflowConfigManager } = await import('../../storage/WorkflowConfigManager.js');
    const manager = new WorkflowConfigManager(dataSource);
    await manager.deleteTaskStatusFlow(String(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update global workflow config (boolean flags etc.)
router.post('/workflows/config', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgr = new (await import('../../storage/WorkflowConfigManager.js')).WorkflowConfigManager(db);
    await mgr.initialize();
    const { updates } = req.body || {};
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'updates object required' });
    await mgr.updateGlobalConfig(updates);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get mapping task_type -> workflow
router.get('/workflows/mapping', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = (req as any).projectIndexer;
    if (!indexer) {
      return res.json({ map: {}, flow_map: {} });
    }
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgr = new (await import('../../storage/WorkflowConfigManager.js')).WorkflowConfigManager(db);
    await mgr.initialize();
    const cfg = await mgr.getGlobalConfig();
    let map: Record<string,string> = {};
    let flowMap: Record<string,string> = {};
    try { map = JSON.parse((cfg as any).defaults_by_task_type || '{}'); } catch {}
    try { flowMap = JSON.parse((cfg as any).status_flow_by_task_type || '{}'); } catch {}
    res.json({ map, flow_map: flowMap });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Set mapping task_type -> workflow (single or bulk)
router.post('/workflows/mapping', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgrModule = await import('../../storage/WorkflowConfigManager.js');
    const mgr = new mgrModule.WorkflowConfigManager(db);
    await mgr.initialize();
    const { task_type, workflow_name, map, flow_map, flow_id } = req.body || {};
    if (map && typeof map === 'object') {
      // Bulk: merge existing with provided
      const cfg = await mgr.getGlobalConfig();
      let existing: Record<string,string> = {};
      try { existing = JSON.parse((cfg as any).defaults_by_task_type || '{}'); } catch {}
      const merged = { ...existing, ...map };
      await mgr.updateGlobalConfig({ defaults_by_task_type: merged });
      return res.json({ ok: true });
    }
    if (flow_map && typeof flow_map === 'object') {
      const cfg = await mgr.getGlobalConfig();
      let existingFlow: Record<string,string> = {};
      try { existingFlow = JSON.parse((cfg as any).status_flow_by_task_type || '{}'); } catch {}
      const mergedFlow = { ...existingFlow };
      Object.entries(flow_map as Record<string, unknown>).forEach(([type, value]) => {
        if (!value) {
          delete mergedFlow[type];
        } else {
          mergedFlow[type] = String(value);
        }
      });
      await mgr.updateGlobalConfig({ status_flow_by_task_type: mergedFlow });
      return res.json({ ok: true });
    }
    if (!task_type || !workflow_name) return res.status(400).json({ error: 'task_type and workflow_name required' });
    await mgr.setWorkflowForTaskType(task_type, workflow_name);
    if (flow_id !== undefined) {
      await mgr.setStatusFlowForTaskType(task_type, flow_id);
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generic workflow action endpoint (for MCP-style actions like profile management)
router.post('/workflows/action', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = (req as any).projectIndexer;
    const { action, ...params } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action is required' });

    // Import the workflow handler from MCP
    const { handleWorkflowTools } = await import('../../mcp/workflow-handlers.js');
    const dbOrManager = indexer ? (indexer as any).dbManager : null;

    const result = await handleWorkflowTools({ action, project: req.projectPath || 'default', ...params }, dbOrManager);

    // Handle the MCP response format
    if (result?.payload) {
      return res.json(result.payload);
    }
    if (result?.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        try {
          return res.json(JSON.parse(textContent.text));
        } catch {
          return res.json({ message: textContent.text });
        }
      }
    }
    return res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get workflow by name (must be after specific /workflows/* routes)
router.get('/workflows/:name', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const wf = await indexer.getWorkflow(req.params.name);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    res.json(wf);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Reseed built-in workflows (optional force overwrite)
router.post('/workflows/registry/seed', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgr = new (await import('../../storage/WorkflowConfigManager.js')).WorkflowConfigManager(db);
    await mgr.initialize();
    await mgr.reseedBuiltIns(!!req.body?.force);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Phase 2 endpoints below (validate + scaffold)
router.post('/workflows/validate', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const db: DatabaseManager = (indexer as any).dbManager || DatabaseManager.getInstance((req.projectPath as any) || process.cwd());
    const svc = new WorkflowService(db);
    const { task, workflow } = req.body || {};
    if (!task) return res.status(400).json({ error: 'task is required' });
    // If a task id is provided, hydrate from DB so checklists/entity_links are present
    let taskForValidation = task;
    try {
      if (task && task.id) {
        const repo = db.getTasksRepository();
        const full = await repo.getTask(task.id);
        if (full) {
          taskForValidation = { ...full, ...task } as any; // request can override display fields
        }
      }
    } catch {}
    // If no explicit workflow, resolve via mapping/default. Honor session header if present.
    const sessionWf = (req.headers['x-workflow-name'] as string) || undefined;
    const wfName = await svc.resolveWorkflowName((taskForValidation as any).task_type, workflow || sessionWf);
    const result = await svc.validate(taskForValidation, wfName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/workflows/:name/scaffold', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const { task_id, dry_run = true, sections, stubs } = req.body || {};
    if (!task_id) return res.status(400).json({ error: 'task_id is required' });
    const db: DatabaseManager = (indexer as any).dbManager || DatabaseManager.getInstance((req.projectPath as any) || process.cwd());
    const svc = new WorkflowScaffoldingService(db);
    const result = await svc.scaffoldMissing(task_id, req.params.name, { dryRun: !!dry_run, sections, stubs });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// AI Guidance pack for a workflow
router.post('/workflows/:name/guide', async (req: ProjectRequest, res: any) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const db: DatabaseManager = (indexer as any).dbManager || DatabaseManager.getInstance((req.projectPath as any) || process.cwd());
    const svc = new GuidanceService(db);
    const body = req.body || {};
    let task = body.task;
    if (!task && body.task_id) {
      task = await (indexer as any).taskManagementService.getTask(body.task_id);
    }
    if (!task) return res.status(400).json({ error: 'task or task_id required' });
    const guidance = await svc.build(task);
    res.json({ guidance });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
