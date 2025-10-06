import { describe, it, expect } from '@jest/globals';
import { BUILT_IN_WORKFLOWS, getWorkflowDefinition, getWorkflowNames, isValidWorkflow, SIMPLE_WORKFLOW } from '../WorkflowDefinitions';

describe('WorkflowDefinitions', () => {
  it('exposes simple workflow and utility helpers', () => {
    expect(Array.isArray(BUILT_IN_WORKFLOWS)).toBe(true);
    expect(getWorkflowNames()).toContain('simple');
    const wf = getWorkflowDefinition('simple');
    expect(wf?.name).toBe(SIMPLE_WORKFLOW.name);
    expect(isValidWorkflow('feature_development')).toBe(true);
    expect(isValidWorkflow('nope')).toBe(false);
  });
});

