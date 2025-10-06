import { useState } from 'react';
import { ChevronDown, ChevronRight, Code, Box } from 'lucide-react';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import { formatTypeLabel } from '@/utils/relationship-format';

interface ClassSkeletonSectionProps {
  classComponent: any;
  members: any[];
  focusMemberId?: string;
}

export function ClassSkeletonSection({ classComponent, members, focusMemberId }: ClassSkeletonSectionProps) {
  const { theme } = useTheme();
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(
    new Set(focusMemberId ? [focusMemberId] : [])
  );

  if (!classComponent) return null;

  const componentStyle = theme ? getComponentStyles(theme, 'class') : {};
  const skeleton = classComponent.metadata?.skeleton || classComponent.code || '';

  const toggleMember = (memberId: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  // Group members by type
  const methods = members.filter((m) => String(m.type).toLowerCase() === 'method');
  const properties = members.filter((m) => String(m.type).toLowerCase() === 'property');

  return (
    <div className="border border-border/70 rounded-lg overflow-hidden shadow-md bg-background/50 backdrop-blur">
      {/* Class Header */}
      <div className="bg-card border-b border-border/40 p-3">
        <div className="flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" />
          <span
            className="px-2 py-0.5 rounded border font-semibold text-xs"
            style={componentStyle}
          >
            CLASS
          </span>
          <span className="text-base font-bold">{classComponent.name}</span>
          <span className="text-xs text-muted-foreground ml-auto font-mono">
            {classComponent.filePath}
          </span>
        </div>
      </div>

      {/* Class Skeleton (full class structure) */}
      {skeleton && (
        <div className="border-b border-border/40 p-3 bg-card/30">
          <div className="text-xs font-semibold mb-2 text-muted-foreground">Class Structure</div>
          <div className="rounded border border-border/20 bg-black/5 max-h-96 overflow-auto">
            <MarkdownRenderer
              content={`\`\`\`${classComponent.language || 'typescript'}\n${skeleton}\n\`\`\``}
            />
          </div>
        </div>
      )}

      {/* Properties */}
      {properties.length > 0 && (
        <div className="border-b border-border/40">
          <div className="p-3 bg-card/20">
            <div className="text-xs font-semibold text-muted-foreground">
              Properties ({properties.length})
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {properties.map((prop) => {
              const isExpanded = expandedMembers.has(prop.id);
              const propStyle = theme ? getComponentStyles(theme, 'property') : {};

              return (
                <div key={prop.id} className="hover:bg-accent/5 transition-colors">
                  <button
                    onClick={() => toggleMember(prop.id)}
                    className="w-full flex items-center gap-2 p-2 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span
                      className="px-1.5 py-0.5 rounded border text-xs"
                      style={propStyle}
                    >
                      prop
                    </span>
                    <span className="text-sm font-medium">{prop.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {prop.location?.startLine}
                    </span>
                  </button>

                  {isExpanded && prop.metadata?.skeleton && (
                    <div className="px-8 pb-2">
                      <div className="rounded border border-border/20 bg-black/5 text-xs max-h-64 overflow-auto">
                        <MarkdownRenderer
                          content={`\`\`\`${prop.language || 'typescript'}\n${prop.metadata.skeleton}\n\`\`\``}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Methods */}
      {methods.length > 0 && (
        <div>
          <div className="p-3 bg-card/20 border-b border-border/40">
            <div className="text-xs font-semibold text-muted-foreground">
              Methods ({methods.length})
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {methods.map((method) => {
              const isExpanded = expandedMembers.has(method.id);
              const isFocus = method.id === focusMemberId;
              const methodStyle = theme ? getComponentStyles(theme, 'method') : {};

              return (
                <div
                  key={method.id}
                  className={`hover:bg-accent/5 transition-colors ${
                    isFocus ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleMember(method.id)}
                    className="w-full flex items-center gap-2 p-2 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span
                      className="px-1.5 py-0.5 rounded border text-xs"
                      style={methodStyle}
                    >
                      method
                    </span>
                    <span className={`text-sm font-medium ${isFocus ? 'text-primary font-bold' : ''}`}>
                      {method.name}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {method.location?.startLine}-{method.location?.endLine}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-8 pb-2 space-y-2">
                      {method.metadata?.signature && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {method.metadata.signature}
                        </div>
                      )}
                      {(method.code || method.source || method.metadata?.skeleton) && (
                        <div className="rounded border border-border/20 bg-black/5 text-xs max-h-96 overflow-auto">
                          <MarkdownRenderer
                            content={`\`\`\`${method.language || 'typescript'}\n${
                              method.code || method.source || method.metadata.skeleton
                            }\n\`\`\``}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
