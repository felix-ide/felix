import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@client/shared/ui/Card';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { ChevronLeft, Trash2, Save, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConditionalRule {
  id: string;
  section: string;
  condition: string;
  required_when_true: boolean;
  required_when_false: boolean;
  description: string;
}

interface RequirementsBuilderProps {
  sections: string[];
  conditionalRules: ConditionalRule[];
  onUpdateRules: (rules: ConditionalRule[]) => void;
  onBack: () => void;
}

const CONDITION_TEMPLATES = [
  { value: 'frontend_work', label: 'Frontend Work Detected', description: 'UI components or styling mentioned' },
  { value: 'backend_work', label: 'Backend Work Detected', description: 'API, database, or server mentioned' },
  { value: 'has_ui_components', label: 'Has UI Components', description: 'Linked UI component files' },
  { value: 'task_type_bug', label: 'Task Type is Bug', description: 'Task type equals "bug"' },
  { value: 'task_type_feature', label: 'Task Type is Feature', description: 'Task type equals "feature"' },
  { value: 'high_priority', label: 'High Priority Task', description: 'Priority is high or critical' }
];

const SECTION_LABELS: Record<string, string> = {
  architecture: 'Architecture Documentation',
  mockups: 'UI Mockups',
  implementation_checklist: 'Implementation Checklist',
  test_checklist: 'Test Verification',
  rules: 'Rules Creation',
  reproduction_steps: 'Reproduction Steps',
  root_cause: 'Root Cause Analysis',
  research_goals: 'Research Goals',
  findings: 'Findings Documentation',
  conclusions: 'Conclusions',
  next_steps: 'Next Steps'
};

export function RequirementsBuilder({
  sections,
  conditionalRules,
  onUpdateRules,
  onBack
}: RequirementsBuilderProps) {
  const [rules, setRules] = useState<ConditionalRule[]>(conditionalRules);
  const [editingRule, setEditingRule] = useState<ConditionalRule | null>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);

  const handleAddRule = () => {
    const newRule: ConditionalRule = {
      id: Date.now().toString(),
      section: sections[0] || '',
      condition: 'frontend_work',
      required_when_true: true,
      required_when_false: false,
      description: ''
    };
    setEditingRule(newRule);
    setShowRuleEditor(true);
  };

  const handleEditRule = (rule: ConditionalRule) => {
    setEditingRule(rule);
    setShowRuleEditor(true);
  };

  const handleSaveRule = (rule: ConditionalRule) => {
    if (editingRule && rules.find(r => r.id === editingRule.id)) {
      // Update existing rule
      setRules(rules.map(r => r.id === rule.id ? rule : r));
    } else {
      // Add new rule
      setRules([...rules, rule]);
    }
    setShowRuleEditor(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const handleSave = () => {
    onUpdateRules(rules);
    onBack();
  };

  if (showRuleEditor && editingRule) {
    return (
      <RuleEditor
        rule={editingRule}
        sections={sections}
        onSave={handleSaveRule}
        onCancel={() => {
          setShowRuleEditor(false);
          setEditingRule(null);
        }}
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
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            Conditional Requirements
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Configure when sections become required or optional based on task context.
          </div>

          {/* Rules List */}
          {rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map(rule => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {SECTION_LABELS[rule.section] || rule.section}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">When:</span>{' '}
                        {CONDITION_TEMPLATES.find(c => c.value === rule.condition)?.label || rule.condition}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Then:</span>{' '}
                        {rule.required_when_true ? 'Required' : 'Optional'}
                        {' • '}
                        <span className="font-medium">Otherwise:</span>{' '}
                        {rule.required_when_false ? 'Required' : 'Optional'}
                      </p>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {rule.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No conditional rules configured yet.
              </p>
              <Button onClick={handleAddRule}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Rule
              </Button>
            </Card>
          )}

          {rules.length > 0 && (
            <Button onClick={handleAddRule} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Rule
            </Button>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Rules
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Rule Editor Component
function RuleEditor({
  rule,
  sections,
  onSave,
  onCancel
}: {
  rule: ConditionalRule;
  sections: string[];
  onSave: (rule: ConditionalRule) => void;
  onCancel: () => void;
}) {
  const [section, setSection] = useState(rule.section);
  const [condition, setCondition] = useState(rule.condition);
  const [requiredWhenTrue, setRequiredWhenTrue] = useState(rule.required_when_true);
  const [requiredWhenFalse, setRequiredWhenFalse] = useState(rule.required_when_false);
  const [description, setDescription] = useState(rule.description);

  const handleSave = () => {
    onSave({
      ...rule,
      section,
      condition,
      required_when_true: requiredWhenTrue,
      required_when_false: requiredWhenFalse,
      description
    });
  };

  return (
    <div className="p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Conditional Rule</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Section
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            >
              {sections.map(s => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s] || s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            >
              {CONDITION_TEMPLATES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {CONDITION_TEMPLATES.find(c => c.value === condition)?.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                When condition is TRUE
              </label>
              <select
                value={requiredWhenTrue ? 'required' : 'optional'}
                onChange={(e) => setRequiredWhenTrue(e.target.value === 'required')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="required">Required</option>
                <option value="optional">Optional</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                When condition is FALSE
              </label>
              <select
                value={requiredWhenFalse ? 'required' : 'optional'}
                onChange={(e) => setRequiredWhenFalse(e.target.value === 'required')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              >
                <option value="required">Required</option>
                <option value="optional">Optional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context for this rule..."
            />
          </div>

          {/* Preview */}
          <div className="p-4 border rounded-md bg-muted/30">
            <p className="text-sm">
              <span className="font-medium">{SECTION_LABELS[section] || section}</span> is{' '}
              <span className={cn('font-medium', requiredWhenTrue ? 'text-red-600' : 'text-green-600')}>
                {requiredWhenTrue ? 'required' : 'optional'}
              </span>{' '}
              when {CONDITION_TEMPLATES.find(c => c.value === condition)?.label.toLowerCase()}, 
              otherwise it's{' '}
              <span className={cn('font-medium', requiredWhenFalse ? 'text-red-600' : 'text-green-600')}>
                {requiredWhenFalse ? 'required' : 'optional'}
              </span>.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Rule
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}