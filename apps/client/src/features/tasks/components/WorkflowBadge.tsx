import { cn } from '@/utils/cn';
import { useTheme, getTaskTypeColors } from '@felix/theme-system';

interface WorkflowBadgeProps {
  workflow: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  percent?: number;
  completed?: number;
  total?: number;
  status?: 'valid' | 'incomplete' | 'invalid';
}

export function WorkflowBadge({ 
  workflow, 
  size = 'md',
  showLabel = true,
  className,
  percent,
  completed,
  total,
  status
}: WorkflowBadgeProps) {
  const { theme } = useTheme();
  // Map workflows to task types for consistent theming (no greens for classic by mapping feature→epic)
  const typeMap: Record<string, string> = {
    feature_development: 'epic',
    bugfix: 'bug',
    research: 'spike',
    simple: 'task'
  };
  const mapped = typeMap[workflow] || 'task';
  const colors = getTaskTypeColors(theme, mapped);

  const sizeClasses = {
    sm: 'text-[11px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  } as const;

  // Status accent dot (subtle, not blinding)
  const statusColor = (() => {
    if (status === 'valid') return theme.colors.success?.[500] || '#16a34a';
    if (status === 'incomplete') return theme.colors.warning?.[500] || '#f59e0b';
    if (status === 'invalid') return theme.colors.error?.[500] || '#ef4444';
    return theme.colors.foreground?.tertiary || '#64748b';
  })();

  const label = (workflow || 'simple').replace(/_/g, ' ');

  // Micro progress bar: subtle, readable, replaces noisy % text
  const barWidth = size === 'sm' ? 36 : size === 'md' ? 48 : 60;
  const pct = Math.max(0, Math.min(100, Math.round(percent ?? 0)));
  const toRgba = (hex: string, a: number) => {
    try { const h = hex.replace('#',''); const r=parseInt(h.slice(0,2),16); const g=parseInt(h.slice(2,4),16); const b=parseInt(h.slice(4,6),16); return `rgba(${r},${g},${b},${a})`; } catch { return `rgba(0,0,0,${a})`; }
  };
  const track = theme.type === 'dark'
    ? toRgba(theme.colors.background?.tertiary || '#1f2937', 0.45)
    : toRgba(theme.colors.foreground?.tertiary || '#64748b', 0.20);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium',
        sizeClasses[size],
        'whitespace-nowrap',
        className
      )}
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
      title={typeof percent === 'number' ? `${label} – ${pct}%` : label}
    >
      {/* status dot */}
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: statusColor }}
        aria-hidden
      />
      {showLabel && <span>{label}</span>}
      {typeof completed === 'number' && typeof total === 'number' && (
        <span className="opacity-90">{completed}/{total}</span>
      )}
      {typeof percent === 'number' && (
        <span className="inline-flex items-center gap-1 ml-1">
          <span
            className="relative block h-1 rounded"
            style={{ width: barWidth, backgroundColor: track }}
          >
            <span
              className="absolute left-0 top-0 h-full rounded"
              style={{ width: `${pct}%`, backgroundColor: statusColor }}
            />
          </span>
        </span>
      )}
    </span>
  );
}
