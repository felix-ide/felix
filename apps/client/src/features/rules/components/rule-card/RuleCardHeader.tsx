import { KeyboardEvent, MouseEvent, RefObject } from 'react';
import {
  Edit,
  Trash2,
  GripVertical,
  Hash,
  Copy,
  MoreVertical,
  Download,
  Plus,
  ChevronUp,
  Check,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import type { Theme } from '@felix/theme-system';
import type { RuleData } from '@/types/api';
import { MarkdownEditor } from '@client/shared/components/MarkdownEditor';
import { getRuleTypeInfo, toShortId } from './utils';
import type { RuleCardEditingApi } from './useRuleCardEditing';

interface RuleCardHeaderProps {
  rule: RuleData;
  theme: Theme;
  className?: string;
  isChecked: boolean;
  onToggleCheck?: () => void;
  dragHandleProps?: any;
  editing: RuleCardEditingApi;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditClick: (event: MouseEvent) => void;
  isGuidanceExpanded: boolean;
  onCollapseGuidance: () => void;
  onAddSubRule?: (ruleId: string) => void;
  showDropdown: boolean;
  onDropdownToggle: () => void;
  dropdownRef: RefObject<HTMLDivElement>;
  onExportRule: () => void;
  onDeleteRule?: () => void;
  copiedId: boolean;
  onCopyId: () => void;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export function RuleCardHeader({
  rule,
  theme,
  className,
  isChecked,
  onToggleCheck,
  dragHandleProps,
  editing,
  onSaveEdit,
  onCancelEdit,
  onEditClick,
  isGuidanceExpanded,
  onCollapseGuidance,
  onAddSubRule,
  showDropdown,
  onDropdownToggle,
  dropdownRef,
  onExportRule,
  onDeleteRule,
  copiedId,
  onCopyId,
  onKeyDown,
}: RuleCardHeaderProps) {
  const { isEditing, formState, updateField } = editing;
  const ruleTypeInfo = getRuleTypeInfo(theme, rule.rule_type);
  const RuleTypeIcon = ruleTypeInfo.icon;

  return (
    <div className={cn('flex items-start gap-3', (isGuidanceExpanded || isEditing) && 'mb-3', className)}>
      {onToggleCheck && (
        <div className="mt-1">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) => {
              event.stopPropagation();
              onToggleCheck();
            }}
            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
          />
        </div>
      )}

      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="mt-1 p-1 hover:bg-accent rounded cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium"
            style={ruleTypeInfo.styles}
          >
            <RuleTypeIcon className="h-3 w-3 mr-1" />
            {rule.rule_type}
          </div>

          {isEditing ? (
            <input
              type="text"
              value={formState.name}
              onChange={(event) => updateField('name', event.target.value)}
              onKeyDown={onKeyDown}
              onClick={(event) => event.stopPropagation()}
              placeholder="Rule name"
              className="font-medium text-sm flex-1 bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          ) : (
            <h3 className="font-medium text-sm flex-1">{rule.name}</h3>
          )}

          {!isEditing && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onCopyId();
              }}
              className="group flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors"
              style={{
                backgroundColor:
                  theme.type === 'dark'
                    ? `${theme.colors.background.tertiary}73`
                    : theme.colors.secondary[50],
                color:
                  theme.type === 'dark'
                    ? theme.colors.foreground.secondary
                    : theme.colors.secondary[800],
                borderColor:
                  theme.type === 'dark'
                    ? theme.colors.border.primary
                    : theme.colors.secondary[200],
              }}
              title={`Copy ID: ${rule.id}`}
            >
              <Hash className="h-3 w-3" />
              <span className="text-xs font-mono">{toShortId(rule.id)}</span>
              <Copy
                className={cn(
                  'h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity',
                  copiedId ? 'text-success' : 'opacity-60',
                )}
              />
              {copiedId && <span className="text-xs text-success ml-1">Copied!</span>}
            </button>
          )}

          <span className="text-xs text-muted-foreground">P{rule.priority}</span>

          {rule.auto_apply ? (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs border"
              style={{
                backgroundColor:
                  theme.type === 'dark'
                    ? `${theme.colors.background.tertiary}73`
                    : theme.colors.success[50],
                color:
                  theme.type === 'dark'
                    ? theme.colors.success[300]
                    : theme.colors.success[700],
                borderColor:
                  theme.type === 'dark'
                    ? theme.colors.border.primary
                    : theme.colors.success[200],
              }}
            >
              Auto
            </span>
          ) : null}

          {rule.active ? (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        {isEditing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={formState.rule_type}
                onChange={(event) => updateField('rule_type', event.target.value as RuleData['rule_type'])}
                onClick={(event) => event.stopPropagation()}
                className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="pattern">Pattern</option>
                <option value="constraint">Constraint</option>
                <option value="semantic">Semantic</option>
                <option value="automation">Automation</option>
              </select>

              <input
                type="number"
                min="1"
                max="10"
                value={formState.priority}
                onChange={(event) => updateField('priority', parseInt(event.target.value, 10))}
                onClick={(event) => event.stopPropagation()}
                className="w-16 text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="Priority"
              />

              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.auto_apply}
                  onChange={(event) => updateField('auto_apply', event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                  className="rounded"
                />
                Auto-apply
              </label>

              <select
                value={formState.merge_strategy}
                onChange={(event) =>
                  updateField('merge_strategy', event.target.value as RuleData['merge_strategy'])
                }
                onClick={(event) => event.stopPropagation()}
                className="text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                title="Merge Strategy"
              >
                <option value="append">Append</option>
                <option value="replace">Replace</option>
                <option value="merge">Merge</option>
              </select>

              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={formState.confidence_threshold}
                onChange={(event) => updateField('confidence_threshold', parseFloat(event.target.value))}
                onClick={(event) => event.stopPropagation()}
                className="w-16 text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="Conf"
                title="Confidence Threshold (0-1)"
              />
            </div>

            {formState.rule_type === 'automation' && (
              <div className="space-y-1" onClick={(event) => event.stopPropagation()}>
                <label className="text-xs text-muted-foreground">Code Template</label>
                <MarkdownEditor
                  value={formState.code_template}
                  onChange={(value) => updateField('code_template', value)}
                  placeholder="Code template for automation..."
                />
              </div>
            )}

            {formState.rule_type === 'constraint' && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Validation Script</label>
                <textarea
                  value={formState.validation_script}
                  onChange={(event) => updateField('validation_script', event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  placeholder="Validation script..."
                  className="w-full text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  rows={2}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Trigger Patterns (JSON)</label>
              <textarea
                value={JSON.stringify(formState.trigger_patterns, null, 2)}
                onChange={(event) => {
                  try {
                    updateField('trigger_patterns', JSON.parse(event.target.value));
                  } catch {
                    /* ignore parse errors */
                  }
                }}
                onClick={(event) => event.stopPropagation()}
                placeholder='{"files": ["*.ts"], "paths": ["src"]}'
                className="w-full text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Semantic Triggers (JSON)</label>
              <textarea
                value={JSON.stringify(formState.semantic_triggers, null, 2)}
                onChange={(event) => {
                  try {
                    updateField('semantic_triggers', JSON.parse(event.target.value));
                  } catch {}
                }}
                onClick={(event) => event.stopPropagation()}
                placeholder='{"patterns": ["authentication"], "domains": ["security"]}'
                className="w-full text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Context Conditions (JSON)</label>
              <textarea
                value={JSON.stringify(formState.context_conditions, null, 2)}
                onChange={(event) => {
                  try {
                    updateField('context_conditions', JSON.parse(event.target.value));
                  } catch {}
                }}
                onClick={(event) => event.stopPropagation()}
                placeholder='{"user_intent": "refactoring", "file_type": "component"}'
                className="w-full text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Exclusion Patterns (JSON)</label>
              <textarea
                value={JSON.stringify(formState.exclusion_patterns, null, 2)}
                onChange={(event) => {
                  try {
                    updateField('exclusion_patterns', JSON.parse(event.target.value));
                  } catch {}
                }}
                onClick={(event) => event.stopPropagation()}
                placeholder='{"files": ["*.test.ts"], "paths": ["node_modules"]}'
                className="w-full text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.active}
                  onChange={(event) => updateField('active', event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onSaveEdit();
              }}
              className="h-8 w-8 p-0 text-success hover:text-success/90"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onCancelEdit();
              }}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditClick}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>

            {isGuidanceExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onCollapseGuidance();
                }}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Collapse"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onAddSubRule?.(rule.id);
          }}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onDropdownToggle();
            }}
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onExportRule();
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="h-4 w-4" />
                Export with children
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteRule?.();
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
