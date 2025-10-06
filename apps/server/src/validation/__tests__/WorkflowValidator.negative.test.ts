import { describe, it, expect } from '@jest/globals';
import { WorkflowValidator } from '../WorkflowValidator';
import { FeatureDevelopmentWorkflow as FEATURE } from '../../workflows/definitions/FeatureDevelopmentWorkflow';

function note(id: string, content: string, note_type = 'documentation') {
  return { id, content, note_type } as any;
}

describe('WorkflowValidator negative paths and suggestions', () => {
  it('flags missing architecture/erd/api when notes don’t meet criteria', async () => {
    const validator = new WorkflowValidator([FEATURE as any]);
    const notes = [
      note('a1', 'no mermaid here'),
      note('erd1', 'no diagram present'),
      note('api1', 'openapi: 3.0.0 # wrong version'),
      note('obs1', '## Metrics\nmissing Logs/Alerts'),
    ];
    const status = await validator.validateTask(
      { title: 'Implement feature', description: 'desc', workflow: 'feature_development' } as any,
      { type: 'backend', detected_from: ['keywords'], confidence: 0.9 },
      { notes }
    );
    expect(status.is_valid).toBe(false);
    const missing = status.missing_requirements.map(r => r.section_type);
    expect(missing).toContain('architecture');
    expect(missing).toContain('erd');
    expect(missing).toContain('api_contract');
    const error = validator.formatValidationError(status);
    expect(error.error).toMatch(/Missing required items/);
  });

  it('accepts correct notes and checklists for a minimal custom workflow', async () => {
    // Minimal workflow to exercise positive path without unrelated required sections
    const WF = {
      name: 'mini',
      display_name: 'Mini',
      description: 'mini',
      required_sections: [
        { section_type: 'architecture', required: true, validation_criteria: { requires_linked_note: true, note_type: 'documentation', must_contain_mermaid: true } },
        { section_type: 'erd', required: true, validation_criteria: { requires_linked_note: true, note_type: 'documentation', must_contain_sections: ['erDiagram'] } },
        { section_type: 'api_contract', required: true, validation_criteria: { requires_linked_note: true, note_type: 'documentation', must_contain_sections: ['openapi: 3.1'] } },
        { section_type: 'acceptance_criteria', required: true, min_items: 3 },
        { section_type: 'test_verification', required: true, min_items: 2 },
        { section_type: 'rules', required: true, min_rules: 1 }
      ],
      conditional_requirements: [],
      validation_rules: [],
      use_cases: []
    } as any;
    const validator = new WorkflowValidator([WF]);
    const notes = [
      note('arch', '```mermaid\ngraph TD; A-->B;\n```'),
      note('erd', '```mermaid\nerDiagram\nUSER ||--o{ TASK : has\n```'),
      note('api', 'openapi: 3.1.0\ninfo:\n  title: Test'),
      note('obs', '## Metrics\nDetails\n## Logs\nL\n## Alerts\nA'),
    ];
    const task: any = {
      title: 'Implement feature',
      description: 'with tests',
      workflow: 'feature_development',
      checklists: [
        { name: 'Acceptance Criteria', items: [
          { text: 'Given a user' }, { text: 'When they click' }, { text: 'Then it saves' }
        ]},
        { name: 'Test Verification', items: [
          { text: 'unit: add reducer tests' }, { text: 'integration: cover API flow' }
        ]}
      ],
      entity_links: [ { entity_type: 'rule', entity_id: 'r1' } ]
    };
    const status = await validator.validateTask({ ...task, workflow: 'mini' }, { type: 'full-stack', detected_from: [], confidence: 0.9 }, { notes });
    expect(status.is_valid).toBe(true);
    expect(status.completion_percentage).toBeGreaterThan(50);
  });
});
