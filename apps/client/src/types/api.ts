// API response types for HTTP communication

export interface APIResponse<T = any> {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  data?: T;
}

export interface ComponentData {
  id: string;
  name: string;
  type: string;
  language: string;
  filePath: string;
  location: {
    startLine: number;
    endLine: number;
    startColumn?: number;
    endColumn?: number;
  };
  code?: string;
  metadata?: Record<string, any>;
}

export interface RelationshipData {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  score: number;
  filePath: string;
  snippet?: string;
}

export interface ProjectStats {
  componentCount: number;
  relationshipCount: number;
  fileCount: number;
  languageDistribution: Record<string, number>;
  lastIndexed?: string;
}

export interface ContextData {
  component: ComponentData;
  relationships: RelationshipData[];
  notes?: NoteData[];
  tasks?: TaskData[];
  applicableRules?: RuleData[];
}

// Metadata types
export interface NoteData {
  id: string;
  title?: string;
  content: string;
  note_type: 'note' | 'warning' | 'documentation' | 'excalidraw' | 'mermaid';
  parent_id?: string;
  sort_order: number;
  depth_level: number;
  entity_type: string;
  
  // Multi-entity linking
  entity_links?: Array<{
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    link_strength?: 'primary' | 'secondary' | 'reference';
  }>;
  
  // Multi-layer linking for survival
  stable_links?: Record<string, any>; // JSON: signatures that survive refactoring
  fragile_links?: Record<string, any>; // JSON: exact IDs that break on changes  
  semantic_embedding?: ArrayBuffer; // For finding new links after changes
  
  // Comprehensive tagging system
  stable_tags?: string[]; // Manually added, permanent
  auto_tags?: string[]; // AI-generated, expire on changes
  contextual_tags?: string[]; // Location-based, auto-refresh
  
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  text: string;
  checked: boolean;
  created_at?: string;
  completed_at?: string;
}

export interface Checklist {
  name: string;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface TaskData {
  id: string;
  parent_id?: string;
  title: string;
  description?: string;
  task_type: 'epic' | 'story' | 'task' | 'subtask' | 'milestone' | 'bug' | 'spike' | 'chore';  // Hierarchical order: epic → story → task → subtask, plus special types
  task_status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  task_priority: 'low' | 'medium' | 'high' | 'critical';
  workflow?: 'simple' | 'feature_development' | 'bugfix' | 'research';
  spec_state?: 'draft' | 'spec_in_progress' | 'spec_ready';
  estimated_effort?: string;
  actual_effort?: string;
  due_date?: string;
  assigned_to?: string;
  
  // Multi-entity linking
  entity_links?: Array<{
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    link_strength?: 'primary' | 'secondary' | 'reference';
  }>;
  
  // Multi-layer linking for survival
  stable_links?: Record<string, any>; // JSON: signatures that survive refactoring
  fragile_links?: Record<string, any>; // JSON: exact IDs that break on changes  
  semantic_embedding?: ArrayBuffer; // For finding new links after changes
  
  // Comprehensive tagging system
  stable_tags?: string[]; // Manually added, permanent
  auto_tags?: string[]; // AI-generated, expire on changes
  contextual_tags?: string[]; // Location-based, auto-refresh
  
  // Checklists for flexible task organization
  checklists?: Checklist[];
  
  sort_order: number;
  depth_level: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface TaskDependency {
  id: string;
  dependent_task_id: string;
  dependency_task_id: string;
  dependency_type: 'blocks' | 'related' | 'follows';
  required: boolean;
  auto_created: boolean;
  created_at: string;
}

export interface RuleData {
  id: string;
  name: string;
  description: string;
  rule_type: 'pattern' | 'constraint' | 'semantic' | 'automation';
  parent_id?: string;
  sort_order: number;
  depth_level: number;
  guidance_text: string;
  code_template?: string;
  validation_script?: string;
  trigger_patterns?: Record<string, any>;
  semantic_triggers?: Record<string, any>;
  context_conditions?: Record<string, any>;
  exclusion_patterns?: Record<string, any>;
  priority: number;
  auto_apply: boolean;
  merge_strategy: 'append' | 'replace' | 'merge';
  confidence_threshold: number;
  active: boolean;
  
  // Multi-entity linking
  entity_links?: Array<{
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    link_strength?: 'primary' | 'secondary' | 'reference';
  }>;
  
  // Multi-layer linking for survival
  stable_links?: Record<string, any>; // JSON: signatures that survive refactoring
  fragile_links?: Record<string, any>; // JSON: exact IDs that break on changes  
  semantic_embedding?: ArrayBuffer; // For finding new links after changes
  
  // Comprehensive tagging system
  stable_tags?: string[]; // Manually added, permanent
  auto_tags?: string[]; // AI-generated, expire on changes
  contextual_tags?: string[]; // Location-based, auto-refresh
  
  created_at: string;
  updated_at: string;
}

export interface DependencyData {
  id: string;
  dependent_task_id: string;
  dependency_task_id: string;
  dependency_type: 'blocks' | 'related' | 'follows';
  required: boolean;
  auto_created: boolean;
  created_at: string;
}

export interface TaskDependency extends DependencyData {
  dependent_task_name?: string;
  dependency_task_name?: string;
}

// File system types
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  children?: FileTreeNode[];
}

export interface FileStats {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  createdAt: string;
  modifiedAt: string;
  isDirectory: boolean;
  isFile: boolean;
  permissions?: string;
}

export interface FileSearchResult {
  path: string;
  line: number;
  column: number;
  match: string;
  before: string;
  after: string;
}
