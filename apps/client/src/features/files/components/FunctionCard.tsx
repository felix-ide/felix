import { useState } from 'react';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import { Code, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FunctionCardProps {
  name: string;
  parameters?: string[];
  returnType?: string;
  calls?: string[];
  complexity?: 'low' | 'medium' | 'high';
  sourceCode?: string;
  description?: string;
  // location info not displayed here
  onDrillDown?: () => void; // Instead of onClick for navigation
}

export function FunctionCard({
  name,
  parameters = [],
  returnType,
  calls = [],
  complexity = 'low',
  sourceCode,
  description,
  onDrillDown
}: FunctionCardProps) {
  const [showCode, setShowCode] = useState(false);
  const { theme } = useTheme();

  const complexityColors = {
    low: 'text-info bg-info/15',
    medium: 'text-warning bg-warning/15',
    high: 'text-destructive bg-destructive/15'
  } as const;

  return (
    <div className="border rounded-lg p-3 hover:shadow-md transition-all"
         style={getComponentStyles(theme, 'function')}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔶</span>
            <h4 
              className="font-semibold text-sm cursor-pointer hover:text-info"
              onClick={onDrillDown}
            >
              {name}()
            </h4>
          </div>
          
          {description && (
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
          )}
        </div>
        
        <div className={cn(
          "px-2 py-1 rounded text-xs font-medium flex items-center gap-1",
          complexityColors[complexity]
        )}>
          <Zap className="h-3 w-3" />
          {complexity}
        </div>
      </div>

      {/* Parameters and Return Type */}
      <div className="space-y-2 mb-3">
        {parameters.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">📥</span>
            <span className="font-mono px-2 py-1 rounded border"
                  style={{
                    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
                    color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
                    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200]
                  }}>
              ({parameters.join(', ')})
            </span>
          </div>
        )}
        
        {returnType && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">📤</span>
            <span className="font-mono px-2 py-1 rounded border"
                  style={{
                    backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.secondary[50],
                    color: theme.type === 'dark' ? theme.colors.foreground.secondary : theme.colors.secondary[800],
                    borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.secondary[200]
                  }}>
              {returnType}
            </span>
          </div>
        )}
      </div>

      {/* Function Calls */}
      {calls.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <span>🔗</span>
            Calls:
          </div>
          <div className="flex flex-wrap gap-1">
            {calls.map((call, index) => (
              <span 
                key={index}
                className="text-xs px-2 py-1 rounded border cursor-pointer"
                style={{
                  backgroundColor: theme.type === 'dark' ? `${theme.colors.background.tertiary}73` : theme.colors.accent[50],
                  color: theme.type === 'dark' ? theme.colors.accent[300] : theme.colors.accent[700],
                  borderColor: theme.type === 'dark' ? theme.colors.border.primary : theme.colors.accent[200]
                }}
              >
                {call}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source Code Toggle */}
      {sourceCode && (
        <div>
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 text-xs text-primary hover:underline mb-2"
          >
            <Code className="h-3 w-3" />
            {showCode ? 'Hide' : 'Show'} source
          </button>
          
          {showCode && (
            <pre className="text-xs p-3 rounded overflow-auto max-h-32 font-mono border"
                 style={{
                   backgroundColor: theme.type === 'dark' ? `${theme.colors.background.secondary}` : theme.colors.background.secondary,
                   borderColor: theme.colors.border.primary
                 }}>
              {sourceCode}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
