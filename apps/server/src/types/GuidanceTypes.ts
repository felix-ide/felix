import type { AIGuide as HelpAIGuide } from './HelpTypes.js';

export interface AIGuidance {
  workflow: string;
  completion_target: number;
  missing: GuidanceItem[];
  tips?: string[];
  quality_gates?: { id: string; description: string }[];
  validate_endpoint: string;
  ai_guide?: HelpAIGuide; // compact machine-first usage help
}

export interface GuidanceItem {
  section_type: string;
  description: string;
  actions: ActionSpec[];
}

export type ActionSpec =
  | { kind: 'create_note'; note_type: 'mermaid'|'excalidraw'|'documentation'; title_template: string; content_template: string; link_to_task: string }
  | { kind: 'ensure_checklist'; name: string; min_items: number; default_items: string[]; merge: 'append'|'skip_if_exists' }
  | { kind: 'create_rules'; min_rules: number; templates: Array<{ title: string; body: string }> }
  | { kind: 'ensure_rule_link'; task_id_template: string; rule_id_hint?: string; instructions?: string }
  | { kind: 'ensure_subtasks'; min: number; label: string; task_type?: string; tags?: string[] }
  | { kind: 'validate' };
