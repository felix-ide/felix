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
  const dbRow = TaskUtils.toDbRow(task);
  logger.debug('toDbRowWithChecklists - task.checklists:', task.checklists);
  const checklists = task.checklists ? JSON.stringify(task.checklists) : null;
  logger.debug('toDbRowWithChecklists - stringified checklists:', checklists);
  return {
    ...dbRow,
    checklists,
    workflow: (task as any).workflow || null,
    spec_state: (task as any).spec_state || 'draft',
    spec_waivers: (task as any).spec_waivers ? JSON.stringify((task as any).spec_waivers) : null,
    last_validated_at: (task as any).last_validated_at || null,
    validated_by: (task as any).validated_by || null
  } as TaskDbRecord;
}

export function fromDbRowWithChecklists(row: any): TaskDbRecord {
  const task = TaskUtils.fromDbRow(row);
  let checklists = undefined;

  if (row.checklists) {
    try {
      checklists = typeof row.checklists === 'string' ? JSON.parse(row.checklists) : row.checklists;
    } catch (error) {
      logger.warn('Failed to parse checklists JSON:', error);
      checklists = undefined;
    }
  }

  let entity_links = task.entity_links;
  if (row.entity_links && typeof row.entity_links === 'string') {
    try {
      entity_links = JSON.parse(row.entity_links);
    } catch (error) {
      logger.warn('Failed to parse entity_links JSON:', error);
      entity_links = undefined;
    }
  }

  let stable_links = (task as any).stable_links;
  if (row.stable_links && typeof row.stable_links === 'string') {
    try {
      stable_links = JSON.parse(row.stable_links);
    } catch (error) {
      logger.warn('Failed to parse stable_links JSON:', error);
      stable_links = undefined;
    }
  }

  let fragile_links = (task as any).fragile_links;
  if (row.fragile_links && typeof row.fragile_links === 'string') {
    try {
      fragile_links = JSON.parse(row.fragile_links);
    } catch (error) {
      logger.warn('Failed to parse fragile_links JSON:', error);
      fragile_links = undefined;
    }
  }

  let spec_waivers = undefined as any;
  if ((row as any).spec_waivers) {
    try {
      spec_waivers = typeof (row as any).spec_waivers === 'string'
        ? JSON.parse((row as any).spec_waivers)
        : (row as any).spec_waivers;
    } catch (error) {
      logger.warn('Failed to parse spec_waivers JSON:', error);
      spec_waivers = undefined;
    }
  }

  return {
    ...task,
    entity_links,
    stable_links,
    fragile_links,
    checklists,
    workflow: (row as any).workflow || (task as any).workflow,
    spec_state: (row as any).spec_state || (task as any).spec_state || 'draft',
    spec_waivers,
    last_validated_at: (row as any).last_validated_at || (task as any).last_validated_at,
    validated_by: (row as any).validated_by || (task as any).validated_by
  } as TaskDbRecord;
}
