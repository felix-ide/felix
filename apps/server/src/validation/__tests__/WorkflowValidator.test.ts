import { describe, it, expect } from '@jest/globals';
import { WorkflowValidator } from '../WorkflowValidator';
import { SIMPLE_WORKFLOW, BUILT_IN_WORKFLOWS } from '../WorkflowDefinitions';

describe('WorkflowValidator', () => {
  it('validates simple workflow with title and computes completion', async () => {
    const validator = new WorkflowValidator(BUILT_IN_WORKFLOWS);
    const status = await validator.validateTask({ title: 'Add feature', description: '' } as any);
    expect(status.workflow).toBe('simple');
    expect(status.is_valid).toBe(true);
    expect(status.completion_percentage).toBeGreaterThan(0);
    const formatted = validator.formatValidationError({ ...status, is_valid: false });
    expect(formatted.workflow_used).toBe('simple');
  });

  it('applies conditional logic via context (backend => architecture required)', async () => {
    // craft a minimal workflow with conditional requirement
    const wf = {
      ...SIMPLE_WORKFLOW,
      name: 'cond',
      required_sections: [
        ...SIMPLE_WORKFLOW.required_sections,
        { section_type: 'architecture', required: true, conditional_logic: 'backend' },
      ],
      conditional_requirements: [
        { id: 'arch-backend', section_type: 'architecture', condition: 'backend', required_when_true: true, required_when_false: false },
      ],
    } as any;
    const validator = new WorkflowValidator([wf]);
    // Provide an architecture note with mermaid so section is satisfied
    const notes = [{ id: 'n1', note_type: 'documentation', content: '```mermaid\ngraph TD;\n```' }];
    const status = await validator.validateTask(
      { title: 'Build API', workflow: 'cond' } as any,
      { type: 'backend', detected_from: ['keywords'], confidence: 0.9 },
      { notes }
    );
    expect(status.is_valid).toBe(true);
  });
});

