import { WorkflowDefinition } from '../../types/WorkflowTypes';

/**
 * Research & Investigation Workflow
 * Structured approach to research tasks with findings documentation and knowledge capture
 */
export const ResearchWorkflow: WorkflowDefinition = {
  name: 'research',
  display_name: 'Research & Investigation',
  description: 'Structured research workflow with hypothesis, investigation, findings documentation, and knowledge capture',

  required_sections: [
    {
      section_type: 'title',
      required: true,
      validation_criteria: {
        min_length: 10,
        max_length: 120
      },
      help_text: 'Clear research question or investigation topic (10-120 chars)'
    },
    {
      section_type: 'description',
      required: true,
      validation_criteria: {
        min_length: 50
      },
      help_text: 'Background context, motivation for research, and what decisions this will inform'
    },
    {
      section_type: 'research_goals',
      required: true,
      validation_criteria: {
        min_checklist_items: 2,
        format: 'checklist'
      },
      help_text: 'Specific research objectives and questions to answer (minimum 2 objectives)'
    },
    {
      section_type: 'findings',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        min_length: 200
      },
      help_text: 'Detailed findings documentation with evidence, data, and analysis in a linked note'
    },
    {
      section_type: 'conclusions',
      required: true,
      validation_criteria: {
        requires_linked_note: true,
        note_type: 'documentation',
        min_length: 100
      },
      help_text: 'Summary of conclusions, insights, and recommendations based on findings'
    }
  ],

  conditional_requirements: [],

  validation_rules: [
    {
      id: 'research_goals_clarity',
      name: 'Research Goals Clarity',
      description: 'Research goals must be specific and measurable',
      rule_type: 'content',
      error_message: 'Each research goal should be specific, measurable, and answer a clear question'
    },
    {
      id: 'findings_evidence_based',
      name: 'Evidence-Based Findings',
      description: 'Findings must be backed by data, sources, or experimental results',
      rule_type: 'content',
      error_message: 'All findings must include supporting evidence: data, sources, screenshots, or experimental results'
    },
    {
      id: 'checklist_non_empty',
      name: 'Non-Empty Checklist Items',
      description: 'Checklist items must have meaningful content',
      rule_type: 'content',
      error_message: 'Checklist items cannot be empty or contain only placeholder text'
    },
    {
      id: 'actionable_next_steps',
      name: 'Actionable Next Steps',
      description: 'Research must produce clear, actionable recommendations',
      rule_type: 'content',
      error_message: 'Next steps must be specific and actionable, not vague suggestions'
    }
  ],

  validation_bundles: [
    {
      id: 'research_planned',
      name: 'Research Planned',
      description: 'Research objectives are clearly defined before investigation begins',
      sections: ['title', 'description', 'research_goals'],
      rules: ['research_goals_clarity', 'checklist_non_empty'],
      guidance_hint: 'Define specific research questions and objectives. What decisions will this research inform?'
    },
    {
      id: 'investigation_complete',
      name: 'Investigation Complete',
      description: 'Research investigation is complete with documented findings',
      sections: ['findings'],
      rules: ['findings_evidence_based', 'checklist_non_empty'],
      guidance_hint: 'Document all findings with supporting evidence. Include data, sources, screenshots, or experimental results.'
    },
    {
      id: 'conclusions_ready',
      name: 'Conclusions Ready',
      description: 'Research conclusions and recommendations are documented',
      sections: ['conclusions'],
      rules: ['actionable_next_steps', 'checklist_non_empty'],
      guidance_hint: 'Summarize key insights and provide clear, actionable recommendations based on findings.'
    }
  ],

  status_flow_ref: 'flow_research',

  status_flow: {
    transitions: [
      {
        id: 'draft_to_investigating',
        from: 'draft',
        to: 'investigating',
        label: 'Start Investigation',
        description: 'Research plan is ready, begin investigation',
        required_bundles: ['research_planned'],
        pre_prompt_template: 'Research objectives are defined. Begin systematic investigation to answer each research question.',
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Research plan is complete. Starting investigation phase.\n\n✅ CHECKPOINT: Review the research objectives and methodology to ensure they are clear and achievable.\n\nTo begin investigation, update this task status to "investigating" with the transition gate token "{{gate_token}}". Use the mcp__felix__tasks tool with action "update", task_id "{{task.id}}", task_status "investigating", and transition_gate_token "{{gate_token}}".',
          auto_checklist: {
            name: 'Investigation Checklist',
            items: [
              'Review existing documentation and prior art',
              'Conduct experiments or tests as needed',
              'Gather data from relevant sources',
              'Document findings with evidence and screenshots',
              'Test hypotheses and validate assumptions',
              'Interview stakeholders or subject matter experts (if applicable)'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'investigating_to_analyzing',
        from: 'investigating',
        to: 'analyzing',
        label: 'Analyze Findings',
        description: 'Investigation complete, analyze findings and draw conclusions',
        required_bundles: ['investigation_complete'],
        pre_prompt_template: 'All research data is collected. Analyze findings to answer research questions and draw conclusions.',
        gate: {
          auto_checklist: {
            name: 'Analysis Checklist',
            items: [
              'Compare findings against research objectives',
              'Identify patterns, trends, and insights',
              'Validate conclusions with evidence',
              'Document trade-offs and limitations',
              'Formulate actionable recommendations',
              'Create rules to capture knowledge gained'
            ],
            merge_strategy: 'replace'
          }
        }
      },
      {
        id: 'analyzing_to_done',
        from: 'analyzing',
        to: 'done',
        label: 'Complete Research',
        description: 'Research complete with documented conclusions and recommendations',
        required_bundles: ['conclusions_ready'],
        gate: {
          require_acknowledgement: true,
          acknowledgement_prompt_template: 'Research is complete with documented conclusions and actionable recommendations.\n\n✅ CHECKPOINT: Review all findings and conclusions, confirm next steps are actionable.\n\nTo mark complete, update this task status to "done" with the transition gate token "{{gate_token}}". Use the mcp__felix__tasks tool with action "update", task_id "{{task.id}}", task_status "done", and transition_gate_token "{{gate_token}}".',
          auto_checklist: {
            name: 'Completion Checklist',
            items: [
              'All research questions answered',
              'Conclusions supported by evidence',
              'Next steps are clear and actionable',
              'Knowledge captured in rules or documentation',
              'Stakeholders notified of findings',
              'Research artifacts archived for future reference'
            ],
            merge_strategy: 'append'
          }
        }
      },
      {
        id: 'any_to_cancelled',
        from: '*',
        to: 'cancelled',
        label: 'Cancel Research',
        description: 'Research cancelled or no longer needed'
      }
    ]
  },

  child_requirements: [
    {
      child_task_type: 'task',
      required_workflow: 'research',
      min_count: 0,
      max_count: 5,
      label: 'Investigation Tasks (Optional)',
      description: 'Break down research into specific investigation tasks if needed',
      validation: {
        at_least_one_in: ['in_progress', 'done']
      }
    }
  ],

  use_cases: [
    'Technology research and evaluation',
    'Architecture investigation and design exploration',
    'Performance analysis and optimization research',
    'Security assessment and threat modeling',
    'Market research and competitive analysis',
    'Feasibility studies for new initiatives',
    'Technical spikes and proof-of-concepts',
    'Root cause investigation for complex issues'
  ]
};
