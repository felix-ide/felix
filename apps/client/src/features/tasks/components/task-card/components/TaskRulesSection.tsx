import type { CSSProperties } from 'react';
import { Button } from '@client/shared/ui/Button';
import { Minimize2, Expand } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TaskRulesSectionProps {
  rules: any[];
  expandedRuleId: string | null;
  onToggleRule: (ruleId: string | null) => void;
  getRuleTypeStyles: (type: string) => CSSProperties;
}

export function TaskRulesSection({ rules, expandedRuleId, onToggleRule, getRuleTypeStyles }: TaskRulesSectionProps) {
  if (!rules.length) return null;

  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <h4 className="text-xs font-medium text-muted-foreground mb-2">🔧 Linked Rules</h4>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {rules.map((rule) => {
          const isExpanded = expandedRuleId === rule.id;
          return (
            <div
              key={rule.id}
              className={cn(
                'bg-background/50 rounded-md border border-border hover:border-primary/50 transition-all group relative',
                isExpanded ? 'p-3' : 'p-2'
              )}
            >
              <div className="absolute top-2 left-2 z-20 flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 bg-background/80 hover:bg-background border border-border"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleRule(isExpanded ? null : rule.id);
                  }}
                >
                  {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Expand className="h-3 w-3" />}
                </Button>
              </div>

              <div className="flex items-start justify-between mb-1 pl-8">
                <span className={cn('font-medium', isExpanded ? 'text-sm' : 'text-xs line-clamp-1')}>
                  {rule.name}
                </span>
                <span className="px-1.5 py-0.5 rounded ml-2 text-xs border" style={getRuleTypeStyles(rule.rule_type)}>
                  {rule.rule_type}
                </span>
              </div>

              {rule.description && (
                <p
                  className={cn(
                    'text-muted-foreground mb-2',
                    isExpanded ? 'text-sm' : 'text-xs line-clamp-2'
                  )}
                >
                  {rule.description}
                </p>
              )}

              {isExpanded && (
                <div className="space-y-3 text-xs">
                  {rule.guidance_text && (
                    <div className="mt-2 p-2 bg-accent/30 rounded text-sm">
                      <span className="font-medium">Guidance:</span>
                      <p className="mt-1">{rule.guidance_text}</p>
                    </div>
                  )}

                  {rule.code_template && (
                    <div className="mt-2 p-2 bg-muted rounded">
                      <span className="text-sm font-medium">Template:</span>
                      <pre className="mt-1 text-xs overflow-x-auto">
                        <code>{rule.code_template}</code>
                      </pre>
                    </div>
                  )}

                  {rule.validation_script && (
                    <div className="mt-2 p-2 bg-muted rounded">
                      <span className="text-sm font-medium">Validation:</span>
                      <pre className="mt-1 text-xs overflow-x-auto">
                        <code>{rule.validation_script}</code>
                      </pre>
                    </div>
                  )}

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    {rule.priority && (
                      <div>
                        <span className="text-muted-foreground">Priority:</span>{' '}
                        <span className="font-medium">{rule.priority}/10</span>
                      </div>
                    )}
                    {rule.confidence_threshold && (
                      <div>
                        <span className="text-muted-foreground">Confidence:</span>{' '}
                        <span className="font-medium">{(rule.confidence_threshold * 100).toFixed(0)}%</span>
                      </div>
                    )}
                    {rule.auto_apply !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Auto-apply:</span>{' '}
                        <span className="font-medium">{rule.auto_apply ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                    {rule.is_active !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Active:</span>{' '}
                        <span className="font-medium">{rule.is_active ? 'Yes' : 'No'}</span>
                      </div>
                    )}
                  </div>

                  {rule.trigger_patterns && (
                    <div className="mt-2 p-2 bg-accent/20 rounded">
                      <span className="text-xs font-medium">Triggers:</span>
                      <div className="mt-1 space-y-1">
                        {rule.trigger_patterns.files?.length > 0 && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Files:</span> {rule.trigger_patterns.files.join(', ')}
                          </div>
                        )}
                        {rule.trigger_patterns.components?.length > 0 && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Components:</span> {rule.trigger_patterns.components.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
