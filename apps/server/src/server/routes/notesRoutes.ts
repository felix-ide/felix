/**
 * Notes API Routes - Stateless with project resolution
 */

import express from 'express';
import { NoteType, EntityType } from '@felix/code-intelligence';
import { processExcalidrawContent } from '../../utils/excalidraw-validator.js';
import { resolveProject, requireProjectIndexer, type ProjectRequest } from '../middleware/projectMiddleware.js';
import type { Response } from 'express';

const router = express.Router();

// Apply project resolution middleware to all routes
router.use(resolveProject);

// Notes APIs - Using CodeIndexer methods (stateless)
router.get('/notes', async (req: ProjectRequest, res: Response) => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;

    const { note_type, tags, linkedToTask, limit = 20, exclude_kb } = req.query;

    let notes = await indexer.listNotes({
      note_type: note_type as NoteType | undefined,
      tags: tags as string[] | undefined,
      limit: parseInt(limit as string)
    });

    // Filter notes that are linked to a specific task via entity_links
    if (linkedToTask) {
      notes = notes.filter((note: any) =>
        note.entity_links?.some((link: any) =>
          link.entity_type === 'task' && link.entity_id === linkedToTask
        )
      );
    }

    // Filter out KB nodes if requested
    if (exclude_kb === 'true') {
      notes = notes.filter((note: any) =>
        !(note.metadata && note.metadata.kb_node === true)
      );
    }

    res.json({
      items: notes,
      notes,  // Keep for backward compatibility
      total: notes.length,
      hasMore: false,
      offset: 0,
      limit: parseInt(limit as string)
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/notes/:id', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { id: note_id } = req.params;
    
    if (!note_id) {
      res.status(400).json({ error: 'Note ID is required' });
      return;
    }
    
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const note = await indexer.getNote(note_id);
    
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    
    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/notes', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { title, content, note_type = 'note', entity_links, stable_tags = [], parent_id } = req.body;
    
    if (!content) {
      res.status(400).json({ error: 'Note content is required' });
      return;
    }

    // Process and validate excalidraw content
    const { processedContent, isValid, error } = processExcalidrawContent(content, note_type);
    
    if (note_type === 'excalidraw' && !isValid) {
      res.status(400).json({ 
        error: error,
        hint: 'Excalidraw content must be valid JSON with type="excalidraw", version, and elements array' 
      });
      return;
    }

    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    const note = await indexer.addNote({
      title,
      content: processedContent,
      note_type,
      entity_links: entity_links || [],
      stable_tags,
      parent_id
    });

    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.put('/notes/:id', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { id: note_id } = req.params;
    const { title, content, note_type, entity_links, stable_tags, parent_id, sort_order } = req.body;
    
    if (!note_id) {
      res.status(400).json({ error: 'Note ID is required' });
      return;
    }
    
    let processedContent = content;
    
    // If content is provided and note_type is excalidraw, validate it
    if (content && note_type === 'excalidraw') {
      const result = processExcalidrawContent(content, note_type);
      if (!result.isValid) {
        res.status(400).json({ 
          error: result.error,
          hint: 'Excalidraw content must be valid JSON with type="excalidraw", version, and elements array' 
        });
        return;
      }
      processedContent = result.processedContent;
    }
    
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    await indexer.updateNote(note_id, {
      title,
      content: processedContent,
      note_type,
      entity_links,
      stable_tags,
      parent_id,
      sort_order
    });
    
    // Get the updated note to return it
    const updatedNote = await indexer.getNote(note_id);
    
    res.json({ note: updatedNote });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.delete('/notes/:id', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { id: note_id } = req.params;
    
    if (!note_id) {
      res.status(400).json({ error: 'Note ID is required' });
      return;
    }
    
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    
    await indexer.deleteNote(note_id);
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/notes/tree', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const indexer = req.projectIndexer;
    if (!indexer) {
      res.status(400).json({
        error: 'No project selected. Please set a project first using: mcp set-project <path>',
        note_tree: []
      });
      return;
    }

    const { root_note_id, include_all = true } = req.query;
    
    const noteTree = await indexer.getNoteTree(root_note_id, include_all !== 'false');
    
    res.json({ note_tree: noteTree });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export/Import endpoints
router.post('/notes/export', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const exportData = await indexer.exportNotes(req.body);
    
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/notes/import', async (req: ProjectRequest, res: Response): Promise<void> => {
  try {
    const { data, options } = req.body;
    if (!data) {
      res.status(400).json({ error: 'Import data is required' });
      return;
    }

    const indexer = requireProjectIndexer(req, res);
    if (!indexer) return;
    const result = await indexer.importNotes(data, options);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
