import type { INote, IRule, ITask } from '@felix/code-intelligence';

export type OutputFormat = 'json' | 'text';

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpResponse<TPayload = unknown> {
  content: McpTextContent[];
  payload?: TPayload;
}

export interface ListResult<TItem> {
  total: number;
  offset: number;
  limit: number;
  items: TItem[];
}

export type ProjectionView = 'ids' | 'titles' | 'summary' | 'full';

export interface ProjectScopedRequest {
  project: string;
  action: string;
  output_format?: OutputFormat;
}

export interface ProjectionOptions {
  view?: ProjectionView;
  fields?: string[];
  limit?: number;
  offset?: number;
}

export interface TasksListRequest extends ProjectScopedRequest, ProjectionOptions {
  action: 'list';
  parent_id?: string;
  task_status?: string;
  task_type?: string;
  include_children?: boolean;
}

export type TasksListItem = {
  id: string;
  title: string;
  task_status?: string | null;
  task_type?: string | null;
  parent_id?: string | null;
  [key: string]: unknown;
};

export type TasksListResult = ListResult<TasksListItem>;

export interface NotesListRequest extends ProjectScopedRequest, ProjectionOptions {
  action: 'list';
  note_type?: string;
  tags?: string[];
}

export type NotesListItem = {
  id: string;
  title: string;
  note_type?: string | null;
  [key: string]: unknown;
};

export type NotesListResult = ListResult<NotesListItem>;

export interface RulesListRequest extends ProjectScopedRequest, ProjectionOptions {
  action: 'list';
  rule_type?: string;
  active?: boolean;
}

export type RulesListItem = {
  id: string;
  title: string;
  name?: string;
  rule_type?: string | null;
  active?: boolean;
  [key: string]: unknown;
};

export type RulesListResult = ListResult<RulesListItem>;

export interface TasksHelpRequest extends ProjectScopedRequest {
  action: 'help';
}

export interface TasksGetRequest extends ProjectScopedRequest {
  action: 'get';
  task_id: string;
  include_notes?: boolean;
  include_children?: boolean;
}

export interface TasksAddRequest extends ProjectScopedRequest {
  action: 'create';
  title: string;
  description?: string;
  parent_id?: string;
  task_type?: string;
  task_status?: string;
  task_priority?: string;
  estimated_effort?: string;
  actual_effort?: string;
  due_date?: string;
  assigned_to?: string;
  entity_links?: Array<Record<string, unknown>>;
  stable_tags?: string[];
  workflow?: string;
  skip_validation?: boolean;
  checklists?: unknown;
}

export interface TasksUpdateRequest extends ProjectScopedRequest {
  action: 'update';
  task_id: string;
  skip_validation?: boolean;
  [key: string]: unknown;
}

export interface TasksDeleteRequest extends ProjectScopedRequest {
  action: 'delete';
  task_id: string;
}

export interface TasksGetTreeRequest extends ProjectScopedRequest {
  action: 'get_tree';
  root_task_id?: string;
  include_completed?: boolean;
}

export interface TasksGetDependenciesRequest extends ProjectScopedRequest {
  action: 'get_dependencies';
  task_id: string;
  direction?: 'incoming' | 'outgoing' | 'both';
}

export interface TasksAddDependencyRequest extends ProjectScopedRequest {
  action: 'add_dependency';
  dependent_task_id: string;
  dependency_task_id: string;
  dependency_type?: string;
  required?: boolean;
}

export interface TasksSuggestNextRequest extends ProjectScopedRequest {
  action: 'suggest_next';
  limit?: number;
}

export type TasksToolRequest =
  | TasksListRequest
  | TasksHelpRequest
  | TasksAddRequest
  | TasksGetRequest
  | TasksUpdateRequest
  | TasksDeleteRequest
  | TasksGetTreeRequest
  | TasksGetDependenciesRequest
  | TasksAddDependencyRequest
  | TasksSuggestNextRequest;

export interface NotesHelpRequest extends ProjectScopedRequest {
  action: 'help';
}

export interface NotesAddRequest extends ProjectScopedRequest {
  action: 'create';
  title?: string;
  content: string;
  note_type?: string;
  entity_links?: Array<Record<string, unknown>>;
  stable_tags?: string[];
  parent_id?: string;
}

export interface NotesGetRequest extends ProjectScopedRequest {
  action: 'get';
  note_id: string;
  include_linked_entities?: boolean;
}

export interface NotesGetSpecBundleRequest extends ProjectScopedRequest {
  action: 'get_spec_bundle';
  task_id: string;
  workflow?: string;
  compact?: boolean;
}

export interface NotesUpdateRequest extends ProjectScopedRequest {
  action: 'update';
  note_id: string;
  title?: string;
  content?: string;
  note_type?: string;
  stable_tags?: string[];
  entity_links?: Array<Record<string, unknown>>;
  parent_id?: string;
}

export interface NotesDeleteRequest extends ProjectScopedRequest {
  action: 'delete';
  note_id: string;
}

export type NotesToolRequest =
  | NotesListRequest
  | NotesHelpRequest
  | NotesAddRequest
  | NotesGetRequest
  | NotesGetSpecBundleRequest
  | NotesUpdateRequest
  | NotesDeleteRequest;

export interface RulesAddRequest extends ProjectScopedRequest {
  action: 'create';
  title: string;
  description?: string;
  rule_type: string;
  parent_id?: string;
  guidance_text: string;
  code_template?: string;
  validation_script?: string;
  trigger_patterns?: unknown;
  semantic_triggers?: unknown;
  context_conditions?: unknown;
  exclusion_patterns?: unknown;
  priority?: number;
  auto_apply?: boolean;
  merge_strategy?: string;
  confidence_threshold?: number;
  active?: boolean;
}

export interface RulesGetRequest extends ProjectScopedRequest {
  action: 'get';
  rule_id: string;
}

export interface RulesUpdateRequest extends ProjectScopedRequest {
  action: 'update';
  rule_id: string;
  [key: string]: unknown;
}

export interface RulesDeleteRequest extends ProjectScopedRequest {
  action: 'delete';
  rule_id: string;
}

export interface RulesGetApplicableRequest extends ProjectScopedRequest {
  action: 'get_applicable';
  entity_type: string;
  entity_id: string;
  context?: Record<string, unknown>;
  include_suggestions?: boolean;
  include_automation?: boolean;
}

export interface RulesApplyRequest extends ProjectScopedRequest {
  action: 'apply';
  apply_rule_id: string;
  target_entity: Record<string, unknown>;
  application_context?: Record<string, unknown>;
}

export interface RulesGetTreeRequest extends ProjectScopedRequest {
  action: 'tree';
  root_rule_id?: string;
  include_inactive?: boolean;
}

export interface RulesGetAnalyticsRequest extends ProjectScopedRequest {
  action: 'analytics';
  days_since?: number;
}

export interface RulesTrackApplicationRequest extends ProjectScopedRequest {
  action: 'track';
  rule_id: string;
  track_entity_type?: string;
  track_entity_id?: string;
  applied_context?: Record<string, unknown>;
  user_action?: 'accepted' | 'modified' | 'rejected' | 'ignored';
  generated_code?: string;
  feedback_score?: number;
}

export type RulesToolRequest =
  | RulesListRequest
  | RulesAddRequest
  | RulesGetRequest
  | RulesUpdateRequest
  | RulesDeleteRequest
  | RulesGetApplicableRequest
  | RulesApplyRequest
  | RulesGetTreeRequest
  | RulesGetAnalyticsRequest
  | RulesTrackApplicationRequest;

export interface ProjectsHelpRequest {
  action: 'help';
}

export interface ProjectsListRequest {
  action: 'list';
}

export interface ProjectsSetRequest {
  action: 'set';
  path: string;
}

export interface ProjectsIndexRequest {
  action: 'index';
  path: string;
  force?: boolean;
  with_embeddings?: boolean;
}

export interface ProjectsGetStatsRequest {
  action: 'get_stats';
  path: string;
}

export type ProjectsToolRequest =
  | ProjectsHelpRequest
  | ProjectsListRequest
  | ProjectsSetRequest
  | ProjectsIndexRequest
  | ProjectsGetStatsRequest;

export interface SearchQueryRequest extends ProjectScopedRequest {
  action: 'search';
  query: string;
  max_results?: number;
  similarity_threshold?: number;
  component_types?: string[];
  entity_types?: ('component' | 'task' | 'note' | 'rule')[];
  lang?: string[];
  path_include?: string[];
  path_exclude?: string[];
  code_first?: boolean;
  skeleton_verbose?: boolean;
  context_window_size?: number;
  view?: ProjectionView;
  fields?: string[];
  kb_ids?: string[];
}

export interface SearchContextRequest {
  project: string;
  action: 'context';
  component_id: string;
  include_source?: boolean;
  include_relationships?: boolean;
  output_format?: 'json' | 'markdown';
  [key: string]: unknown;
}

export interface SearchIndexRequest extends ProjectScopedRequest {
  action: 'index';
}

export interface SearchStatsRequest extends ProjectScopedRequest {
  action: 'stats';
}

export type SearchToolRequest = SearchQueryRequest | SearchContextRequest | SearchIndexRequest | SearchStatsRequest;

export const createJsonContent = <T>(payload: T): McpTextContent => ({
  type: 'text',
  text: JSON.stringify(payload)
});

export const createTextContent = (text: string): McpTextContent => ({
  type: 'text',
  text
});

export const normalizeLimit = (limit?: number, fallback = 20): number => {
  return typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : fallback;
};

export const normalizeOffset = (offset?: number): number => {
  return typeof offset === 'number' && Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0;
};

export const resolveFieldSet = (view: ProjectionView | undefined, fields: string[] | undefined, defaultFields: string[]): string[] | null => {
  if (fields && fields.length > 0) return fields;
  if (!view) return defaultFields;
  switch (view) {
    case 'ids':
      return ['id'];
    case 'titles':
      return ['id', 'title'];
    case 'summary':
      return defaultFields;
    case 'full':
    default:
      return null;
  }
};

export const ensureIdTitle = <T extends Record<string, unknown>>(row: T): T & { id: string; title: string } => {
  const base = { ...row } as Record<string, unknown>;
  if (base.id === undefined) base.id = row['id'];
  if (base.title === undefined && base['name'] !== undefined) {
    base.title = base['name'];
  }
  if (base.title === undefined && row['title'] !== undefined) {
    base.title = row['title'];
  }
  return base as T & { id: string; title: string };
};

export const toListResponse = <TItem>(
  list: ListResult<TItem>,
  format: OutputFormat | undefined,
  formatText: (payload: ListResult<TItem>) => string
): McpResponse<ListResult<TItem>> => {
  if (format === 'text') {
    return { content: [createTextContent(formatText(list))], payload: list };
  }
  return { content: [createJsonContent(list)], payload: list };
};

export const ensureArray = <T>(value: unknown): T[] | undefined => {
  if (Array.isArray(value)) return value as T[];
  return undefined;
};
