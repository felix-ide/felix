import { useState, useEffect, useMemo } from 'react';
import type { TaskData } from '@/types/api';
import type { WorkflowRequirement } from '@client/features/tasks/components/RequirementsPanel';

interface TaskFormData extends Partial<TaskData> {
  title?: string;
  description?: string;
  entity_links?: any[];
  stable_tags?: string[];
}

interface ValidationStatus {
  is_valid: boolean;
  completion_percentage: number;
  requirements: WorkflowRequirement[];
  missing_requirements: string[];
  context_type?: 'frontend' | 'backend' | 'full-stack';
}

type SectionRule = { section_type: string; required: boolean; min_items?: number; conditional_logic?: string };
type ConditionalRequirement = { section_type: string; condition: string; fallback_message: string };
type WorkflowDef = {
  name: string;
  display_name: string;
  description: string;
  required_sections: SectionRule[];
  conditional_requirements: ConditionalRequirement[];
};

// Built-in workflow definitions (should match backend)
const WORKFLOW_DEFINITIONS: Record<string, WorkflowDef> = {
  simple: {
    name: 'simple',
    display_name: 'Simple Task',
    description: 'Basic task with minimal requirements',
    required_sections: [
      { section_type: 'title', required: true },
      { section_type: 'description', required: false }
    ],
    conditional_requirements: []
  },
  feature_development: {
    name: 'feature_development',
    display_name: 'Feature Development',
    description: 'Full structured workflow for new features',
    required_sections: [
      { section_type: 'title', required: true },
      { section_type: 'description', required: true },
      { section_type: 'architecture', required: true },
      { section_type: 'mockups', required: true, conditional_logic: 'frontend_work' },
      { section_type: 'implementation_checklist', required: true, min_items: 3 },
      { section_type: 'test_checklist', required: true, min_items: 2 },
      { section_type: 'rules_creation', required: true }
    ],
    conditional_requirements: [
      {
        section_type: 'mockups',
        condition: 'task_type != "backend"',
        fallback_message: 'Mockups not required for backend-only tasks'
      }
    ]
  },
  bugfix: {
    name: 'bugfix',
    display_name: 'Bug Fix',
    description: 'Structured approach for bug resolution',
    required_sections: [
      { section_type: 'title', required: true },
      { section_type: 'description', required: true },
      { section_type: 'reproduction_steps', required: true },
      { section_type: 'root_cause_analysis', required: true },
      { section_type: 'implementation_checklist', required: true, min_items: 2 },
      { section_type: 'test_verification', required: true },
      { section_type: 'regression_testing', required: true }
    ],
    conditional_requirements: []
  },
  research: {
    name: 'research',
    display_name: 'Research & Investigation',
    description: 'Structured research with findings documentation',
    required_sections: [
      { section_type: 'title', required: true },
      { section_type: 'description', required: true },
      { section_type: 'research_goals', required: true },
      { section_type: 'findings_documentation', required: true },
      { section_type: 'conclusions', required: true },
      { section_type: 'next_steps', required: true },
      { section_type: 'knowledge_rules', required: true }
    ],
    conditional_requirements: []
  }
};

// Context detection (simplified version of backend logic)
function detectTaskContext(taskData: TaskFormData): 'frontend' | 'backend' | 'full-stack' {
  const backendKeywords = ['api', 'backend', 'database', 'server', 'sql', 'endpoint', 'migration', 'schema'];
  const frontendKeywords = ['ui', 'component', 'styling', 'responsive', 'frontend', 'react', 'css', 'mockup'];
  
  const text = `${taskData.title || ''} ${taskData.description || ''} ${(taskData.stable_tags || []).join(' ')}`.toLowerCase();
  
  let backendScore = 0;
  let frontendScore = 0;
  
  backendKeywords.forEach(keyword => {
    if (text.includes(keyword)) backendScore++;
  });
  
  frontendKeywords.forEach(keyword => {
    if (text.includes(keyword)) frontendScore++;
  });
  
  if (backendScore > 0 && frontendScore === 0) return 'backend';
  if (frontendScore > 0 && backendScore === 0) return 'frontend';
  return 'full-stack';
}

// Check if a checklist exists in the description
function hasChecklist(description: string, pattern?: string, minItems?: number): boolean {
  if (!description) return false;
  
  const checklistPattern = /- \[[\sx]\]/g;
  const matches = description.match(checklistPattern) || [];
  
  if (pattern) {
    const sectionIndex = description.toLowerCase().indexOf(pattern.toLowerCase());
    if (sectionIndex === -1) return false;
    
    const sectionText = description.substring(sectionIndex);
    const sectionMatches = sectionText.match(checklistPattern) || [];
    return sectionMatches.length >= (minItems || 1);
  }
  
  return matches.length >= (minItems || 1);
}

// Check if a section is valid
function validateSection(section: any, taskData: TaskFormData): boolean {
  switch (section.section_type) {
    case 'title':
      return !!taskData.title && taskData.title.trim().length > 0;
      
    case 'description':
      return !!taskData.description && taskData.description.trim().length > 0;
      
    case 'implementation_checklist':
      return hasChecklist(taskData.description || '', 'implementation', section.min_items);
      
    case 'test_checklist':
      return hasChecklist(taskData.description || '', 'test', section.min_items);
      
    case 'reproduction_steps':
      return hasChecklist(taskData.description || '', 'reproduction|reproduce|steps');
      
    case 'test_verification':
      return hasChecklist(taskData.description || '', 'verification|verify');
      
    case 'regression_testing':
      return hasChecklist(taskData.description || '', 'regression');
      
    case 'research_goals':
      return hasChecklist(taskData.description || '', 'goals|objectives');
      
    case 'next_steps':
      return hasChecklist(taskData.description || '', 'next steps|action items');
      
    // For now, return false for sections that require linked items
    case 'architecture':
    case 'mockups':
    case 'rules_creation':
    case 'root_cause_analysis':
    case 'findings_documentation':
    case 'conclusions':
    case 'knowledge_rules':
      return false; // These would need linked notes/rules
      
    default:
      return true;
  }
}

// Get section description
function getSectionDescription(section: any): string {
  const descriptions: Record<string, string> = {
    title: 'Task title',
    description: 'Task description',
    architecture: 'Architecture notes with mermaid diagrams',
    mockups: 'UI mockups using excalidraw',
    implementation_checklist: `Implementation checklist (${section.min_items || 1}+ items)`,
    test_checklist: `Test verification checklist (${section.min_items || 1}+ items)`,
    rules_creation: 'Create rules for best practices',
    reproduction_steps: 'Bug reproduction steps checklist',
    root_cause_analysis: 'Root cause analysis notes',
    test_verification: 'Test verification checklist',
    regression_testing: 'Regression testing checklist',
    research_goals: 'Research goals/objectives checklist',
    findings_documentation: 'Research findings documentation notes',
    conclusions: 'Research conclusions notes',
    next_steps: 'Next steps/action items checklist',
    knowledge_rules: 'Knowledge rules'
  };
  
  return descriptions[section.section_type] || section.section_type;
}

export function useWorkflowValidation(taskData: TaskFormData, selectedWorkflow: string) {
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    is_valid: true,
    completion_percentage: 100,
    requirements: [],
    missing_requirements: []
  });

  const workflowDef = useMemo(() => {
    return WORKFLOW_DEFINITIONS[selectedWorkflow as keyof typeof WORKFLOW_DEFINITIONS] || WORKFLOW_DEFINITIONS.simple;
  }, [selectedWorkflow]);

  useEffect(() => {
    const context = detectTaskContext(taskData);
    const requirements: WorkflowRequirement[] = [];
    const missing: string[] = [];
    let completedCount = 0;
    let totalRequired = 0;

    workflowDef.required_sections.forEach(section => {
      // Check if section should be skipped due to conditional logic
      let isRequired = section.required;
      let skipReason: string | undefined;
      
      if (section.conditional_logic && context === 'backend') {
        const conditionalReq = workflowDef.conditional_requirements.find(
          cr => cr.section_type === section.section_type
        );
        if (conditionalReq) {
          isRequired = false;
          skipReason = conditionalReq.fallback_message;
        }
      }

      if (isRequired) {
        totalRequired++;
        const isValid = validateSection(section, taskData);
        
        if (isValid) {
          completedCount++;
          requirements.push({
            section_type: section.section_type,
            description: getSectionDescription(section),
            status: 'complete'
          });
        } else {
          requirements.push({
            section_type: section.section_type,
            description: getSectionDescription(section),
            status: 'incomplete',
            is_conditional: !!section.conditional_logic
          });
          missing.push(`${section.section_type}: ${getSectionDescription(section)}`);
        }
      } else if (skipReason) {
        requirements.push({
          section_type: section.section_type,
          description: getSectionDescription(section),
          status: 'skipped',
          is_conditional: true,
          skip_reason: skipReason
        });
      }
    });

    const percentage = totalRequired > 0 ? (completedCount / totalRequired) * 100 : 100;

    setValidationStatus({
      is_valid: missing.length === 0,
      completion_percentage: percentage,
      requirements,
      missing_requirements: missing,
      context_type: context
    });
  }, [taskData, workflowDef]);

  return validationStatus;
}
