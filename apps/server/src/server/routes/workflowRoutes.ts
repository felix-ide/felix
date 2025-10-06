import express from 'express';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';
import { BUILT_IN_WORKFLOWS } from '../../validation/WorkflowDefinitions.js';
import { WorkflowService } from '../../features/workflows/services/WorkflowService.js';
import { WorkflowScaffoldingService } from '../../features/workflows/services/WorkflowScaffoldingService.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import { GuidanceService } from '../../features/workflows/services/GuidanceService.js';

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

export default router;
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
      return res.json({ map: {} });
    }
    const db: any = (indexer as any).dbManager.getMetadataDataSource();
    const mgr = new (await import('../../storage/WorkflowConfigManager.js')).WorkflowConfigManager(db);
    await mgr.initialize();
    const cfg = await mgr.getGlobalConfig();
    let map: Record<string,string> = {};
    try { map = JSON.parse((cfg as any).defaults_by_task_type || '{}'); } catch {}
    res.json({ map });
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
    const { task_type, workflow_name, map } = req.body || {};
    if (map && typeof map === 'object') {
      // Bulk: merge existing with provided
      const cfg = await mgr.getGlobalConfig();
      let existing: Record<string,string> = {};
      try { existing = JSON.parse((cfg as any).defaults_by_task_type || '{}'); } catch {}
      const merged = { ...existing, ...map };
      await mgrModule.WorkflowConfigManager.prototype.updateGlobalConfig.call(mgr, { defaults_by_task_type: JSON.stringify(merged) } as any);
      return res.json({ ok: true });
    }
    if (!task_type || !workflow_name) return res.status(400).json({ error: 'task_type and workflow_name required' });
    await mgr.setWorkflowForTaskType(task_type, workflow_name);
    res.json({ ok: true });
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
