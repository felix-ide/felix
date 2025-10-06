/**
 * Re-export core types from @felix/code-analysis-types
 * This ensures the code-parser uses the shared type definitions
 */

// Re-export all core types except those that are parser-specific
export {
  // Core types
  ComponentType,
  RelationshipType,
  Location,
  ScopeContext,
  Parameter,

  // Interfaces
  IComponent,
  IRelationship,

  // Component types
  IFileComponent,
  IClassComponent,
  IFunctionComponent,
  IMethodComponent,

  // Search criteria
  ComponentSearchCriteria,
  RelationshipSearchCriteria,

  // Metadata types
  INote,
  ITask,
  IRule,
  CreateNoteParams,
  UpdateNoteParams,
  NoteSearchCriteria,
  CreateTaskParams,
  UpdateTaskParams,
  TaskSearchCriteria,
  CreateRuleParams,
  RuleApplicationContext,
  ApplicableRule,

  // Utilities
  NoteUtils,
  TaskUtils,
  RuleUtils
} from '../code-analysis-types/index.js';

// Import and re-export ParseResult, ParseError, ParseWarning directly from interfaces
export { ParseResult, ParseError, ParseWarning } from '../code-analysis-types/entities/interfaces.js';
