import { Calendar, Zap, Check, X, Hash, Tag, ChevronRight } from 'lucide-react';
import type { Theme } from '@felix/theme-system';
import type { RuleData } from '@/types/api';
import { formatRuleDate } from './utils';

interface RuleCardSummaryRowProps {
  rule: RuleData;
  theme: Theme;
  isGuidanceExpanded: boolean;
  onExpandGuidance: () => void;
}

export function RuleCardSummaryRow({
  rule,
  theme,
  isGuidanceExpanded,
  onExpandGuidance,
}: RuleCardSummaryRowProps) {
  if (isGuidanceExpanded) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs flex-wrap">
      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
        style={(function () {
          if (theme.type === 'dark') {
            const base = `${theme.colors.background.tertiary}73`;
            const color =
              rule.priority >= 8
                ? theme.colors.error[300]
                : rule.priority >= 6
                ? theme.colors.warning[300]
                : rule.priority >= 4
                ? theme.colors.info[300]
                : theme.colors.success[300];
            return {
              backgroundColor: base,
              color,
              borderColor: theme.colors.border.primary,
            };
          }

          return rule.priority >= 8
            ? {
                backgroundColor: theme.colors.error[50],
                color: theme.colors.error[700],
                borderColor: theme.colors.error[200],
              }
            : rule.priority >= 6
            ? {
                backgroundColor: theme.colors.warning[50],
                color: theme.colors.warning[700],
                borderColor: theme.colors.warning[200],
              }
            : rule.priority >= 4
            ? {
                backgroundColor: theme.colors.info[50],
                color: theme.colors.info[700],
                borderColor: theme.colors.info[200],
              }
            : {
                backgroundColor: theme.colors.success[50],
                color: theme.colors.success[700],
                borderColor: theme.colors.success[200],
              };
        })()}
      >
        P{rule.priority}
      </span>

      {rule.auto_apply ? (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
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
          <Zap className="h-3 w-3" />
          Auto
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
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
        >
          Manual
        </span>
      )}

      {rule.active ? (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
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
          <Check className="h-3 w-3" />
          Active
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
          style={{
            backgroundColor:
              theme.type === 'dark'
                ? `${theme.colors.background.tertiary}73`
                : theme.colors.error[50],
            color:
              theme.type === 'dark'
                ? theme.colors.error[300]
                : theme.colors.error[700],
            borderColor:
              theme.type === 'dark'
                ? theme.colors.border.primary
                : theme.colors.error[200],
          }}
        >
          <X className="h-3 w-3" />
          Inactive
        </span>
      )}

      {rule.confidence_threshold ? (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium dark:bg-primary/20 dark:text-primary">
          {Math.round(rule.confidence_threshold * 100)}% conf
        </span>
      ) : null}

      {rule.entity_links?.length ? (
        rule.entity_links.map((link, index) => (
          <span
            key={`${link.entity_id}-${index}`}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
            style={{
              backgroundColor: theme.colors.primary[200],
              color: theme.colors.primary[900],
              borderColor: theme.colors.primary[300],
            }}
            title={`${link.entity_type}: ${link.entity_id}`}
          >
            <Hash className="h-3 w-3" />
            <span className="font-mono text-[10px]">
              {link.entity_type}:{link.entity_id.split('_').pop()?.substring(0, 6)}
            </span>
          </span>
        ))
      ) : null}

      {rule.stable_tags?.length ? (
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
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
          <Tag className="h-3 w-3" />
          {rule.stable_tags.length} {rule.stable_tags.length === 1 ? 'tag' : 'tags'}
        </span>
      ) : null}

      <span
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium border"
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
      >
        <Calendar className="h-3 w-3" />
        {formatRuleDate(rule.created_at)}
      </span>

      <button
        onClick={(event) => {
          event.stopPropagation();
          onExpandGuidance();
        }}
        className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ChevronRight className="h-3 w-3" />
        More
      </button>
    </div>
  );
}
