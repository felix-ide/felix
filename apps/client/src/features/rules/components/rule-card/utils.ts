import type { ComponentType } from 'react';
import type { Theme } from '@felix/theme-system';
import { getRuleTypeColors } from '@felix/theme-system';
import { Shield, Zap, Brain, Settings } from 'lucide-react';

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  pattern: Settings,
  constraint: Shield,
  automation: Zap,
  semantic: Brain,
};

export interface RuleTypeInfo {
  icon: ComponentType<{ className?: string }>;
  styles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
}

export const getRuleTypeInfo = (theme: Theme, type: string): RuleTypeInfo => {
  const colors = getRuleTypeColors(theme, type);
  const icon = iconMap[type] || Brain;

  return {
    icon,
    styles: {
      backgroundColor: colors.bg ?? theme.colors.background.secondary,
      color: colors.text ?? theme.colors.foreground.primary,
      borderColor: colors.border ?? theme.colors.border.primary,
    },
  };
};

export const formatRuleDate = (dateString?: string) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const toShortId = (id: string) => {
  const parts = id.split('_');
  return parts[parts.length - 1] || id.substring(0, 8);
};
