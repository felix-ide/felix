import { useState, useMemo, Dispatch, SetStateAction, type ComponentType, type ReactNode } from 'react';
import { Target, BookOpen, Shield, Clock, ChevronDown, Link2, Info, AlertTriangle, Zap, Layers, ListTree, Code, FileText } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';

interface ContextMetadataSectionProps {
  metadata?: {
    tasks?: any[];
    notes?: any[];
    rules?: any[];
  };
}

export function ContextMetadataSection({ metadata }: ContextMetadataSectionProps) {
  if (!metadata) return null;

  const { tasks = [], notes = [], rules = [] } = metadata;
  if (!tasks.length && !notes.length && !rules.length) return null;

  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});

  const toggleExpanded = (
    id: string | number | undefined,
    setter: Dispatch<SetStateAction<Record<string, boolean>>>
  ) => {
    if (!id && id !== 0) return;
    const key = String(id);
    setter(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const normalizedTasks = useMemo(() => tasks.map((task, index) => ({
    ...task,
    _key: task.id ? String(task.id) : `task-${index}`
  })), [tasks]);

  const normalizedNotes = useMemo(() => notes.map((note, index) => ({
    ...note,
    _key: note.id ? String(note.id) : `note-${index}`
  })), [notes]);

  const normalizedRules = useMemo(() => rules.map((rule, index) => ({
    ...rule,
    _key: rule.id ? String(rule.id) : `rule-${index}`
  })), [rules]);

  return (
    <div className="space-y-6">
      {normalizedTasks.length > 0 && (
        <MetadataPanel
          icon={Target}
          accent="text-primary"
          count={normalizedTasks.length}
          label="Tasks"
        >
          <div className="space-y-3">
            {normalizedTasks.map(task => {
              const isExpanded = Boolean(expandedTasks[task._key]);
              return (
                <MetadataItem
                  key={task._key}
                  title={task.title || 'Untitled Task'}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpanded(task._key, setExpandedTasks)}
                  badges={
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {task.status && (
                        <span className="px-1.5 py-0.5 border border-border/60 rounded" title="Status">
                          {task.status}
                        </span>
                      )}
                      {task.priority && (
                        <span className="px-1.5 py-0.5 border border-muted/40 rounded" title="Priority">
                          P{task.priority}
                        </span>
                      )}
                    </div>
                  }
                >
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {task.due_date && (
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/90">
                        <Clock className="h-3 w-3" />
                        <span>Due {task.due_date}</span>
                      </div>
                    )}
                    {task.description && (
                      <MarkdownRenderer content={task.description} prose={false} />
                    )}
                  </div>
                </MetadataItem>
              );
            })}
          </div>
        </MetadataPanel>
      )}

      {normalizedNotes.length > 0 && (
        <MetadataPanel
          icon={BookOpen}
          accent="text-accent"
          count={normalizedNotes.length}
          label="Notes"
        >
          <div className="space-y-3">
            {normalizedNotes.map(note => {
              const snippet = typeof note.snippet === 'string' && note.snippet.trim().length > 0
                ? note.snippet
                : typeof note.preview === 'string' && note.preview.trim().length > 0
                  ? note.preview
                  : typeof note.content === 'string'
                    ? note.content
                    : '';
              const preview = snippet.length > 0 ? snippet : '';
              const sourceComponent = note.source || (Array.isArray(note.entity_links) ? note.entity_links.find((link: any) => link?.component)?.component : null);
              const primarySourceLabel = sourceComponent?.filePath || sourceComponent?.displayName || sourceComponent?.name || sourceComponent?.id;
              const isExpanded = Boolean(expandedNotes[note._key]);
              return (
                <MetadataItem
                  key={note._key}
                  title={note.title || 'Untitled Note'}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpanded(note._key, setExpandedNotes)}
                  badges={
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {note.note_type && (
                        <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded">
                          {note.note_type}
                        </span>
                      )}
                      {primarySourceLabel && (
                        <SourceBadge
                          label={primarySourceLabel}
                          type={sourceComponent?.type}
                          filePath={sourceComponent?.filePath}
                        />
                      )}
                      {note.link_strength && (
                        <span className="px-1.5 py-0.5 border border-accent/40 rounded">
                          {note.link_strength}
                        </span>
                      )}
                      {note.similarity != null && (
                        <span className="px-1.5 py-0.5 border border-muted/40 rounded" title="Similarity score">
                          sim {Number(note.similarity).toFixed(2)}
                        </span>
                      )}
                      {Array.isArray(note.sources) && note.sources.length > 0 && (
                        <span className="px-1.5 py-0.5 border border-muted/40 rounded" title={`Sources: ${note.sources.join(', ')}`}>
                          {note.sources.length} sources
                        </span>
                      )}
                    </div>
                 }
                 preview={preview}
                >
                  <div className="space-y-3 text-sm text-muted-foreground">
                    {preview && (
                      <MarkdownRenderer content={preview} prose={false} />
                    )}
                    {Array.isArray(note.entity_links) && note.entity_links.length > 0 && (
                      <LinkedEntitiesList links={note.entity_links} />
                    )}
                  </div>
                </MetadataItem>
              );
            })}
          </div>
        </MetadataPanel>
      )}

      {normalizedRules.length > 0 && (
        <MetadataPanel
          icon={Shield}
          accent="text-secondary"
          count={normalizedRules.length}
          label="Rules"
        >
          <div className="space-y-3">
            {normalizedRules.map(rule => {
              const guidance = typeof rule.guidance === 'string' && rule.guidance.trim().length > 0
                ? rule.guidance
                : typeof rule.guidance_text === 'string'
                  ? rule.guidance_text
                  : '';
              const guidancePreview = typeof rule.guidance_preview === 'string' && rule.guidance_preview.trim().length > 0
                ? rule.guidance_preview
                : guidance
                  ? guidance.slice(0, 320)
                  : rule.description || '';
              const sourceComponent = rule.source || (Array.isArray(rule.entity_links) ? rule.entity_links.find((link: any) => link?.component)?.component : null);
              const primarySourceLabel = sourceComponent?.filePath || sourceComponent?.displayName || sourceComponent?.name || sourceComponent?.id;
              const isExpanded = Boolean(expandedRules[rule._key]);
              return (
                <MetadataItem
                  key={rule._key}
                  title={rule.name || 'Unnamed Rule'}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpanded(rule._key, setExpandedRules)}
                  badges={
                    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {rule.rule_type && (
                        <span className="px-1.5 py-0.5 border border-border/60 rounded uppercase tracking-wide">
                          {rule.rule_type}
                        </span>
                      )}
                      {rule.priority && (
                        <span className="px-1.5 py-0.5 border border-muted/40 rounded">
                          Priority {rule.priority}/10
                        </span>
                      )}
                      {rule.link_strength && (
                        <span className="px-1.5 py-0.5 border border-muted/40 rounded">
                          {rule.link_strength}
                        </span>
                      )}
                      {primarySourceLabel && (
                        <SourceBadge
                          label={primarySourceLabel}
                          type={sourceComponent?.type}
                          filePath={sourceComponent?.filePath}
                        />
                      )}
                      {rule.similarity != null && (
                        <span className="px-1.5 py-0.5 border border-muted/40 rounded" title="Similarity score">
                          sim {Number(rule.similarity).toFixed(2)}
                        </span>
                      )}
                      {Array.isArray(rule.sources) && rule.sources.length > 0 && (
                        <span className="px-1.5 py-0.5 border border-muted/40 rounded" title={`Sources: ${rule.sources.join(', ')}`}>
                          {rule.sources.length} sources
                        </span>
                      )}
                    </div>
                  }
                  preview={guidancePreview}
                >
                  <RuleDetail rule={rule} guidance={guidance} />
                </MetadataItem>
              );
            })}
          </div>
        </MetadataPanel>
      )}
    </div>
  );
}

interface MetadataPanelProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  count: number;
  accent: string;
  children: ReactNode;
}

function MetadataPanel({ icon: Icon, label, count, accent, children }: MetadataPanelProps) {
  return (
    <section className="rounded-lg border border-border/40 bg-card/40 shadow-sm overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/40">
        <Icon className={cn('h-5 w-5', accent)} />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{label}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
      </header>
      <div className="px-4 py-3">
        {children}
      </div>
    </section>
  );
}

interface MetadataItemProps {
  title: string;
  badges?: ReactNode;
  preview?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function MetadataItem({ title, badges, preview, isExpanded, onToggle, children }: MetadataItemProps) {
  const previewText = preview && preview.trim().length > 0 ? preview : undefined;

  return (
    <article className="rounded-md border border-border/40 bg-background/60">
      <button
        type="button"
        className="w-full px-4 py-3 text-left flex items-start gap-3"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <ChevronDown
          className={cn('mt-1 h-4 w-4 shrink-0 transition-transform text-muted-foreground', isExpanded ? 'rotate-0' : '-rotate-90')}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm font-medium text-foreground truncate">{title}</div>
          {badges}
          {!isExpanded && previewText && (
            <div className="text-xs text-muted-foreground line-clamp-2">
              {previewText}
            </div>
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </article>
  );
}

interface LinkedEntitiesListProps {
  links: any[];
}

function LinkedEntitiesList({ links }: LinkedEntitiesListProps) {
  if (!Array.isArray(links) || links.length === 0) return null;
  return (
    <div className="border border-border/40 rounded-md bg-background/40 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Link2 className="h-3 w-3" /> Linked Entities
      </div>
      <ul className="mt-2 space-y-2 text-xs">
        {links.map((link, index) => {
          const component = link?.component;
          return (
          <li key={index} className="border border-border/30 rounded-md bg-card/30 px-2 py-2">
            <div className="flex flex-wrap items-center gap-2 text-foreground text-xs font-medium">
              <span className="uppercase tracking-wide text-[10px] text-muted-foreground">{link?.entity_type || 'entity'}</span>
              {component?.type && (
                <span className="px-1.5 py-0.5 border border-border/40 rounded bg-background/80 text-[11px] uppercase tracking-wide">
                  {component.type}
                </span>
              )}
              {link?.link_strength && (
                <span className="px-1.5 py-0.5 border border-muted/40 rounded uppercase tracking-wide">
                  {link.link_strength}
                </span>
              )}
            </div>
            <div className="mt-1 text-muted-foreground flex flex-col gap-1">
              <span className="font-semibold text-xs text-foreground">
                {component?.displayName || component?.name || link?.entity_id || 'Unknown entity'}
              </span>
              {component?.filePath && (
                <span className="text-[11px] text-muted-foreground/80 break-all">{component.filePath}</span>
              )}
              {!component?.filePath && link?.entity_id && (
                  <span className="text-[11px] text-muted-foreground/80 break-all">{link.entity_id}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface RuleDetailProps {
  rule: any;
  guidance: string;
}

function RuleDetail({ rule, guidance }: RuleDetailProps) {
  const metaItems: Array<{ label: string; value: ReactNode; icon: ComponentType<{ className?: string }>; key: string }> = [
    { label: 'Type', value: rule.rule_type || '—', icon: Info, key: 'type' },
    { label: 'Priority', value: rule.priority != null ? rule.priority : '—', icon: AlertTriangle, key: 'priority' },
    { label: 'Auto Apply', value: rule.auto_apply ? 'Enabled' : 'Disabled', icon: Zap, key: 'auto' },
    { label: 'Confidence', value: rule.confidence_threshold != null ? rule.confidence_threshold : '—', icon: Info, key: 'confidence' },
    { label: 'Active', value: (rule.is_active ?? rule.active ?? true) ? 'Active' : 'Inactive', icon: Info, key: 'active' },
    { label: 'Similarity', value: rule.similarity != null ? Number(rule.similarity).toFixed(2) : '—', icon: Info, key: 'similarity' },
    { label: 'Link Strength', value: rule.link_strength || '—', icon: Link2, key: 'link_strength' }
  ];

  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <RuleMetaGrid items={metaItems} />

      {rule.description && (
        <DetailSection title="Description" icon={Info}>
          <MarkdownRenderer content={rule.description} prose={false} />
        </DetailSection>
      )}

      {guidance && (
        <DetailSection title="Guidance" icon={Info}>
          <MarkdownRenderer content={guidance} prose={false} />
        </DetailSection>
      )}

      {Array.isArray(rule.conditions) && rule.conditions.length > 0 && (
        <DetailSection title="Conditions" icon={AlertTriangle}>
          <ul className="list-disc list-inside space-y-1 text-xs">
            {rule.conditions.map((condition: any, idx: number) => (
              <li key={idx}>{typeof condition === 'string' ? condition : JSON.stringify(condition)}</li>
            ))}
          </ul>
        </DetailSection>
      )}

      {Array.isArray(rule.actions) && rule.actions.length > 0 && (
        <DetailSection title="Actions" icon={Zap}>
          <ul className="list-disc list-inside space-y-1 text-xs">
            {rule.actions.map((action: any, idx: number) => (
              <li key={idx}>{typeof action === 'string' ? action : JSON.stringify(action)}</li>
            ))}
          </ul>
        </DetailSection>
      )}

      {rule.trigger_patterns && renderPatternSection('Trigger Patterns', rule.trigger_patterns)}
      {rule.semantic_triggers && renderSemanticSection('Semantic Triggers', rule.semantic_triggers)}

      {rule.context_conditions && (
        <DetailSection title="Context Conditions" icon={Layers}>
          <pre className="text-xs whitespace-pre-wrap bg-card/40 border border-border/40 rounded-md p-3">
            {JSON.stringify(rule.context_conditions, null, 2)}
          </pre>
        </DetailSection>
      )}

      {rule.code_template && (
        <DetailSection title="Code Template" icon={Code}>
          <pre className="text-xs whitespace-pre-wrap bg-card/40 border border-border/40 rounded-md p-3">
            {rule.code_template}
          </pre>
        </DetailSection>
      )}

      {rule.validation_script && (
        <DetailSection title="Validation Script" icon={Code}>
          <pre className="text-xs whitespace-pre-wrap bg-card/40 border border-border/40 rounded-md p-3">
            {rule.validation_script}
          </pre>
        </DetailSection>
      )}

      {Array.isArray(rule.entity_links) && rule.entity_links.length > 0 && (
        <LinkedEntitiesList links={rule.entity_links} />
      )}
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}

function DetailSection({ title, icon: Icon, children }: DetailSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

interface RuleMetaGridProps {
  items: Array<{ label: string; value: ReactNode; icon: ComponentType<{ className?: string }>; key: string }>;
}

function RuleMetaGrid({ items }: RuleMetaGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      {items.map(item => (
        <div key={item.key} className="flex items-center gap-2 border border-border/30 rounded-md bg-card/30 px-2 py-1">
          <item.icon className="h-3 w-3 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="uppercase tracking-wide text-[10px] text-muted-foreground">{item.label}</span>
            <span className="text-foreground text-xs font-medium">{item.value || '—'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const renderPatternSection = (title: string, patterns: any) => {
  if (!patterns) return null;
  const entries = Object.entries(patterns as Record<string, any[]>).filter(([, value]) => Array.isArray(value) && value.length > 0);
  if (entries.length === 0) return null;
  return (
    <DetailSection title={title} icon={ListTree}>
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <div className="uppercase text-[11px] text-muted-foreground tracking-wide">{key.replace(/_/g, ' ')}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {(value as any[]).map((item, idx) => (
                <span key={idx} className="px-1.5 py-0.5 text-[11px] border border-border/40 rounded bg-background/60">
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}; 

const renderSemanticSection = (title: string, semantic: any) => {
  if (!semantic) return null;
  const entries = Object.entries(semantic as Record<string, any[]>).filter(([, value]) => Array.isArray(value) && value.length > 0);
  if (entries.length === 0) return null;
  return (
    <DetailSection title={title} icon={Layers}>
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <div className="uppercase text-[11px] text-muted-foreground tracking-wide">{key.replace(/_/g, ' ')}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {(value as any[]).map((item, idx) => (
                <span key={idx} className="px-1.5 py-0.5 text-[11px] border border-border/40 rounded bg-background/60">
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DetailSection>
  );
};

interface SourceBadgeProps {
  label: string;
  type?: string;
  filePath?: string | null;
}

function SourceBadge({ label, type, filePath }: SourceBadgeProps) {
  const normalizedType = type ? type.toString().toLowerCase() : 'source';
  const typeLabel = normalizedType === 'file' ? 'File' : normalizedType === 'note' ? 'Note' : normalizedType === 'rule' ? 'Rule' : normalizedType;
  const tooltip = filePath || label;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-border/40 rounded bg-background/80 text-[11px]" title={tooltip}>
      <FileText className="h-3 w-3" />
      <span className="uppercase tracking-wide text-[10px] text-muted-foreground">{typeLabel}</span>
      <span className="max-w-[220px] truncate text-foreground">{filePath || label}</span>
    </span>
  );
}
