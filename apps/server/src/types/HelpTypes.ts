export type HelpSection = 'tasks' | 'workflows' | 'notes' | 'checklists' | 'spec';

export interface HelpPack {
  section: HelpSection;
  version: string;
  human_md: string; // concise markdown with mermaid support
  ai_guide: AIGuide;
}

export interface AIGuide {
  purpose: string;
  state_machine?: {
    name: string;
    states: string[];
    transitions: Array<{ from: string; to: string; guard?: string }>;
  }[];
  allowed_actions_by_state?: Record<string, string[]>;
  validation_gates?: Array<{ id: string; description: string; maps_to?: string[] }>;
  stepper_flows?: Record<string, { title: string; steps: Array<{ tool: string; action: string; args?: Record<string, any> }> }>;
  examples?: Array<{ title: string; calls: Array<{ tool: string; action: string; args: Record<string, any> }> }>;
  do?: string[];
  dont?: string[];
  params_contract?: Array<{ name: string; required: boolean; description: string }>;
  idempotency?: string;
  error_recovery?: Array<{ error: string; fix: string }>; 
  rate_limits?: Array<{ scope: string; limit: string }>;
}
