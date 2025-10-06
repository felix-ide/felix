import type { SelectQueryBuilder } from 'typeorm';
import type { Task } from '../../entities/metadata/Task.entity.js';
import type { TaskSearchCriteria } from '@felix/code-intelligence';
import type { DataSource } from 'typeorm';

export function applyTaskSearchFilters(
  query: SelectQueryBuilder<Task>,
  criteria: TaskSearchCriteria,
  dataSource: DataSource
) {
  if (criteria.task_status) {
    query.andWhere('task.task_status = :status', { status: criteria.task_status });
  }

  if (criteria.task_priority) {
    query.andWhere('task.task_priority = :priority', { priority: criteria.task_priority });
  }

  if (criteria.task_type) {
    query.andWhere('task.task_type = :type', { type: criteria.task_type });
  }

  if (criteria.assigned_to) {
    query.andWhere('task.assigned_to = :assignee', { assignee: criteria.assigned_to });
  }

  if (criteria.parent_id !== undefined) {
    if (criteria.parent_id === null) {
      query.andWhere('task.parent_id IS NULL');
    } else {
      query.andWhere('task.parent_id = :parentId', { parentId: criteria.parent_id });
    }
  }

  const text = (criteria as any).text;
  if (text) {
    query.andWhere('(task.title LIKE :text OR task.description LIKE :text)', {
      text: `%${text}%`
    });
  }

  const tags = (criteria as any).tags;
  if (tags && Array.isArray(tags) && tags.length > 0) {
    if (dataSource.options.type === 'postgres') {
      query.andWhere('task.stable_tags::jsonb ?| ARRAY[:...tags]', { tags });
    } else {
      const tagConditions = tags
        .map((_: unknown, index: number) => `json_extract(task.stable_tags, '$[' || json_each.key || ']') = :tag${index}`)
        .join(' OR ');

      tags.forEach((tag: any, index: number) => {
        query.setParameter(`tag${index}`, tag);
      });

      query.andWhere(`EXISTS (SELECT 1 FROM json_each(task.stable_tags) WHERE ${tagConditions})`);
    }
  }

  if ((criteria as any).entity_id) {
    query.andWhere('task.entity_id = :entityId', { entityId: (criteria as any).entity_id });
  }
}
