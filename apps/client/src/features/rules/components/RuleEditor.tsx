import { useState, useEffect, useCallback } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Input } from '@client/shared/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@client/shared/ui/Card';
import { Save, X, Link, Tag, Eye, Settings, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EntityLinksSection, EntityLink } from '@client/shared/components/EntityLinksSection';
import { TriggerPatternEditor, type TriggerPatterns, type SemanticTriggers, type ContextConditions } from './TriggerPatternEditor';
import { RulePreview } from './RulePreview';
import type { RuleData } from '@/types/api';

interface RuleEditorProps {
  rule?: RuleData;
  parentId?: string;
  isOpen: boolean;
  onSave: (rule: Omit<RuleData, 'id' | 'created_at' | 'updated_at' | 'sort_order' | 'depth_level' | 'usage_count' | 'acceptance_rate' | 'effectiveness_score'>) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function RuleEditor({
  rule,
  parentId,
  isOpen,
  onSave,
  onCancel,
  className,
}: RuleEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<'pattern' | 'constraint' | 'semantic' | 'automation'>('pattern');
  const [guidanceText, setGuidanceText] = useState('');
  const [codeTemplate, setCodeTemplate] = useState('');
  const [priority, setPriority] = useState(5);
  const [autoApply, setAutoApply] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [active, setActive] = useState(true);
  const [entityLinks, setEntityLinks] = useState<EntityLink[]>([]);
  
  // Smart trigger states
  const [triggerPatterns, setTriggerPatterns] = useState<TriggerPatterns>({});
  const [semanticTriggers, setSemanticTriggers] = useState<SemanticTriggers>({});
  const [contextConditions, setContextConditions] = useState<ContextConditions>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const handleEntityLinksUpdate = useCallback((links: EntityLink[]) => {
    console.log('🔍 RuleEditor - entityLinks updated:', links);
    setEntityLinks(links);
  }, []);
  
  console.log('🔍 RuleEditor - handleEntityLinksUpdate function:', handleEntityLinksUpdate);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when rule changes or editor opens/closes
  useEffect(() => {
    if (isOpen) {
      if (rule) {
        // Editing existing rule
        setName(rule.name);
        setDescription(rule.description || '');
        setRuleType(rule.rule_type);
        setGuidanceText(rule.guidance_text);
        setCodeTemplate(rule.code_template || '');
        setPriority(rule.priority);
        setAutoApply(rule.auto_apply);
        setConfidenceThreshold(rule.confidence_threshold);
        setActive(rule.active);
        setEntityLinks(rule.entity_links || []);
        setTags(rule.stable_tags || []);
        setTriggerPatterns(rule.trigger_patterns || {});
        setSemanticTriggers(rule.semantic_triggers || {});
        setContextConditions(rule.context_conditions || {});
      } else {
        // Creating new rule
        setName('');
        setDescription('');
        setRuleType('pattern');
        setGuidanceText('');
        setCodeTemplate('');
        setPriority(5);
        setAutoApply(false);
        setConfidenceThreshold(0.8);
        setActive(true);
        setEntityLinks([]);
        setTags([]);
        setTriggerPatterns({});
        setSemanticTriggers({});
        setContextConditions({});
      }
      setNewTag('');
    }
  }, [isOpen, rule]);

  const handleSave = async () => {
    if (!name.trim() || !guidanceText.trim()) {
      return; // Basic validation
    }

    setIsSaving(true);
    try {
      const ruleData = {
        name: name.trim(),
        description: description.trim() || '',
        rule_type: ruleType,
        guidance_text: guidanceText.trim(),
        code_template: codeTemplate.trim() || undefined,
        priority,
        auto_apply: autoApply,
        confidence_threshold: confidenceThreshold,
        active,
        trigger_patterns: triggerPatterns,
        semantic_triggers: semanticTriggers,
        context_conditions: contextConditions,
        merge_strategy: 'append' as const,
        parent_id: parentId || rule?.parent_id || undefined,
        entity_links: entityLinks,
        stable_tags: tags,
      };

      await onSave(ruleData);
      onCancel(); // Close the editor
    } catch (error) {
      console.error('Failed to save rule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.id === 'new-tag') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={cn("w-full max-w-2xl max-h-[90vh] overflow-y-auto", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{rule ? 'Edit Rule' : 'Create New Rule'}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rule name"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="pattern">🔧 Pattern</option>
                <option value="constraint">🛡️ Constraint</option>
                <option value="semantic">🧠 Semantic</option>
                <option value="automation">⚡ Automation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description (optional)"
              className="w-full"
            />
          </div>

          {/* Guidance Text */}
          <div>
            <label className="text-sm font-medium mb-1 block">Guidance Text *</label>
            <textarea
              value={guidanceText}
              onChange={(e) => setGuidanceText(e.target.value)}
              placeholder="Rule guidance and instructions (supports markdown)"
              className="w-full min-h-[120px] px-3 py-2 text-sm border border-input rounded-md bg-background resize-none font-mono"
              rows={6}
            />
          </div>

          {/* Code Template (for automation rules) */}
          {ruleType === 'automation' && (
            <div>
              <label className="text-sm font-medium mb-1 block">Code Template</label>
              <textarea
                value={codeTemplate}
                onChange={(e) => setCodeTemplate(e.target.value)}
                placeholder="Code template for automation (optional)"
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-input rounded-md bg-background resize-none font-mono"
                rows={4}
              />
            </div>
          )}

          {/* Rule Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 5)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Confidence</label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value) || 0.8)}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                  className="rounded"
                />
                Auto-apply
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </div>

          {/* Entity Linking */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              <Link className="h-4 w-4 inline mr-1" />
              Entity Links
            </label>
            <EntityLinksSection
              entityLinks={entityLinks}
              onEntityLinksUpdate={setEntityLinks}
              allowedEntityTypes={['component', 'note', 'task', 'rule']}
              compact={true}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              <Tag className="h-4 w-4 inline mr-1" />
              Tags
            </label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-sm rounded"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                id="new-tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add tag..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Smart Trigger Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Smart Triggers
              </h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className={cn(
                    "flex items-center space-x-2",
                    showPreview && "bg-blue-50 /20/20"
                  )}
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={cn(
                    "flex items-center space-x-2",
                    showAdvanced && "bg-blue-50 /20/20"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span>Configure</span>
                </Button>
              </div>
            </div>

            {showAdvanced && (
              <TriggerPatternEditor
                triggerPatterns={triggerPatterns}
                semanticTriggers={semanticTriggers}
                contextConditions={contextConditions}
                onTriggerPatternsChange={setTriggerPatterns}
                onSemanticTriggersChange={setSemanticTriggers}
                onContextConditionsChange={setContextConditions}
              />
            )}

            {showPreview && (
              <RulePreview
                rule={{
                  name,
                  description,
                  rule_type: ruleType,
                  guidance_text: guidanceText,
                  priority,
                  confidence_threshold: confidenceThreshold,
                  active
                }}
                triggerPatterns={triggerPatterns}
                semanticTriggers={semanticTriggers}
                contextConditions={contextConditions}
              />
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || !guidanceText.trim()}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Rule'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}