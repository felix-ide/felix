import { useMemo } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { php } from '@codemirror/lang-php';
import { java } from '@codemirror/lang-java';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  Activity,
  AlertTriangle,
  Code,
  FileCode,
  GitBranch,
  Hash,
  Info,
  MapPin,
  Network,
  Package,
  ScrollText,
  Clock,
} from 'lucide-react';
import { getCodeComponentStyles } from '@felix/theme-system';
import { formatTypeLabel, getRelationshipChipStyle } from '@/utils/relationship-format';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import type { FileExplorerComponent } from './fileExplorerData';
import type { ComponentRelationship } from './types';
import { MermaidChart } from './MermaidChart';

interface ComponentDetailsPanelProps {
  component: FileExplorerComponent;
  components: FileExplorerComponent[];
  context: any;
  relationships: ComponentRelationship[];
  selectedTab: 'overview' | 'code' | 'tree' | 'raw';
  onTabChange: (tab: 'overview' | 'code' | 'tree' | 'raw') => void;
  isLoadingContext: boolean;
  theme: any;
  themeKey: string;
  getComponentIcon: (type: string) => ComponentType<{ className?: string; style?: CSSProperties }>;
  getComponentColor: (type: string) => string;
  mermaidChart: string;
  onSelectComponent: (componentId: string) => void;
}

const tabIcons = {
  overview: Info,
  code: Code,
  tree: Network,
  raw: ScrollText,
} as const;

const isMarkdownPath = (filePath?: string | null) => {
  if (!filePath) return false;
  const extension = filePath.split('.').pop()?.toLowerCase();
  return extension ? ['md', 'mdx', 'markdown'].includes(extension) : false;
};

const getLanguageExtensions = (filePath: string | undefined) => {
  if (!filePath) return [javascript()];
  const extension = filePath.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return [javascript()];
    case 'py':
      return [python()];
    case 'php':
      return [php()];
    case 'java':
      return [java()];
    case 'md':
    case 'markdown':
      return [markdown()];
    default:
      return [javascript()];
  }
};

const parseComponentInfo = (
  contextContent: string,
  component: FileExplorerComponent,
) => {
  const componentMatch = contextContent.match(/### ([^\n]+) \(([^,]+), ([^)]+)\)\nPath: ([^\n]+)/);
  const summaryMatch = contextContent.match(/Summary: ([^\n]+)/);
  const signatureMatch = contextContent.match(/Signature: `([^`]+)`/);

  return {
    title: componentMatch?.[1] || component.name || 'Unknown',
    type: componentMatch?.[2] || component.type || 'unknown',
    language: componentMatch?.[3] || 'Unknown',
    path: componentMatch?.[4] || component.filePath || 'Unknown',
    summary: summaryMatch?.[1] || component.description || null,
    signature: signatureMatch?.[1] || null,
  };
};

export function ComponentDetailsPanel({
  component,
  components,
  context,
  relationships,
  selectedTab,
  onTabChange,
  isLoadingContext,
  theme,
  themeKey,
  getComponentIcon,
  getComponentColor,
  mermaidChart,
  onSelectComponent,
}: ComponentDetailsPanelProps) {
  const stats = context?.stats;
  const content = context?.content ?? '';
  const info = useMemo(() => parseComponentInfo(content, component), [component, content]);
  const codeContent = useMemo(() => (
    component.sourceCode
    ?? component.metadata?.code
    ?? component.metadata?.codeContent
    ?? ''
  ), [component]);

  const isMarkdownFile = useMemo(() => {
    if (isMarkdownPath(component.filePath)) return true;
    if (isMarkdownPath(component.location?.file)) return true;
    if (isMarkdownPath(component.metadata?.filePath)) return true;
    const language = (component.metadata?.codeLanguage
      ?? component.metadata?.language
      ?? (component as any)?.language);
    if (typeof language === 'string' && language.toLowerCase() === 'markdown') {
      return true;
    }
    return false;
  }, [component]);

  const childComponents = useMemo(
    () => components.filter(candidate => candidate.parentId === component.id),
    [components, component.id],
  );

  const tabList = useMemo(() => ['overview', 'code', 'tree', 'raw'] as const, []);

  const relationshipSummary = useMemo(
    () => relationships.slice(0, 8),
    [relationships],
  );

  const toneFor = (type: string) => getCodeComponentStyles(theme, type || 'component');

  return (
    <>
      <div className="bg-card border-b p-4">
        <div className="flex items-center gap-3">
          {(() => {
            const Icon = getComponentIcon(component.type);
            return (
              <div
                className="w-8 h-8 rounded border-2 flex items-center justify-center"
                style={{ borderColor: getComponentColor(component.type) }}
              >
                <Icon className="h-5 w-5" style={{ color: getComponentColor(component.type) }} />
              </div>
            );
          })()}
          <div className="flex-1">
            <h3 className="text-lg font-bold">{component.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2 py-1 rounded text-primary-foreground font-medium"
                style={{ backgroundColor: getComponentColor(component.type) }}
              >
                {component.type}
              </span>
              {(component.filePath || component.location?.file) && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {component.filePath || component.location?.file}
                  {component.location && (
                    <span>:{component.location.startLine || component.location.start?.line}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {isLoadingContext && (
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          )}
        </div>
        {component.description && (
          <p className="text-sm text-muted-foreground mt-2">{component.description}</p>
        )}
      </div>

      <div className="bg-background border-b px-4">
        <div className="flex gap-1 -mb-px">
          {tabList.map(tab => {
            const Icon = tabIcons[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={
                  selectedTab === tab
                    ? 'px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary bg-card rounded-t flex items-center gap-2'
                    : 'px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border flex items-center gap-2'
                }
              >
                <Icon className="h-4 w-4" />
                {tab === 'raw' ? 'Raw Data' : tab === 'tree' ? 'AST Tree' : `${tab.charAt(0).toUpperCase()}${tab.slice(1)}`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-card">
        {selectedTab === 'overview' && (
          <div className="w-full space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Lines', value: stats?.totalLines ?? 0, tone: getCodeComponentStyles(theme, 'file') },
                { label: 'Components', value: stats?.totalComponents ?? 0, tone: getCodeComponentStyles(theme, 'component') },
                { label: 'Relations', value: stats?.totalRelationships ?? 0, tone: getRelationshipChipStyle(theme, 'contains') },
                { label: 'Tokens', value: context?.tokenCount ?? 0, tone: getCodeComponentStyles(theme, 'variable') },
              ].map(({ label, value, tone }) => (
                <div
                  key={label}
                  className="rounded-lg border p-3 text-center shadow-sm transition-colors"
                  style={{ backgroundColor: tone.backgroundColor || 'hsl(var(--card))', borderColor: tone.borderColor || tone.color || 'hsl(var(--border))' }}
                >
                  <div className="text-xl font-bold" style={{ color: tone.color || 'hsl(var(--card-foreground))' }}>
                    {value}
                  </div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-background border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Component Info
                  </h3>

                  {info.signature && (
                    <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded">
                      <div className="text-xs font-medium text-primary mb-1">Signature</div>
                      <code className="text-xs font-mono">{info.signature}</code>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Type</div>
                      <div className="text-sm font-semibold">{info.type}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Language</div>
                      <div className="text-sm font-semibold">{info.language}</div>
                    </div>
                  </div>

                  {info.summary && (
                    <div className="p-3 bg-accent/20 rounded">
                      <div className="text-xs font-medium mb-1">Summary</div>
                      <p className="text-xs">{info.summary}</p>
                    </div>
                  )}
                </div>

                <div className="bg-background border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Structure
                  </h3>
                  {childComponents.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No child components</div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(
                        childComponents.reduce<Record<string, FileExplorerComponent[]>>((acc, current) => {
                          if (!acc[current.type]) acc[current.type] = [];
                          acc[current.type].push(current);
                          return acc;
                        }, {}),
                      ).map(([type, items]) => (
                        <div key={type}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">{type}</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{items.length}</span>
                          </div>
                          <div className="space-y-1">
                            {items.slice(0, 5).map(item => (
                              <div
                                key={item.id}
                                className="text-xs p-2 border rounded hover:bg-accent/20 cursor-pointer"
                                onClick={() => onSelectComponent(item.id)}
                              >
                                <div className="font-medium">{item.name}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{item.description || item.filePath}</div>
                              </div>
                            ))}
                            {items.length > 5 && (
                              <div className="text-[11px] text-muted-foreground">...and {items.length - 5} more</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-background border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Relationships
                  </h3>
                  {relationships.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      No relationships detected for this component.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {relationshipSummary.map((rel, index) => (
                        <div key={index} className="text-xs p-2 border border-border/30 rounded">
                          <span
                            className="px-1.5 py-0.5 rounded border text-[11px] font-medium"
                            style={getRelationshipChipStyle(theme, rel.type)}
                          >
                            {formatTypeLabel(rel.type)}
                          </span>
                          <div className="text-muted-foreground truncate mt-1">{rel.connection}</div>
                        </div>
                      ))}
                      {relationships.length > relationshipSummary.length && (
                        <div className="text-xs text-muted-foreground text-center">
                          ...and {relationships.length - relationshipSummary.length} more
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-background border rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <ScrollText className="h-4 w-4" />
                    Context Info
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{info.path}</span>
                    </div>
                    {component.location?.startLine && (
                      <div className="flex items-center gap-2 text-xs">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <span>Lines {component.location.startLine}-{component.location.endLine}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>Processing: {stats?.processingTime || 0}ms</span>
                    </div>
                    {context?.warnings && context.warnings.length > 0 && (
                      <div className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="h-3 w-3 text-warning mt-0.5" />
                        <div>
                          <div className="font-medium">Warnings ({context.warnings.length})</div>
                          {context.warnings.slice(0, 2).map((warning: string, index: number) => (
                            <div key={index} className="text-muted-foreground mt-1">{warning}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'code' && (
          <div className="h-full">
            {codeContent ? (
              isMarkdownFile ? (
                <div className="h-full overflow-y-auto border border-border/40 rounded-lg bg-card/40 p-6">
                  <MarkdownRenderer content={codeContent} />
                </div>
              ) : (
                <div className="rounded border border-border/40 overflow-hidden max-w-full min-w-0">
                  <CodeMirror
                    value={codeContent}
                    height="600px"
                    extensions={[
                      ...getLanguageExtensions(component.filePath),
                      EditorView.lineWrapping,
                    ]}
                    theme={theme?.type === 'dark' ? oneDark : undefined}
                    editable={false}
                    style={{ width: '100%' }}
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: true,
                      highlightActiveLine: false,
                    }}
                  />
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Code className="h-10 w-10 mb-3 mx-auto opacity-50" />
                  <p className="text-sm">No source content available for this component.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'tree' && (
          <div className="space-y-4">
            <div className="bg-background border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Component Graph</h3>
              <MermaidChart
                chart={mermaidChart}
                themeKey={themeKey}
                components={components}
                onSelectComponent={onSelectComponent}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-background border rounded-lg p-4 space-y-3">
                <h4 className="font-medium mb-2">Hierarchy</h4>
                {(() => {
                  const parent = component.parentId ? components.find(item => item.id === component.parentId) : null;
                  const children = childComponents;

                  return (
                    <div className="space-y-3">
                      {parent && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Parent</div>
                          {(() => {
                            const tone = toneFor(parent.type || 'component');
                            return (
                              <div
                                className="text-sm p-2 rounded border cursor-pointer transition-colors hover:brightness-110"
                                style={{
                                  backgroundColor: tone.backgroundColor || 'hsl(var(--card))',
                                  borderColor: tone.borderColor || 'hsl(var(--border))',
                                  color: tone.color || 'hsl(var(--card-foreground))',
                                }}
                                onClick={() => onSelectComponent(parent.id)}
                              >
                                <div className="font-medium">{parent.name}</div>
                                <div className="text-xs text-muted-foreground">{parent.type}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Current</div>
                        {(() => {
                          const tone = toneFor(component.type || 'component');
                          return (
                            <div
                              className="text-sm p-2 rounded border"
                              style={{
                                backgroundColor: tone.backgroundColor || 'hsl(var(--card))',
                                borderColor: tone.borderColor || 'hsl(var(--border))',
                                color: tone.color || 'hsl(var(--card-foreground))',
                              }}
                            >
                              <div className="font-medium">{component.name}</div>
                              <div className="text-xs text-muted-foreground">{component.type}</div>
                              {component.location?.startLine && (
                                <div className="text-xs text-muted-foreground">
                                  Lines {component.location.startLine}-{component.location.endLine || component.location.startLine}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {children.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Children ({children.length})</div>
                          <div className="space-y-1 max-h-32 overflow-auto">
                            {children.map(child => {
                              const tone = toneFor(child.type || 'component');
                              return (
                                <div
                                  key={child.id}
                                  className="text-sm p-2 rounded border cursor-pointer transition-colors hover:brightness-110"
                                  style={{
                                    backgroundColor: tone.backgroundColor || 'hsl(var(--card))',
                                    borderColor: tone.borderColor || 'hsl(var(--border))',
                                    color: tone.color || 'hsl(var(--card-foreground))',
                                  }}
                                  onClick={() => onSelectComponent(child.id)}
                                >
                                  <div className="font-medium">{child.name}</div>
                                  <div className="text-xs text-muted-foreground">{child.type}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-4">
                <div className="bg-background border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Relationships ({relationships.length})
                  </h4>
                  {relationships.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-auto">
                      {relationshipSummary.map((rel, index) => (
                        <div key={index} className="text-xs p-2 border border-border/30 rounded">
                          <span
                            className="px-1.5 py-0.5 rounded border text-[11px] font-medium"
                            style={getRelationshipChipStyle(theme, rel.type)}
                          >
                            {formatTypeLabel(rel.type)}
                          </span>
                          <div className="text-muted-foreground truncate mt-1">{rel.connection}</div>
                        </div>
                      ))}
                      {relationships.length > relationshipSummary.length && (
                        <div className="text-xs text-center text-muted-foreground">
                          ...and {relationships.length - relationshipSummary.length} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No relationships found</div>
                  )}
                </div>

                <div className="bg-background border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Legend</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary/10 border-4 border-blue-700 rounded" />
                      <span>Selected Component</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-100 border-2 border-purple-700 rounded" />
                      <span>Root File</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border-2 border-green-700 rounded" />
                      <span>Level 1 (Classes/Functions)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-100 border-2 border-orange-700 rounded" />
                      <span>Level 2 (Methods/Properties)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-pink-100 border border-pink-700 rounded" />
                      <span>Level 3+ (Nested)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-destructive/10 border border-red-700 rounded border-dashed" />
                      <span>Code Relationships</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'raw' && (
          <div className="w-full space-y-4">
            <h3 className="text-lg font-semibold">Raw Data</h3>

            {context?.content && (
              <div className="bg-background border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ScrollText className="h-4 w-4" />
                  Context Content
                </h4>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
                  {context.content}
                </pre>
              </div>
            )}

            {context && (
              <div className="bg-background border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Full Context Object
                </h4>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(context, null, 2)}
                </pre>
              </div>
            )}

            {component?.metadata && (
              <div className="bg-background border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Component Metadata
                </h4>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(component.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function ComponentDetailsEmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <FileCode className="h-16 w-16 mb-4 mx-auto opacity-50" />
        <p className="text-lg">Select a component to explore</p>
        <p className="text-sm mt-2">Navigate through your codebase using the tree on the left</p>
      </div>
    </div>
  );
}
