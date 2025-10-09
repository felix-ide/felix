/**
 * Tasks API Routes - COPIED from web-ui/server.js
 */

import express from 'express';
import { getProjectIndexer, getCurrentProject } from './projectContext.js';
import { TaskType, TaskStatus } from '@felix/code-intelligence';
import { EntityType } from '@felix/code-intelligence';
import { logger } from '../../shared/logger.js';
import { TransitionGateError } from '../../features/workflows/errors/TransitionGateError.js';

const router = express.Router();

// Tasks APIs - Using CodeIndexer methods (COPIED from web-ui/server.js)
router.get('/tasks', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({
        error: 'No project selected. Please set a project first using: mcp set-project <path>',
        tasks: [],
        total: 0
      });
    }

    const { parent_id, entity_type, entity_id, task_status, task_type, include_children, limit = 20 } = req.query;
    const indexer = await getProjectIndexer(currentProject);
    
    const tasks = await indexer.listTasks({
      parent_id: parent_id as string | undefined,
      entity_type: entity_type as EntityType | undefined,
      entity_id: entity_id as string | undefined,
      task_status: task_status as TaskStatus | undefined,
      task_type: task_type as TaskType | undefined,
      include_children: include_children === 'true',
      limit: parseInt(limit as string)
    });
    
    // Debug logging to check entity_links format
    logger.debug('Tasks API returning tasks', { count: tasks.length });
    if (tasks.length > 0) {
      logger.debug('Tasks API sample entity_links', {
        entity_links: tasks[0].entity_links,
        type: typeof tasks[0].entity_links
      });
    }
    
    res.json({ 
      items: tasks, 
      total: tasks.length,
      tasks,  // Keep for backward compatibility
      hasMore: false,
      offset: 0,
      limit: parseInt(limit as string)
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/tasks', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { 
      title, 
      description, 
      parent_id, 
      task_type = 'task',
      task_priority = 'medium',
      estimated_effort,
      due_date,
      entity_type,
      entity_id,
      entity_links,
      stable_tags = [],
      checklists = [],
      workflow,
      include_guidance
    } = req.body;

    logger.debug('Creating task', { entity_links, body: req.body });
    
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const indexer = await getProjectIndexer(currentProject);
    
    const task = await indexer.addTask({
      title,
      description,
      parent_id,
      task_type,
      task_priority,
      estimated_effort,
      due_date: due_date ? new Date(due_date) : undefined,
      entity_links,
      stable_tags,
      checklists,
      workflow
    });
    // Return guidance by default unless explicitly disabled
    const wantGuidance = include_guidance !== false && String(req.query.include_guidance || '').toLowerCase() !== 'false';
    if (wantGuidance) {
      const db: any = (indexer as any).dbManager;
      const { GuidanceService } = await import('../../features/workflows/services/GuidanceService.js');
      const svc = new GuidanceService(db);
      const guidance = await svc.build(task as any);
      res.json({ task, guidance });
      return;
    }
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/tasks/suggestions', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({
        error: 'No project selected. Please set a project first using: mcp set-project <path>',
        tasks: []
      });
    }

    const { assignee, context, limit = 10 } = req.query;
    const indexer = await getProjectIndexer(currentProject);
    
    const suggestedTasks = await indexer.getSuggestedTasks(parseInt(limit as string));
    
    res.json({ tasks: suggestedTasks });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// List all task dependencies - MUST come before /tasks/:id to avoid route conflict
router.get('/tasks/dependencies', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({
        error: 'No project selected. Please set a project first using: mcp set-project <path>',
        dependencies: []
      });
    }

    const indexer = await getProjectIndexer(currentProject);
    const allDependencies = await indexer.listTaskDependencies();
    res.json({ dependencies: allDependencies });
  } catch (error) {
    logger.error('Error fetching all dependencies:', error);
    res.json({ dependencies: [] });
  }
});

router.get('/tasks/tree', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({
        error: 'No project selected. Please set a project first using: mcp set-project <path>',
        task_tree: []
      });
    }

    const { root_task_id, max_depth = 5, include_completed = true } = req.query;
    const indexer = await getProjectIndexer(currentProject);
    
    const taskTree = await indexer.getTaskTree(root_task_id, include_completed !== 'false');
    
    res.json({ task_tree: taskTree });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/tasks/:id', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { id: task_id } = req.params;
    
    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const indexer = await getProjectIndexer(currentProject);
    const task = await indexer.getTask(task_id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ task });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Spec bundle: compact, self-contained spec pack for a task
router.get('/tasks/:id/spec-bundle', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) return res.status(400).json({ error: 'No project set' });

    const { id } = req.params;
    const compact = String(req.query.compact || '1').toLowerCase() !== 'false';
    const indexer = await getProjectIndexer(currentProject);

    const task = await indexer.getTask(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Collect notes linked to this task (reverse links)
    const reverseNotes = await indexer.listNotes({ entity_type: 'task' as any, entity_id: id, limit: 200 } as any);
    const noteMap: Record<string, any> = {};
    for (const n of reverseNotes) noteMap[n.id] = n;

    // Also include notes directly linked via task.entity_links
    const directNoteIds = ((task as any).entity_links || [])
      .filter((l: any) => (l.entity_type as string) === 'note')
      .map((l: any) => String(l.entity_id));
    for (const nid of directNoteIds) {
      if (!noteMap[nid]) {
        const n = await indexer.getNote(nid);
        if (n) noteMap[n.id] = n;
      }
    }

    const notes = Object.values(noteMap);
    const CONTENT_LIMIT = 2000; // chars for compact mode
    const compactNotes = notes.map((n: any) => {
      const base = {
        id: n.id,
        title: n.title,
        note_type: n.note_type,
        stable_tags: n.stable_tags,
        entity_links: n.entity_links
      } as any;
      const content: string = n.content || '';
      if (!compact) return { ...base, content };
      if (content && content.length <= CONTENT_LIMIT) return { ...base, content };
      return {
        ...base,
        content_excerpt: content ? content.slice(0, CONTENT_LIMIT) : '',
        content_size: content ? content.length : 0
      };
    });

    // Subtasks (direct children only for compactness)
    const subtasksResult = await indexer.listTasks({ parent_id: id } as any);
    const subtasks = (subtasksResult || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      task_type: t.task_type,
      task_status: t.task_status,
      spec_state: (t as any).spec_state || 'draft'
    }));

    // Validation summary and guidance
    const db: any = (indexer as any).dbManager;
    const { WorkflowService } = await import('../../features/workflows/services/WorkflowService.js');
    const wfSvc = new WorkflowService(db);
    const validation = await wfSvc.validate(task as any, (task as any).workflow);

    const { GuidanceService } = await import('../../features/workflows/services/GuidanceService.js');
    const gsvc = new GuidanceService(db);
    const guidance = await gsvc.build(task as any);

    const bundle = {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        task_status: task.task_status,
        task_priority: task.task_priority,
        workflow: (task as any).workflow,
        spec_state: (task as any).spec_state || 'draft',
        stable_tags: (task as any).stable_tags,
        entity_links: (task as any).entity_links,
        checklists: (task as any).checklists || []
      },
      notes: compactNotes,
      subtasks,
      waivers: (task as any).spec_waivers || [],
      validation,
      guidance
    };

    res.json({ bundle, compact });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
router.put('/tasks/:id', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { id: task_id } = req.params;
    const { 
      title, 
      description, 
      task_status, 
      task_priority,
      task_type,
      assigned_to,
      estimated_effort, 
      actual_effort, 
      due_date, 
      stable_tags,
      entity_links,
      parent_id,
      sort_order,
      checklists,
      transition_gate_token,
      transition_gate_response
    } = req.body;
    
    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const indexer = await getProjectIndexer(currentProject);
    
    let updatedTask;
    try {
      updatedTask = await indexer.updateTask(task_id, {
        title,
        description,
        task_status,
        task_priority,
        task_type,
        assigned_to,
        estimated_effort,
        actual_effort,
        due_date: due_date ? new Date(due_date) : undefined,
        stable_tags,
        entity_links,
        parent_id,
        sort_order,
        checklists,
        workflow: (req.body as any).workflow,
        spec_state: (req.body as any).spec_state,
        spec_waivers: (req.body as any).spec_waivers,
        last_validated_at: (req.body as any).last_validated_at,
        validated_by: (req.body as any).validated_by,
        transition_gate_token,
        transition_gate_response
      } as any);
    } catch (error) {
      if (error instanceof TransitionGateError) {
        return res.status(409).json({ error: error.message, gate: error.details });
      }
      throw error;
    }
    
    logger.debug('Updated task object', { updatedTask, checklists: updatedTask.checklists });

    const wantGuidance = String(req.query.include_guidance || 'true').toLowerCase() !== 'false';
    if (wantGuidance) {
      const { GuidanceService } = await import('../../features/workflows/services/GuidanceService.js');
      const svc = new GuidanceService((indexer as any).dbManager);
      const guidance = await svc.build(updatedTask as any);
      return res.json({ task: updatedTask, guidance });
    }
    res.json({ task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Spec-state transition endpoint (guarded)
router.post('/tasks/:id/spec-state', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) return res.status(400).json({ error: 'No project set' });
    const { id } = req.params;
    const { next, actor } = req.body || {};
    if (!next) return res.status(400).json({ error: 'next is required' });
    if (!['draft','spec_in_progress','spec_ready'].includes(next)) {
      return res.status(400).json({ error: 'invalid next spec_state' });
    }
    const indexer = await getProjectIndexer(currentProject);
    const db: any = (indexer as any).dbManager;
    const { TaskManagementService } = await import('../../features/metadata/services/TaskManagementService.js');
    const svc = new TaskManagementService(db, (indexer as any).embeddingService);
    const updated = await svc.setSpecState(id, next, actor);
    res.json({ task: updated });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.delete('/tasks/:id', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { id: task_id } = req.params;
    
    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const indexer = await getProjectIndexer(currentProject);
    
    await indexer.deleteTask(task_id);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/tasks/tree', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({
        error: 'No project selected. Please set a project first using: mcp set-project <path>',
        task_tree: []
      });
    }

    const { root_task_id, max_depth = 5, include_completed = true } = req.query;
    const indexer = await getProjectIndexer(currentProject);
    
    const taskTree = await indexer.getTaskTree(root_task_id, include_completed !== 'false');
    
    res.json({ task_tree: taskTree });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Task dependencies endpoints
router.get('/tasks/:id/dependencies', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { id: task_id } = req.params;
    const indexer = await getProjectIndexer(currentProject);
    
    // Get dependencies using the indexer method
    const outgoingDeps = await indexer.getTaskDependencies(task_id, 'outgoing');
    const incomingDeps = await indexer.getTaskDependencies(task_id, 'incoming');
    
    // Enhance with task names
    const enhanceDeps = async (deps: any[]) => {
      return Promise.all(deps.map(async (dep) => {
        try {
          const dependentTask = await indexer.getTask(dep.dependent_task_id);
          const dependencyTask = await indexer.getTask(dep.dependency_task_id);
          return {
            ...dep,
            dependent_task_name: dependentTask?.title,
            dependency_task_name: dependencyTask?.title
          };
        } catch (e) {
          return dep;
        }
      }));
    };
    
    res.json({
      incoming: await enhanceDeps(incomingDeps),
      outgoing: await enhanceDeps(outgoingDeps)
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/tasks/:id/dependencies', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { id: dependent_task_id } = req.params;
    const { dependency_task_id, dependency_type = 'blocks', required = true } = req.body;
    
    if (!dependency_task_id) {
      return res.status(400).json({ error: 'dependency_task_id is required' });
    }
    
    const indexer = await getProjectIndexer(currentProject);
    
    logger.debug('Creating dependency', { dependent_task_id, dependency_task_id, dependency_type, required });
    
    // Use the indexer's addTaskDependency method
    const dependency = await indexer.addTaskDependency({
      dependent_task_id,
      dependency_task_id,
      dependency_type,
      required
    });
    
    logger.debug('Dependency created', dependency);
    res.json({ success: true, dependency });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/tasks/:id/dependencies/:depId', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { depId: dependency_id } = req.params;
    
    const indexer = await getProjectIndexer(currentProject);
    await indexer.removeTaskDependency(dependency_id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export/Import endpoints
router.post('/tasks/export', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const indexer = await getProjectIndexer(currentProject);
    const exportData = await indexer.exportTasks(req.body);
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/tasks/import', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { data, options } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Import data is required' });
    }

    const indexer = await getProjectIndexer(currentProject);
    const result = await indexer.importTasks(data, options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Suggest next tasks endpoint (support both GET and POST)
router.post('/tasks/suggest-next', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { context, assignee, limit = 5 } = req.body;
    const indexer = await getProjectIndexer(currentProject);
    
    const suggestions = await indexer.suggestNextTasks({
      context: context as string,
      assignee: assignee as string,
      limit: parseInt(limit as string)
    });
    
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Also support GET for suggest
router.get('/tasks/suggest', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { context, assignee, limit = 5 } = req.query;
    const indexer = await getProjectIndexer(currentProject);
    
    const suggestions = await indexer.suggestNextTasks({
      context: context as string,
      assignee: assignee as string,
      limit: parseInt(limit as string)
    });
    
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Checklist endpoints
router.get('/tasks/:id/checklists', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { id: task_id } = req.params;
    const indexer = await getProjectIndexer(currentProject);
    
    const task = await indexer.getTask(task_id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ checklists: task.checklists || [] });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/tasks/:id/checklists', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { id: task_id } = req.params;
    const { name, items } = req.body;
    
    if (!name || !items) {
      return res.status(400).json({ error: 'name and items are required' });
    }
    
    const indexer = await getProjectIndexer(currentProject);
    await indexer.addChecklist(task_id, { name, items });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/tasks/:id/checklists/:checklistName/toggle', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project set' });
    }

    const { id: task_id, checklistName } = req.params;
    const { item_index, item_text } = req.body;
    
    const indexer = await getProjectIndexer(currentProject);
    await indexer.toggleChecklistItem(task_id, checklistName, item_index || item_text);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
