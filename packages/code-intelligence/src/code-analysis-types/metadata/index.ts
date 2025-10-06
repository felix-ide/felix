/**
 * Metadata models module - Models for tasks, notes, and rules
 */

// Export all metadata models
export * from './Note.js';
export * from './Task.js';
export * from './Rule.js';

// Export dependency interfaces (avoiding conflicts)
export type { IDependency } from './Dependency.js';

// Export triggers
export * from './triggers/index.js';