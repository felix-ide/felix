/**
 * MCP Types exports
 */

// Re-export common types for convenience
export type { 
  CreateNoteParams, 
  UpdateNoteParams, 
  NoteSearchCriteria,
  INote,
  NoteType
} from '@felix/code-intelligence';

export type {
  CreateTaskParams,
  UpdateTaskParams,
  TaskSearchCriteria,
  ITask,
  TaskType,
  TaskStatus,
  TaskPriority
} from '@felix/code-intelligence';

export type {
  CreateRuleParams,
  IRule,
  RuleType,
  RuleApplicationContext
} from '@felix/code-intelligence';

export type {
  CreateDependencyParams,
  IDependency
} from '@felix/code-intelligence';

// No service types - using direct storage adapter access