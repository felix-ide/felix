import { ChevronDown, Tag } from 'lucide-react';
import type { Theme } from '@felix/theme-system';
import type { RuleData } from '@/types/api';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { MarkdownEditor } from '@client/shared/components/MarkdownEditor';
import type { RuleCardEditingApi } from './useRuleCardEditing';

interface RuleCardExpandedContentProps {
  rule: RuleData;
  theme: Theme;
  editing: RuleCardEditingApi;
  isGuidanceExpanded: boolean;
  onCollapseGuidance: () => void;
}

export function RuleCardExpandedContent({
  rule,
  theme,
  editing,
  isGuidanceExpanded,
  onCollapseGuidance,
}: RuleCardExpandedContentProps) {
  const { isEditing, formState, updateField } = editing;

  if (!isGuidanceExpanded && !isEditing) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {isEditing ? (
        <>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea
              value={formState.description}
              onChange={(event) => updateField('description', event.target.value)}
              onClick={(event) => event.stopPropagation()}
              placeholder="Rule description..."
              className="w-full text-sm bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50 mt-1"
              rows={2}
            />
          </div>

          <div onClick={(event) => event.stopPropagation()}>
            <label className="text-xs text-muted-foreground">Guidance Text (Markdown supported)</label>
            <div className="mt-1">
              <MarkdownEditor
                value={formState.guidance_text}
                onChange={(value) => updateField('guidance_text', value)}
                placeholder="Detailed guidance text for this rule... (supports markdown)"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {rule.description ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Description</div>
              <div className="text-sm text-foreground bg-muted/30 rounded px-2 py-1.5">{rule.description}</div>
            </div>
          ) : null}

          {rule.guidance_text ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Guidance</div>
              <div className="bg-muted/30 rounded px-2 py-1.5">
                <MarkdownRenderer content={rule.guidance_text} />
              </div>
            </div>
          ) : null}

          {rule.code_template ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Code Template</div>
              <pre className="text-xs bg-muted/30 rounded px-2 py-1.5 overflow-x-auto">
                <code>{rule.code_template}</code>
              </pre>
            </div>
          ) : null}

          {rule.validation_script ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Validation Script</div>
              <pre className="text-xs bg-muted/30 rounded px-2 py-1.5 overflow-x-auto">
                <code>{rule.validation_script}</code>
              </pre>
            </div>
          ) : null}

          {rule.trigger_patterns && Object.keys(rule.trigger_patterns).length > 0 ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Trigger Patterns</div>
              <pre className="text-xs bg-muted/30 rounded px-2 py-1.5 overflow-x-auto">
                <code>{JSON.stringify(rule.trigger_patterns, null, 2)}</code>
              </pre>
            </div>
          ) : null}

          {rule.semantic_triggers && Object.keys(rule.semantic_triggers).length > 0 ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Semantic Triggers</div>
              <pre className="text-xs bg-muted/30 rounded px-2 py-1.5 overflow-x-auto">
                <code>{JSON.stringify(rule.semantic_triggers, null, 2)}</code>
              </pre>
            </div>
          ) : null}

          {rule.context_conditions && Object.keys(rule.context_conditions).length > 0 ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Context Conditions</div>
              <pre className="text-xs bg-muted/30 rounded px-2 py-1.5 overflow-x-auto">
                <code>{JSON.stringify(rule.context_conditions, null, 2)}</code>
              </pre>
            </div>
          ) : null}

          {rule.exclusion_patterns && Object.keys(rule.exclusion_patterns).length > 0 ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Exclusion Patterns</div>
              <pre className="text-xs bg-muted/30 rounded px-2 py-1.5 overflow-x-auto">
                <code>{JSON.stringify(rule.exclusion_patterns, null, 2)}</code>
              </pre>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            <div className="px-2 py-1 bg-muted/30 rounded">
              <span className="text-muted-foreground">Merge: </span>
              <span className="font-medium">{rule.merge_strategy}</span>
            </div>
            <div className="px-2 py-1 bg-muted/30 rounded">
              <span className="text-muted-foreground">Confidence: </span>
              <span className="font-medium">{Math.round(rule.confidence_threshold * 100)}%</span>
            </div>
            {rule.parent_id ? (
              <div className="px-2 py-1 bg-muted/30 rounded">
                <span className="text-muted-foreground">Parent: </span>
                <span className="font-mono text-xs">{rule.parent_id.slice(-8)}</span>
              </div>
            ) : null}
          </div>
        </>
      )}

      {isGuidanceExpanded && !isEditing && rule.stable_tags?.length ? (
        <div className="flex flex-wrap gap-1 mb-3">
          {rule.stable_tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border"
              style={{
                backgroundColor:
                  theme.type === 'dark'
                    ? `${theme.colors.background.tertiary}73`
                    : theme.colors.accent[50],
                color:
                  theme.type === 'dark'
                    ? theme.colors.accent[300]
                    : theme.colors.accent[700],
                borderColor:
                  theme.type === 'dark'
                    ? theme.colors.border.primary
                    : theme.colors.accent[200],
              }}
            >
              <Tag className="h-2 w-2" />
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {isGuidanceExpanded && !isEditing ? (
        <div className="flex justify-end">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onCollapseGuidance();
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
            Less
          </button>
        </div>
      ) : null}
    </div>
  );
}
