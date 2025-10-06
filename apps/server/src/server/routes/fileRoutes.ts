/**
 * File API Routes - Basic file operations
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { getCurrentProject } from './projectContext.js';
import { logger } from '../../shared/logger.js';

const router = express.Router();

// List files in a directory
router.get('/list', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const dirPath = req.query.path || '.';
    const fullPath = path.join(currentProject, dirPath);
    
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      path: path.join(dirPath, entry.name)
    }));
    
    res.json(files);
  } catch (error) {
    logger.error('Failed to list files:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Read file content
router.get('/read', async (req: any, res: any) => {
  try {
    const currentProject = getCurrentProject();
    if (!currentProject) {
      return res.status(400).json({ error: 'No project selected' });
    }

    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'path parameter required' });
    }
    
    const fullPath = path.join(currentProject, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    res.json({ content, path: filePath });
  } catch (error) {
    logger.error('Failed to read file:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
