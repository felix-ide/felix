/**
 * Error handling middleware for MCP server
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/logger.js';

/**
 * Global error handler
 */
export function errorHandlingMiddleware(err: any, req: Request, res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const sessionId = req.query.sessionId;
  
  // Log the error
  logger.error(`[${timestamp}] ERROR in ${method} ${url}:`);
  logger.error(`  Session: ${sessionId || 'none'}`);
  logger.error(`  Error: ${err.message || err}`);

  if (err.stack) {
    logger.error(`  Stack: ${err.stack}`);
  }
  
  // Don't send error details in production, but for development it's helpful
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Handle different types of errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation failed',
      details: isDevelopment ? err.message : undefined
    });
  } else if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      error: 'Unauthorized',
      details: isDevelopment ? err.message : undefined
    });
  } else if (err.code === 'ENOENT') {
    res.status(404).json({
      error: 'Resource not found',
      details: isDevelopment ? err.message : undefined
    });
  } else if (err.code === 'EACCES') {
    res.status(403).json({
      error: 'Access denied',
      details: isDevelopment ? err.message : undefined
    });
  } else {
    // Generic server error
    res.status(500).json({
      error: 'Internal server error',
      details: isDevelopment ? err.message : 'An unexpected error occurred'
    });
  }
}

/**
 * Async error wrapper for route handlers
 */
export function asyncErrorHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
}
