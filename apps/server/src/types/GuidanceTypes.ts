import type { AIGuide as HelpAIGuide } from './HelpTypes.js';

/**
 * Enhanced AI Guidance - auto-generated from workflow definitions
 * Provides both structured data (for future automation) and clear instructions (for AI now)
 */
export interface AIGuidance {
  // Task context
  task_id: string;
  task_type: string;
  workflow: string;
  current_status: string;

  // Progress tracking
  progress: {
    completion_percentage: number;
    completed_count: number;
    total_required: number;
    is_minimum_met: boolean;  // Are minimum requirements satisfied?
    is_comprehensive: boolean; // Is it actually complete/thorough?
  };

  // Requirements (structured for future automation)
  requirements: {
    minimum: GuidanceRequirement[];     // Must have to proceed
    recommended: GuidanceRequirement[]; // Should have for quality
    blocking_transitions: string[];     // What transitions are blocked
  };

  // Clear instructions (for AI to read NOW)
  instructions: {
    summary: string;              // One-line summary of what's needed
    next_steps: string[];         // Human-readable action items
    tool_calls: ToolCallExample[]; // Copy-paste ready tool examples
  };

  // Status flow information
  transitions: {
    current: string;
    available: TransitionInfo[];
  };

  // Hierarchy guidance (if task has child requirements)
  hierarchy?: HierarchyGuidance;

  // Reference info
  workflow_description?: string;
  tips?: string[];
  validate_endpoint: string;
  ai_guide?: HelpAIGuide;
}

export interface GuidanceRequirement {
  section_type: string;
  description: string;
  why_needed: string;           // Explains the purpose/value
  is_minimum: boolean;          // True if bare minimum, false if recommended
  quality_bar: string;          // "Minimum: 3. Recommended: 5+ with details"

  current_state?: {
    count?: number;
    status?: string;
  };

  required_state?: {
    min?: number;
    max?: number;
    criteria?: string[];
  };

  // Structured action (for future automation)
  action_spec: ActionSpec;

  // Human instructions (for AI NOW)
  how_to_complete: string;      // Plain English instructions
  tool_example: string;         // Copy-paste ready JSON tool call
}

export interface ToolCallExample {
  tool: string;                 // Tool name (e.g., "tasks", "checklists", "notes")
  description: string;          // What this accomplishes
  params: Record<string, any>;  // Actual parameters, ready to use
  notes?: string;               // Additional guidance about quality
}

export interface TransitionInfo {
  to: string;
  label: string;
  blocked: boolean;
  blocking_reasons: string[];
  required_bundles?: string[];
}

export interface HierarchyGuidance {
  current_level: string;                    // "epic", "story", "task"
  requires_children?: string[];             // ["3-10 stories", "2-5 tasks"]
  child_requirements?: ChildRequirementStatus[];
}

export interface ChildRequirementStatus {
  child_task_type: string;
  label: string;
  min_count: number;
  max_count?: number;
  current_count: number;
  status: 'satisfied' | 'needs_more' | 'needs_validation';
  quality_guidance: string;  // "Minimum met. Add 2-3 more for thorough coverage."
}

/**
 * Action specifications for structured automation
 */
export type ActionSpec =
  | {
      kind: 'create_note';
      tool: 'notes';
      note_type: 'documentation' | 'excalidraw';
      title_template: string;
      content_template: string;
      link_to_task: string;
    }
  | {
      kind: 'ensure_checklist';
      tool: 'checklists';
      name: string;
      min_items: number;
      default_items: string[];
      merge: 'append' | 'skip_if_exists';
    }
  | {
      kind: 'create_child_task';
      tool: 'tasks';
      child_task_type: string;
      label: string;
      min_count: number;
      max_count?: number;
      required_workflow?: string;
      then_child_needs: string[];  // What each child will require
    }
  | {
      kind: 'link_rule';
      tool: 'tasks' | 'rules';
      instructions: string;
      min_rules: number;
    }
  | {
      kind: 'validate';
      tool: 'workflows';
    };
