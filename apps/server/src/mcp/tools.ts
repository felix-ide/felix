import type { McpToolDefinition } from './tool-definitions/common.js';
import { PROJECTS_TOOL } from './tool-definitions/projects.js';
import { SEARCH_TOOL } from './tool-definitions/search.js';
import { CONTEXT_TOOL } from './tool-definitions/context.js';
import { NOTES_TOOL } from './tool-definitions/notes.js';
import { WORKFLOWS_TOOL } from './tool-definitions/workflows.js';
import { TASKS_TOOL } from './tool-definitions/tasks.js';
import { RULES_TOOL } from './tool-definitions/rules.js';
import { CHECKLISTS_TOOL } from './tool-definitions/checklists.js';
import { DEGRADATION_TOOL } from './tool-definitions/degradation.js';

const ORDERED_TOOLS: ReadonlyArray<McpToolDefinition> = [
  PROJECTS_TOOL,
  SEARCH_TOOL,
  CONTEXT_TOOL,
  NOTES_TOOL,
  WORKFLOWS_TOOL,
  TASKS_TOOL,
  RULES_TOOL,
  CHECKLISTS_TOOL,
  DEGRADATION_TOOL
];

export const TOOLS = ORDERED_TOOLS;

export function getAllTools(): McpToolDefinition[] {
  return [...TOOLS];
}

export function getToolsByName() {
  return {
    projects: PROJECTS_TOOL,
    search: SEARCH_TOOL,
    context: CONTEXT_TOOL,
    notes: NOTES_TOOL,
    tasks: TASKS_TOOL,
    checklists: CHECKLISTS_TOOL,
    rules: RULES_TOOL,
    degradation: DEGRADATION_TOOL
  } as const;
}

export {
  PROJECTS_TOOL,
  SEARCH_TOOL,
  CONTEXT_TOOL,
  NOTES_TOOL,
  WORKFLOWS_TOOL,
  TASKS_TOOL,
  RULES_TOOL,
  CHECKLISTS_TOOL,
  DEGRADATION_TOOL
};

export type { McpToolDefinition };
