import { WorkflowDefinition } from '../../types/WorkflowTypes';

export const ResearchWorkflow: WorkflowDefinition = {
  name: 'research',
  display_name: 'Research & Investigation',
  description: 'Structured research with findings documentation',
  required_sections: [
    {
      section_type: 'research_goals',
      required: true,
      validation_criteria: {
        must_contain_sections: ['## Research Goals', '### Objectives'],
        min_checklist_items: 2,
        format: 'checklist'
      },
      help_text: 'Define clear research objectives and questions to answer'
    },
    {
      section_type: 'findings_documentation',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        must_contain_sections: ['## Findings', '## Research Results']
      },
      help_text: 'Document detailed findings with evidence and analysis'
    },
    {
      section_type: 'conclusions',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        must_contain_sections: ['## Conclusions', '## Summary']
      },
      help_text: 'Summarize conclusions and insights from the research'
    },
    {
      section_type: 'next_steps',
      required: true,
      validation_criteria: {
        must_contain_sections: ['## Next Steps', '### Action Items'],
        min_checklist_items: 1,
        format: 'checklist'
      },
      help_text: 'Define actionable next steps based on research findings'
    },
    {
      section_type: 'knowledge_rules',
      required: true,
      validation_criteria: {
        requires_linked_rules: true,
        min_rules: 1,
        rule_types: ['pattern', 'constraint', 'semantic']
      },
      help_text: 'Create rules to capture knowledge and best practices discovered'
    }
  ],
  conditional_requirements: [],
  validation_rules: [
    {
      id: 'research_research_completeness',
      name: 'Research Completeness',
      description: 'Research must be thorough and well-documented',
      validation_function: 'checkResearchCompleteness'
    },
    {
      id: 'research_actionable_outcomes',
      name: 'Actionable Outcomes',
      description: 'Research must produce actionable insights and next steps',
      validation_function: 'checkActionableOutcomes'
    }
  ],
  use_cases: [
    'Technology research',
    'Architecture investigation',
    'Performance analysis',
    'Security assessment',
    'Market research',
    'Feasibility studies'
  ]
};