import type { McpToolDefinition } from './tool-definitions/common.js';
import { SEARCH_TOOL } from './tool-definitions/search.js';
import { WORKFLOWS_TOOL } from './tool-definitions/workflows.js';
import { NOTES_TOOL } from './tool-definitions/notes.js';
import { TASKS_TOOL } from './tool-definitions/tasks.js';
import { RULES_TOOL } from './tool-definitions/rules.js';

const ORDERED_TOOLS: ReadonlyArray<McpToolDefinition> = [
  SEARCH_TOOL,
  NOTES_TOOL,
  TASKS_TOOL,
  RULES_TOOL,
  WORKFLOWS_TOOL
];

export const TOOLS = ORDERED_TOOLS;

export function getAllTools(): McpToolDefinition[] {
  return [...TOOLS];
}

export function getToolsByName() {
  return {
    search: SEARCH_TOOL,
    notes: NOTES_TOOL,
    tasks: TASKS_TOOL,
    rules: RULES_TOOL,
    workflows: WORKFLOWS_TOOL
  } as const;
}

export {
  SEARCH_TOOL,
  NOTES_TOOL,
  TASKS_TOOL,
  RULES_TOOL,
  WORKFLOWS_TOOL
};

export type { McpToolDefinition };
