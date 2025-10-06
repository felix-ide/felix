/**
 * Logging middleware for MCP requests
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Log all incoming requests
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Log basic request info
  console.error(`[${timestamp}] ${method} ${url} - ${userAgent}`);
  
  // Log session info for MCP requests
  if (req.query.sessionId) {
    console.error(`  Session: ${req.query.sessionId}`);
  }
  
  // Log request body for tool calls (but limit size)
  if (method === 'POST' && url.includes('/messages')) {
    // Don't log the full body here to avoid blocking - let the handlers log relevant parts
  }
  
  next();
}