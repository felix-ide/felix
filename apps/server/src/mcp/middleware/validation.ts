/**
 * Validation middleware for MCP requests
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Basic request validation middleware
 */
export function validationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // For POST requests to /messages, ensure we have a session ID
  if (req.method === 'POST' && req.url.includes('/messages')) {
    const sessionId = req.query.sessionId as string;
    
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      res.status(400).json({
        error: 'Missing or invalid sessionId parameter'
      });
      return;
    }
    
    // Validate sessionId format (basic check)
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
      res.status(400).json({
        error: 'Invalid sessionId format'
      });
      return;
    }
  }
  
  // Add content type validation for POST requests
  if (req.method === 'POST' && req.url.includes('/messages')) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      // MCP might use different content types, so just log warning
      console.warn(`Warning: Unexpected content type: ${contentType}`);
    }
  }
  
  next();
}