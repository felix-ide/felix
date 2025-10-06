import { ReactNode } from 'react';

// Component prop types and UI state types

export type Section = 'server-log' | 'explore' | 'notes' | 'tasks' | 'rules' | 'workflows' | 'activity';

export type ExploreView = 'search' | 'components' | 'relationships' | 'file-view';

export interface AppState {
  currentSection: Section;
  projectPath?: string;
  projectSelected: boolean;
  serverRunning: boolean;
}

export interface ProjectState {
  path?: string;
  name?: string;
  isIndexed: boolean;
  lastIndexed?: string;
  stats?: {
    componentCount: number;
    relationshipCount: number;
    fileCount: number;
  };
}

export interface DocumentTab {
  id: string;
  title: string;
  filePath: string;
  path?: string;  // Absolute path for project-editor
  content: string;
  isDirty: boolean;
  isActive: boolean;
  language?: string;
}

export interface UIComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface IconNavItem {
  id: Section;
  icon: ReactNode;
  label: string;
  tooltip: string;
}

export interface SearchFilters {
  query: string;
  type?: string;
  language?: string;
  entityType?: string;
  tags?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  group?: string;
  x?: number;
  y?: number;
  z?: number;
  size?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: number;
  autoHide?: boolean;
  duration?: number;
}

export interface ActivityEvent {
  id: string;
  type: 'task_created' | 'task_updated' | 'note_added' | 'dependency_added' | 'document_changed';
  title: string;
  description?: string;
  entityId?: string;
  entityType?: string;
  createdBy: 'ai' | 'user';
  timestamp: number;
  metadata?: Record<string, any>;
}
