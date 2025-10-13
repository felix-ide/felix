import { ITask, TaskUtils } from '@felix/code-intelligence';
import { logger } from '../../../../shared/logger.js';

export type TaskDbRecord = ITask & {
  checklists?: any;
  stable_links?: any;
  fragile_links?: any;
  stable_tags?: any;
  auto_tags?: any;
  contextual_tags?: any;
  sort_order?: number;
  depth_level?: number;
  workflow?: any;
  spec_state?: string;
  spec_waivers?: any;
  last_validated_at?: any;
  validated_by?: any;
};

export function toDbRowWithChecklists(task: ITask & { checklists?: any }): TaskDbRecord {
  // Don't use TaskUtils.toDbRow - TypeORM's simple-json handles JSON serialization
  // Fix double-stringified data from old format by parsing strings back to objects
  const parseIfString = (value: any) => typeof value === 'string' ? JSON.parse(value) : value;

  return {
    ...task,
    entity_links: task.entity_links ? parseIfString(task.entity_links) : undefined,
    stable_links: (task as any).stable_links ? parseIfString((task as any).stable_links) : undefined,
    fragile_links: (task as any).fragile_links ? parseIfString((task as any).fragile_links) : undefined,
    stable_tags: (task as any).stable_tags ? parseIfString((task as any).stable_tags) : undefined,
    auto_tags: (task as any).auto_tags ? parseIfString((task as any).auto_tags) : undefined,
    contextual_tags: (task as any).contextual_tags ? parseIfString((task as any).contextual_tags) : undefined,
    checklists: task.checklists ? parseIfString(task.checklists) : null,
    workflow: (task as any).workflow || null,
    spec_state: (task as any).spec_state || 'draft',
    spec_waivers: (task as any).spec_waivers ? parseIfString((task as any).spec_waivers) : null,
    last_validated_at: (task as any).last_validated_at || null,
    validated_by: (task as any).validated_by || null
  } as TaskDbRecord;
}

export function fromDbRowWithChecklists(row: any): TaskDbRecord {
  // TypeORM's simple-json already deserializes, but we need to handle legacy double-stringified data
  const parseIfString = (value: any) => {
    if (!value) return value;
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      logger.warn('Failed to parse JSON:', error);
      return undefined;
    }
  };

  // Map TypeORM entity directly without using TaskUtils.fromDbRow (which expects raw SQLite strings)
  return {
    id: row.id,
    parent_id: row.parent_id,
    title: row.title,
    description: row.description,
    task_type: row.task_type,
    task_status: row.task_status,
    task_priority: row.task_priority,
    estimated_effort: row.estimated_effort,
    actual_effort: row.actual_effort,
    due_date: row.due_date ? new Date(row.due_date) : undefined,
    assigned_to: row.assigned_to,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    entity_links: parseIfString(row.entity_links),
    stable_links: parseIfString(row.stable_links),
    fragile_links: parseIfString(row.fragile_links),
    semantic_context: row.semantic_context,
    stable_tags: parseIfString(row.stable_tags),
    auto_tags: parseIfString(row.auto_tags),
    contextual_tags: parseIfString(row.contextual_tags),
    sort_order: row.sort_order || 0,
    depth_level: row.depth_level || 0,
    checklists: parseIfString(row.checklists),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
    completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
    workflow: row.workflow,
    spec_state: row.spec_state || 'draft',
    spec_waivers: parseIfString(row.spec_waivers),
    last_validated_at: row.last_validated_at ? new Date(row.last_validated_at) : undefined,
    validated_by: row.validated_by
  } as TaskDbRecord;
}
