/**
 * Knowledge Base API Routes
 */

import express from 'express';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';
import { KBBuilder } from '../../features/knowledge-base/KBBuilder.js';
import { DatabaseManager } from '../../features/storage/DatabaseManager.js';
import { PROJECT_KB_STRUCTURE } from '../../features/knowledge-base/templates/project-kb-structure.js';
import type { Response } from 'express';

const router = express.Router();

// Apply project resolution middleware to all routes
router.use(resolveProject);

/**
 * Create a KB from template
 */
router.post('/kb/create-from-template', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { template_name, custom_name, parent_id, kb_config } = req.body;
    const projectPath = req.projectPath;

    if (!template_name) {
      res.status(400).json({ error: 'template_name is required' });
      return;
    }

    if (!projectPath) {
      res.status(400).json({ error: 'project_path is required' });
      return;
    }

    // Get database connection and create KB builder
    const dbManager = DatabaseManager.getInstance(projectPath);
    await dbManager.initialize();
    const notesRepo = dbManager.getNotesRepository();
    const rulesRepo = dbManager.getRulesRepository();
    const metadataDataSource = dbManager.getMetadataDataSource();
    const kbBuilder = new KBBuilder(notesRepo, rulesRepo, metadataDataSource);

    // Check if trying to create a Project KB and one already exists
    if (template_name === 'project') {
      const allNotes = await notesRepo.searchNotes({
        limit: 100,
        offset: 0,
        note_type: 'documentation' as any
      });

      const existingProjectKB = allNotes.items.find((note: any) =>
        note.metadata?.is_project_kb === true
      );

      if (existingProjectKB) {
        res.status(400).json({
          success: false,
          error: 'A Project Knowledge Base already exists for this project',
          existing_kb_id: existingProjectKB.id,
          existing_kb_title: existingProjectKB.title
        });
        return;
      }
    }

    // Build KB from template with optional custom name and config
    const result = await kbBuilder.buildFromTemplate(
      projectPath,
      template_name,
      parent_id,
      custom_name,
      kb_config
    );

    res.json({
      success: true,
      root_id: result.rootId,
      created_nodes: result.createdNodes,
      message: `Successfully created ${result.createdNodes} KB nodes`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get KB structure tree
 */
router.get('/kb/structure', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { kb_id } = req.query;
    const projectPath = req.projectPath;

    if (!kb_id) {
      res.status(400).json({ error: 'kb_id is required' });
      return;
    }

    if (!projectPath) {
      res.status(400).json({ error: 'project_path is required' });
      return;
    }

    // Get database connection and create KB builder
    const dbManager = DatabaseManager.getInstance(projectPath);
    await dbManager.initialize();
    const notesRepo = dbManager.getNotesRepository();
    const rulesRepo = dbManager.getRulesRepository();
    const metadataDataSource = dbManager.getMetadataDataSource();
    const kbBuilder = new KBBuilder(notesRepo, rulesRepo, metadataDataSource);

    // Get KB tree
    const tree = await kbBuilder.getKBTree(
      projectPath,
      kb_id as string
    );

    res.json({
      success: true,
      structure: tree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * List available KB templates
 */
router.get('/kb/templates', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    // For now, just return the project template
    // This can be expanded to support more templates later
    const template = PROJECT_KB_STRUCTURE;
    const sections = template.root.children?.map(child => child.title) || [];

    res.json({
      success: true,
      templates: [
        {
          name: 'project',
          display_name: template.name,
          description: template.description,
          version: template.version,
          sections,
          config_schema: template.configSchema || []
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Create a new child KB node under a parent
 */
router.post('/kb/node', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { parent_id, title, content } = req.body;
    const projectPath = req.projectPath;

    if (!parent_id) {
      res.status(400).json({ error: 'parent_id is required' });
      return;
    }

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    if (!projectPath) {
      res.status(400).json({ error: 'project_path is required' });
      return;
    }

    // Get database connection
    const dbManager = DatabaseManager.getInstance(projectPath);
    await dbManager.initialize();
    const notesRepo = dbManager.getNotesRepository();

    // Get parent to inherit KB metadata
    const parent = await notesRepo.getNote(parent_id);
    if (!parent) {
      res.status(404).json({ error: 'Parent node not found' });
      return;
    }

    // Create the new child node with KB metadata
    const result = await notesRepo.createNote({
      title,
      content: content || '',
      parent_id,
      note_type: 'documentation',
      metadata: {
        kb_node: true,
        kb_type: parent.metadata?.kb_type,
        template_name: parent.metadata?.template_name,
        template_version: parent.metadata?.template_version,
        project_path: projectPath
      },
      stable_tags: []
    });

    if (!result.success || !result.data) {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to create KB node'
      });
      return;
    }

    res.json({
      success: true,
      node_id: result.data.id,
      message: 'KB node created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Update a KB node (title and/or content)
 */
router.put('/kb/node/:nodeId', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { nodeId } = req.params;
    const { title, content } = req.body;
    const projectPath = req.projectPath;

    if (!nodeId) {
      res.status(400).json({ error: 'nodeId is required' });
      return;
    }

    if (!projectPath) {
      res.status(400).json({ error: 'project_path is required' });
      return;
    }

    if (title === undefined && content === undefined) {
      res.status(400).json({ error: 'Either title or content must be provided' });
      return;
    }

    // Get database connection
    const dbManager = DatabaseManager.getInstance(projectPath);
    await dbManager.initialize();
    const notesRepo = dbManager.getNotesRepository();

    // Update the note
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;

    const result = await notesRepo.updateNote(nodeId, updates);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to update KB node'
      });
      return;
    }

    res.json({
      success: true,
      message: 'KB node updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Update KB configuration and regenerate template rules
 */
router.put('/kb/:kbId/config', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { kbId } = req.params;
    const { config } = req.body;
    const projectPath = req.projectPath;

    if (!kbId) {
      res.status(400).json({ error: 'kbId is required' });
      return;
    }

    if (!config) {
      res.status(400).json({ error: 'config is required' });
      return;
    }

    if (!projectPath) {
      res.status(400).json({ error: 'project_path is required' });
      return;
    }

    // Get database connection
    const dbManager = DatabaseManager.getInstance(projectPath);
    await dbManager.initialize();
    const notesRepo = dbManager.getNotesRepository();
    const rulesRepo = dbManager.getRulesRepository();

    // Get the KB root node
    const kbNote = await notesRepo.getNote(kbId);
    if (!kbNote) {
      res.status(404).json({ error: 'KB not found' });
      return;
    }

    if (!kbNote.metadata?.is_kb_root) {
      res.status(400).json({ error: 'Note is not a KB root' });
      return;
    }

    // Update KB metadata with new config
    const result = await notesRepo.updateNote(kbId, {
      metadata: {
        ...kbNote.metadata,
        kb_config: config
      }
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to update KB config'
      });
      return;
    }

    // Update template rules with new config
    const rulesRepo2 = dbManager.getRulesRepository();
    const metadataDataSource = dbManager.getMetadataDataSource();
    const kbBuilder = new KBBuilder(notesRepo, rulesRepo2, metadataDataSource);
    const updatedRules = await kbBuilder.updateTemplateRules(projectPath, kbNote.metadata.kb_type, config);

    res.json({
      success: true,
      updated_rules: updatedRules,
      message: `Updated KB configuration and ${updatedRules} rules`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * Get KB nodes by metadata (find all KB roots or specific types)
 */
router.get('/kb/list', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const projectPath = req.projectPath;
    const { kb_type } = req.query;

    if (!projectPath) {
      res.status(400).json({ error: 'project_path is required' });
      return;
    }

    const dbManager = DatabaseManager.getInstance(projectPath);
    await dbManager.initialize();
    const notesRepo = dbManager.getNotesRepository();

    // Search for notes with KB metadata
    const result = await notesRepo.searchNotes({
      limit: 100,
      offset: 0,
      // We'll need to search by metadata content, which might require custom query
      // For now, get all documentation notes and filter
      note_type: 'documentation' as any
    });

    // Filter for KB roots
    const kbRoots = result.items.filter((note: any) =>
      note.metadata?.is_kb_root === true &&
      (!kb_type || note.metadata?.kb_type === kb_type)
    );

    res.json({
      success: true,
      knowledge_bases: kbRoots.map((note: any) => ({
        id: note.id,
        title: note.title,
        kb_type: note.metadata?.kb_type,
        template_name: note.metadata?.template_name,
        template_version: note.metadata?.template_version,
        created_at: note.created_at,
        is_project_kb: note.metadata?.is_project_kb || false
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;