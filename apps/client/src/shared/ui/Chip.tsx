import { cn } from '@/utils/cn';

type ChipVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'info' | 'destructive';
type ChipSize = 'sm' | 'md';

export interface ChipProps {
  variant?: ChipVariant;
  size?: ChipSize;
  className?: string;
  children?: React.ReactNode;
}

const VAR_BASE: Record<Exclude<ChipVariant, 'neutral'>, { bg: string; text: string; border: string }> = {
  primary:      { bg: 'var(--chip-bg-primary)',      text: 'var(--chip-text-primary)',      border: 'var(--chip-border-primary)' },
  success:      { bg: 'var(--chip-bg-success)',      text: 'var(--chip-text-success)',      border: 'var(--chip-border-success)' },
  warning:      { bg: 'var(--chip-bg-warning)',      text: 'var(--chip-text-warning)',      border: 'var(--chip-border-warning)' },
  info:         { bg: 'var(--chip-bg-info)',         text: 'var(--chip-text-info)',         border: 'var(--chip-border-info)' },
  destructive:  { bg: 'var(--chip-bg-destructive)',  text: 'var(--chip-text-destructive)',  border: 'var(--chip-border-destructive)' },
};

export function Chip({ variant = 'neutral', size = 'sm', className, children }: ChipProps) {
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs';
  const styles =
    variant === 'neutral'
      ? {
          backgroundColor: 'hsl(var(--muted))',
          color: 'hsl(var(--muted-foreground))',
          borderColor: 'hsl(var(--border))',
        }
      : {
          backgroundColor: `hsl(${VAR_BASE[variant].bg})`,
          color: `hsl(${VAR_BASE[variant].text})`,
          borderColor: `hsl(${VAR_BASE[variant].border})`,
        };

  return (
    <span className={cn('inline-flex items-center rounded border font-medium', pad, className)} style={styles}>
      {children}
    </span>
  );
}

