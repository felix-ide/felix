import { cn } from '@/utils/cn';
import { useTheme } from '@felix/theme-system';

interface ProgressIndicatorProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'bar' | 'circle';
  className?: string;
}

export function ProgressIndicator({
  percentage,
  size = 'md',
  showLabel = true,
  variant = 'bar',
  className
}: ProgressIndicatorProps) {
  const { theme } = useTheme();
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  if (variant === 'circle') {
    const sizeValues = {
      sm: { size: 24, strokeWidth: 3 },
      md: { size: 32, strokeWidth: 4 },
      lg: { size: 40, strokeWidth: 5 }
    };
    
    const { size: svgSize, strokeWidth } = sizeValues[size];
    const radius = (svgSize - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;
    
    // Track color: theme-aware muted surface (no bright ring on dark)
    const toRgba = (hex: string, a: number) => {
      try { const h = hex.replace('#',''); const r=parseInt(h.slice(0,2),16); const g=parseInt(h.slice(2,4),16); const b=parseInt(h.slice(4,6),16); return `rgba(${r},${g},${b},${a})`; } catch { return `rgba(100,100,120,${a})`; }
    };
    const track = theme.type === 'dark'
      ? toRgba(theme.colors.background?.tertiary || theme.colors.background?.secondary || '#1f2937', 0.45)
      : toRgba(theme.colors.foreground?.tertiary || '#64748b', 0.20);

    return (
      <div className={cn("relative inline-flex items-center justify-center", className)}>
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke={track}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-all duration-300",
              clampedPercentage === 100 ? "text-success" :
              clampedPercentage >= 75 ? "text-primary" :
              clampedPercentage >= 50 ? "text-warning" :
              "text-destructive"
            )}
          />
        </svg>
        {showLabel && (
          <span className="absolute text-xs font-medium">
            {Math.round(clampedPercentage)}%
          </span>
        )}
      </div>
    );
  }
  
  // Bar variant
  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };
  
  // Track color: theme-aware muted surface (no bright bar on dark)
  const toRgba = (hex: string, a: number) => {
    try { const h = hex.replace('#',''); const r=parseInt(h.slice(0,2),16); const g=parseInt(h.slice(2,4),16); const b=parseInt(h.slice(4,6),16); return `rgba(${r},${g},${b},${a})`; } catch { return `rgba(100,100,120,${a})`; }
  };
  const track = theme.type === 'dark'
    ? toRgba(theme.colors.background?.tertiary || theme.colors.background?.secondary || '#1f2937', 0.45)
    : toRgba(theme.colors.foreground?.tertiary || '#64748b', 0.20);

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs font-medium">{Math.round(clampedPercentage)}%</span>
        </div>
      )}
      <div className={cn("w-full rounded-full overflow-hidden", heightClasses[size])} style={{ backgroundColor: track }}>
        <div
          className={cn(
            "h-full transition-all duration-300",
            clampedPercentage === 100 ? "bg-success" :
            clampedPercentage >= 75 ? "bg-primary" :
            clampedPercentage >= 50 ? "bg-warning" :
            "bg-destructive"
          )}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}
