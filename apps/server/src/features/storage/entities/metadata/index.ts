/**
 * Metadata Database Entities
 * Export all entities for the metadata database
 */

export { Task } from './Task.entity.js';
export type { EntityLink, Checklist, ChecklistItem } from './Task.entity.js';

export { Note } from './Note.entity.js';

export { Rule } from './Rule.entity.js';
export type { TriggerPattern, SemanticTrigger } from './Rule.entity.js';

export { TaskDependency } from './TaskDependency.entity.js';
export { TaskCodeLink } from './TaskCodeLink.entity.js';
export { TaskMetric } from './TaskMetric.entity.js';

export { RuleRelationship } from './RuleRelationship.entity.js';
export { RuleApplication } from './RuleApplication.entity.js';

export { WorkflowConfiguration } from './WorkflowConfiguration.entity.js';
export type { RequiredSection, ConditionalRequirement, ValidationRule } from './WorkflowConfiguration.entity.js';

export { GlobalWorkflowSetting } from './GlobalWorkflowSetting.entity.js';
export { TransitionGate } from './TransitionGate.entity.js';
export { TaskStatus } from './TaskStatus.entity.js';
export { TaskStatusFlow } from './TaskStatusFlow.entity.js';

// Array of all metadata entities for DataSource configuration
export const METADATA_ENTITIES = [
  'Task',
  'Note', 
  'Rule',
  'TaskDependency',
  'TaskCodeLink',
  'TaskMetric',
  'RuleRelationship',
  'RuleApplication',
  'WorkflowConfiguration',
  'GlobalWorkflowSetting',
  'TransitionGate',
  'TaskStatus',
  'TaskStatusFlow'
];
