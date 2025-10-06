import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Button } from '@client/shared/ui/Button';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import {
  Code,
  Layers,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Box,
  GitBranch,
  Tag,
  Database,
  Package,
  Share2,
  FileCode,
} from 'lucide-react';
import { formatTypeLabel } from '@/utils/relationship-format';
import { normalizeFilePath } from '../utils/contextDisplayUtils';
import { cn } from '@/utils/cn';

interface ContextComponentsSectionProps {
  components: any[];
  groupedComponents: Record<string, any[]>;
  expandedSections: Set<string>;
  onToggleSection: (section: string) => void;
  expandedCards: Set<string>;
  onToggleCard: (cardId: string) => void;
  displayMode: 'focus' | 'all';
  allComponents: any[];
  visible: boolean;
}

const UNKNOWN_LANGUAGE = 'text';

const languageLabel = (value?: string) => (value ? value : UNKNOWN_LANGUAGE);

const iconForType = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'class':
      return <Box className="h-4 w-4" />;
    case 'function':
      return <Code className="h-4 w-4" />;
    case 'method':
      return <GitBranch className="h-4 w-4" />;
    case 'interface':
      return <Layers className="h-4 w-4" />;
    case 'type':
      return <Tag className="h-4 w-4" />;
    case 'variable':
      return <Database className="h-4 w-4" />;
    case 'import':
      return <Package className="h-4 w-4" />;
    case 'export':
      return <Share2 className="h-4 w-4" />;
    default:
      return <FileCode className="h-4 w-4" />;
  }
};

export function ContextComponentsSection({
  components,
  groupedComponents,
  expandedSections,
  onToggleSection,
  expandedCards,
  onToggleCard,
  displayMode,
  allComponents,
  visible,
}: ContextComponentsSectionProps) {
  const { theme } = useTheme();

  const sectionOpen = expandedSections.has('components');

  const stats = useMemo(() => ({
    total: components.length,
    globalTotal: allComponents.length,
  }), [components.length, allComponents.length]);

  if (!components.length) return null;

  const getComponentStyleObject = (type: string): CSSProperties => {
    if (!theme) return {} as CSSProperties;
    return getComponentStyles(theme, String(type || '').toLowerCase());
  };

  return (
    <div
      className={cn(
        'border border-border/70 rounded-lg overflow-hidden shadow-md bg-background/50 backdrop-blur',
        !visible && 'hidden'
      )}
    >
      <button
        onClick={() => onToggleSection('components')}
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {sectionOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <Code className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Components</h3>
          <span className="text-sm text-muted-foreground">
            ({stats.total}{displayMode === 'focus' && stats.globalTotal ? ` of ${stats.globalTotal}` : ''})
          </span>
        </div>
        <div className="flex gap-2">
          {Object.entries(groupedComponents).slice(0, 5).map(([type, items]) => (
            <span
              key={type}
              className="text-xs px-2 py-1 rounded-full border"
              style={getComponentStyleObject(type)}
            >
              {formatTypeLabel(type)} ({(items as any[]).length})
            </span>
          ))}
        </div>
      </button>

      {sectionOpen && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedComponents).map(([type, items]) => {
              const key = `components-${type}`;
              const expanded = expandedCards.has(key);
              const visibleItems = expanded ? (items as any[]) : (items as any[]).slice(0, 2);
              const cardStyle = getComponentStyleObject(type);

              return (
                <div
                  key={type}
                  className={cn(
                    'border-2 rounded-lg overflow-hidden transition-shadow',
                    expanded && 'md:col-span-2 lg:col-span-3 shadow-lg'
                  )}
                  style={{
                    ...cardStyle,
                    boxShadow: cardStyle?.color ? `inset 4px 0 0 0 ${cardStyle.color}` : undefined,
                  }}
                >
                  <div className="p-3 border-b border-border/40 bg-background/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {iconForType(type)}
                        <span className="font-medium capitalize">
                          {formatTypeLabel(type)} ({(items as any[]).length})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onToggleCard(key)}
                      >
                        {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'transition-all',
                      expanded ? 'max-h-none overflow-y-auto' : 'max-h-32 overflow-hidden'
                    )}
                  >
                    <div className="divide-y divide-border/40">
                      {visibleItems.map((component: any, idx: number) => (
                        <div
                          key={idx}
                          className={cn(
                            'transition-colors',
                            expanded ? 'p-4 hover:bg-background/30' : 'p-2 hover:bg-background/30'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className={cn('font-medium', expanded ? 'text-base' : 'text-sm truncate')}>
                                {component.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {normalizeFilePath(component.filePath)}
                              </div>
                              {expanded && component.location && (
                                <div className="text-xs text-muted-foreground">
                                  Lines {component.location.startLine}-{component.location.endLine || component.location.startLine}
                                </div>
                              )}
                            </div>
                            <span
                              className="text-xs px-2 py-1 rounded border"
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
                              {languageLabel(component.language)}
                            </span>
                          </div>

                          {expanded && (
                            <div className="space-y-4 mt-4">
                              {component.metadata &&
                                Object.keys(component.metadata).filter(
                                  (key) => !['skeleton', 'skeletonData', 'code'].includes(key)
                                ).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-semibold mb-2">Metadata</h4>
                                    <div className="space-y-1 pl-3 text-xs">
                                      {Object.entries(component.metadata).map(([key, value]) => {
                                        if (['skeleton', 'skeletonData', 'code'].includes(key)) return null;
                                        return (
                                          <div key={key} className="flex gap-2">
                                            <span className="font-medium text-muted-foreground">{key}:</span>
                                            <span className="font-mono">
                                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                              {component.metadata?.skeleton && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Skeleton</h4>
                                  <div className="max-h-64 overflow-y-auto max-w-full rounded-md border border-border/20 bg-black/5">
                                    <div className="overflow-x-auto">
                                      <MarkdownRenderer
                                        content={`\`\`\`${component.language || 'typescript'}\n${component.metadata.skeleton}\n\`\`\``}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {(component.code || component.source) && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2">Source Code</h4>
                                  <div className="max-h-[500px] overflow-y-auto max-w-full rounded-md border border-border/20 bg-black/5">
                                    <div className="overflow-x-auto">
                                      <MarkdownRenderer
                                        content={`\`\`\`${component.language || 'typescript'}\n${component.code || component.source}\n\`\`\``}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
