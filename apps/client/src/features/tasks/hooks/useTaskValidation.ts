import { useState, useEffect, useCallback } from 'react';
import type { TaskData } from '@/types/api';

export interface WorkflowRequirement {
  name: string;
  type: 'architecture' | 'mockups' | 'checklist' | 'test' | 'rules';
  required: boolean;
  met: boolean;
  conditional?: boolean;
  helpText?: string;
}

export interface ValidationStatus {
  isValid: boolean;
  completionPercentage: number;
  status: 'valid' | 'incomplete' | 'invalid';
  requirements: WorkflowRequirement[];
  missingRequirements: WorkflowRequirement[];
}

// Mock workflow requirements - should be fetched from backend
const WORKFLOW_REQUIREMENTS = {
  simple: [],
  feature_development: [
    {
      name: 'Architecture documentation',
      type: 'architecture' as const,
      required: true,
      helpText: 'Create linked note with mermaid diagrams'
    },
    {
      name: 'Mockups',
      type: 'mockups' as const,
      required: true,
      conditional: true,
      helpText: 'Add excalidraw mockups (optional for backend)'
    },
    {
      name: 'Implementation checklist',
      type: 'checklist' as const,
      required: true,
      helpText: 'Add at least 3 implementation items'
    },
    {
      name: 'Test verification checklist',
      type: 'test' as const,
      required: true,
      helpText: 'Add at least 2 test items'
    },
    {
      name: 'Rules creation',
      type: 'rules' as const,
      required: true,
      helpText: 'Create rules from learnings'
    }
  ],
  bugfix: [
    {
      name: 'Reproduction steps',
      type: 'checklist' as const,
      required: true,
      helpText: 'Document steps to reproduce the bug'
    },
    {
      name: 'Root cause analysis',
      type: 'architecture' as const,
      required: true,
      helpText: 'Document the root cause'
    },
    {
      name: 'Test verification',
      type: 'test' as const,
      required: true,
      helpText: 'Add test cases to verify fix'
    }
  ],
  research: [
    {
      name: 'Research goals',
      type: 'checklist' as const,
      required: true,
      helpText: 'Define research objectives'
    },
    {
      name: 'Findings documentation',
      type: 'architecture' as const,
      required: true,
      helpText: 'Document research findings'
    },
    {
      name: 'Next steps',
      type: 'checklist' as const,
      required: true,
      helpText: 'Define actionable next steps'
    }
  ]
};

function detectTaskContext(task: TaskData): 'frontend' | 'backend' | 'fullstack' {
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  const tags = task.stable_tags || [];
  
  const backendIndicators = ['api', 'backend', 'database', 'server', 'sql'];
  const frontendIndicators = ['ui', 'component', 'styling', 'responsive', 'user interface'];
  
  const hasBackend = backendIndicators.some(term => text.includes(term)) || 
                     tags.includes('backend-only');
  const hasFrontend = frontendIndicators.some(term => text.includes(term)) || 
                      tags.includes('frontend-only');
  
  if (hasBackend && !hasFrontend) return 'backend';
  if (hasFrontend && !hasBackend) return 'frontend';
  return 'fullstack';
}

function checkRequirementMet(task: TaskData, requirement: WorkflowRequirement): boolean {
  // Check for linked notes
  if (requirement.type === 'architecture' || requirement.type === 'mockups') {
    const hasLinkedNotes = (task.entity_links || []).some(
      link => link.entity_type === 'note'
    );
    return hasLinkedNotes;
  }
  
  // Check for checklists in description
  if (requirement.type === 'checklist' || requirement.type === 'test') {
    const hasChecklist = (task.description || '').includes('- [ ]');
    const checklistItems = (task.description || '').match(/- \[[ x]\]/g) || [];
    return hasChecklist && checklistItems.length >= (requirement.type === 'checklist' ? 3 : 2);
  }
  
  // Check for linked rules
  if (requirement.type === 'rules') {
    const hasLinkedRules = (task.entity_links || []).some(
      link => link.entity_type === 'rule'
    );
    return hasLinkedRules;
  }
  
  return false;
}

export function useTaskValidation(task: TaskData | null, workflow: string) {
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    isValid: true,
    completionPercentage: 100,
    status: 'valid',
    requirements: [],
    missingRequirements: []
  });

  useEffect(() => {
    if (!task) {
      setValidationStatus({
        isValid: true,
        completionPercentage: 100,
        status: 'valid',
        requirements: [],
        missingRequirements: []
      });
      return;
    }

    const workflowRequirements = WORKFLOW_REQUIREMENTS[workflow as keyof typeof WORKFLOW_REQUIREMENTS] || [];
    const context = detectTaskContext(task);
    
    const requirements: WorkflowRequirement[] = workflowRequirements.map(req => {
      let required = req.required;
      
      // Apply conditional logic
      if (req.name === 'Mockups' && context === 'backend') {
        required = false;
      }
      
      const met = checkRequirementMet(task, req as WorkflowRequirement);
      
      return {
        ...req,
        required,
        met
      };
    });
    
    const requiredReqs = requirements.filter(r => r.required);
    const metRequiredReqs = requiredReqs.filter(r => r.met);
    const missingRequirements = requirements.filter(r => r.required && !r.met);
    
    const completionPercentage = requiredReqs.length > 0
      ? (metRequiredReqs.length / requiredReqs.length) * 100
      : 100;
    
    const isValid = missingRequirements.length === 0;
    const status = isValid ? 'valid' : completionPercentage > 50 ? 'incomplete' : 'invalid';
    
    setValidationStatus({
      isValid,
      completionPercentage,
      status,
      requirements,
      missingRequirements
    });
  }, [task, workflow]);

  const validateTask = useCallback(() => {
    // Re-validation happens automatically via useEffect above
  }, []);

  return {
    ...validationStatus,
    revalidate: validateTask
  };
}