import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { ChevronLeft, Save, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/utils/cn';
import { RequirementsBuilder } from './RequirementsBuilder';

interface WorkflowDefinition {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_default: boolean;
  required_sections: any[];
  conditional_requirements?: any[];
  validation_rules?: any[];
}

interface WorkflowEditorProps {
  workflow: WorkflowDefinition;
  isNew: boolean;
  onSave: (workflow: WorkflowDefinition) => void;
  onCancel: () => void;
}

const SECTION_TYPES = [
  { value: 'architecture', label: 'Architecture Documentation', icon: '📐' },
  { value: 'mockups', label: 'UI Mockups', icon: '🎨' },
  { value: 'implementation_checklist', label: 'Implementation Checklist', icon: '✅' },
  { value: 'test_checklist', label: 'Test Verification', icon: '🧪' },
  { value: 'rules', label: 'Rules Creation', icon: '📋' },
  { value: 'reproduction_steps', label: 'Reproduction Steps', icon: '🔄' },
  { value: 'root_cause', label: 'Root Cause Analysis', icon: '🔍' },
  { value: 'research_goals', label: 'Research Goals', icon: '🎯' },
  { value: 'findings', label: 'Findings Documentation', icon: '📊' },
  { value: 'conclusions', label: 'Conclusions', icon: '💡' },
  { value: 'next_steps', label: 'Next Steps', icon: '➡️' }
];

export function WorkflowEditor({
  workflow,
  isNew,
  onSave,
  onCancel
}: WorkflowEditorProps) {
  const [name, setName] = useState(workflow.name);
  const [displayName, setDisplayName] = useState(workflow.display_name);
  const [description, setDescription] = useState(workflow.description);
  const [sections, setSections] = useState<string[]>(workflow.required_sections || []);
  const [conditionalRules, setConditionalRules] = useState(workflow.conditional_requirements || []);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showRequirementsBuilder, setShowRequirementsBuilder] = useState(false);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!name.trim()) {
      errors.name = 'Workflow name is required';
    } else if (!/^[a-z_]+$/.test(name)) {
      errors.name = 'Name must be lowercase with underscores only';
    }
    
    if (!displayName.trim()) {
      errors.displayName = 'Display name is required';
    }
    
    if (!description.trim()) {
      errors.description = 'Description is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    
    onSave({
      ...workflow,
      name: name.trim(),
      display_name: displayName.trim(),
      description: description.trim(),
      required_sections: sections,
      conditional_requirements: conditionalRules
    });
  };

  const addSection = (sectionType: string) => {
    if (!sections.includes(sectionType)) {
      setSections([...sections, sectionType]);
    }
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < sections.length) {
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      setSections(newSections);
    }
  };

  const getSectionLabel = (sectionType: string) => {
    return SECTION_TYPES.find(s => s.value === sectionType)?.label || sectionType;
  };

  const getSectionIcon = (sectionType: string) => {
    return SECTION_TYPES.find(s => s.value === sectionType)?.icon || '📄';
  };

  if (showRequirementsBuilder) {
    return (
      <RequirementsBuilder
        sections={sections}
        conditionalRules={conditionalRules}
        onUpdateRules={setConditionalRules}
        onBack={() => setShowRequirementsBuilder(false)}
      />
    );
  }

  return (
    <div className="p-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {isNew ? 'Create New Workflow' : `Edit ${workflow.display_name}`}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Internal Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., feature_development"
                className={cn(validationErrors.name && 'border-destructive')}
              />
              {validationErrors.name && (
                <p className="text-sm text-destructive mt-1">{validationErrors.name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase with underscores, used in code
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Display Name *
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Feature Development"
                className={cn(validationErrors.displayName && 'border-destructive')}
              />
              {validationErrors.displayName && (
                <p className="text-sm text-destructive mt-1">{validationErrors.displayName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when to use this workflow..."
                className={cn(
                  'w-full h-20 p-3 border border-border rounded-md',
                  'bg-background text-sm resize-none',
                  'focus:outline-none focus:ring-1 focus:ring-primary/50',
                  validationErrors.description && 'border-destructive'
                )}
              />
              {validationErrors.description && (
                <p className="text-sm text-destructive mt-1">{validationErrors.description}</p>
              )}
            </div>
          </div>

          {/* Required Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Required Sections</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRequirementsBuilder(true)}
              >
                Configure Conditions
              </Button>
            </div>

            {/* Current Sections */}
            {sections.length > 0 && (
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-md bg-muted/30"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <span className="text-lg">{getSectionIcon(section)}</span>
                    <span className="flex-1 text-sm font-medium">
                      {getSectionLabel(section)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSection(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSection(index, 'down')}
                        disabled={index === sections.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSection(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Section Dropdown */}
            <div className="flex items-center gap-2">
              <select
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    addSection(e.target.value);
                    e.target.value = '';
                  }
                }}
                value=""
              >
                <option value="">Add a section...</option>
                {SECTION_TYPES.filter(s => !sections.includes(s.value)).map(section => (
                  <option key={section.value} value={section.value}>
                    {section.icon} {section.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditional Rules Summary */}
            {conditionalRules.length > 0 && (
              <div className="p-3 border rounded-md bg-muted/30">
                <p className="text-sm font-medium mb-1">Conditional Rules:</p>
                <p className="text-sm text-muted-foreground">
                  {conditionalRules.length} rule{conditionalRules.length !== 1 ? 's' : ''} configured
                </p>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="font-medium">Preview</h3>
            <div className="p-4 border rounded-md bg-muted/30">
              <h4 className="font-medium mb-2">{displayName || 'Workflow Name'}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {description || 'Workflow description...'}
              </p>
              {sections.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Required:</p>
                  {sections.map((section, index) => (
                    <div key={index} className="text-sm text-muted-foreground ml-4">
                      • {getSectionLabel(section)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No sections configured
                </p>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {isNew ? 'Create Workflow' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}