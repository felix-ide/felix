import { Link2, GitBranch, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { formatTypeLabel, getRelationshipChipStyle, getBiComponentRowStyle, getRelationshipPanelStyle, getRelationshipMetadataTagStyle, extractProvenanceTags } from '@/utils/relationship-format';
import { useTheme, getComponentStyles } from '@felix/theme-system';

interface ContextRelationshipsSectionProps {
  groupedRelationships: Record<string, any[]>;
  filteredRelationships: any[];
  expandedSections: Set<string>;
  onToggleSection: (section: string) => void;
  componentTypeById: Map<string, string>;
  displayMode: 'focus' | 'all';
  totalRelationships?: number;
}

// Fields to show - whitelist of useful metadata
const USEFUL_METADATA_FIELDS = new Set([
  'confidence',
  'finalconfidence',
  'parameters',
  'args',
  'arguments',
  'passeddata',
  'returntype',
  'accessmodifier',
  'visibility',
  'isasync',
  'async',
  'isstatic',
  'static',
  'analyzer',
  'source',
  'ispublic',
  'isprivate',
  'isprotected',
]);

// Fields to always hide - noise and internal tracking
const HIDDEN_METADATA_FIELDS = new Set([
  'timestamp',
  'createdat',
  'updatedat',
  'analyzedat',
  'id',
  'sourceid',
  'targetid',
  'relationshipid',
  'rawdata',
  'raw',
  'debug',
  'line',
  'column',
  'position',
  'startline',
  'endline',
  'startcolumn',
  'endcolumn',
  'parserversion',
  'version',
  'provenance', // Handled separately
]);

function isUsefulMetadata(key: string): boolean {
  const keyLower = key.toLowerCase();

  // Skip hidden fields
  if (HIDDEN_METADATA_FIELDS.has(keyLower)) {
    return false;
  }

  // Only show whitelisted fields
  return USEFUL_METADATA_FIELDS.has(keyLower);
}

export function ContextRelationshipsSection({
  groupedRelationships,
  filteredRelationships,
  expandedSections,
  onToggleSection,
  componentTypeById,
  displayMode,
  totalRelationships,
}: ContextRelationshipsSectionProps) {
  const { theme } = useTheme();
  const sectionOpen = expandedSections.has('relationships');

  if (!filteredRelationships?.length) return null;

  const componentStyle = (type: string) => {
    if (!theme) return {} as any;
    return getComponentStyles(theme, String(type || '').toLowerCase());
  };

  return (
    <div className="border border-border/70 rounded-lg overflow-hidden shadow-md bg-background/50 backdrop-blur">
      <button
        onClick={() => onToggleSection('relationships')}
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {sectionOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <GitBranch className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Relationships</h3>
          <span className="text-sm text-muted-foreground">
            ({filteredRelationships.length}
            {displayMode === 'focus' && totalRelationships ? ` of ${totalRelationships}` : ''})
          </span>
        </div>
        <div className="flex gap-2">
          {Object.entries(groupedRelationships).slice(0, 5).map(([type, items]) => (
            <span
              key={type}
              className="text-xs px-2 py-1 rounded-full border"
              style={getRelationshipChipStyle(theme, type)}
            >
              {formatTypeLabel(type)} ({(items as any[]).length})
            </span>
          ))}
        </div>
      </button>

      {sectionOpen && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(groupedRelationships).map(([type, relationships]) => (
              <div key={type} className="border rounded-md p-3" style={getRelationshipPanelStyle(theme, type)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span className="px-2 py-0.5 rounded border text-xs font-medium" style={getRelationshipChipStyle(theme, type)}>
                      {formatTypeLabel(type)}
                    </span>
                    <span className="text-xs text-muted-foreground">({(relationships as any[]).length})</span>
                  </div>
                </div>

                <div className="space-y-1 max-h-[22rem] overflow-y-auto">
                  {(relationships as any[]).map((relationship: any, index: number) => {
                    const sourceType = componentTypeById.get(String(relationship.sourceId)) || 'component';
                    const targetType = componentTypeById.get(String(relationship.targetId)) || 'component';

                    return (
                      <div
                        key={index}
                        className="text-xs rounded"
                        style={{
                          ...getBiComponentRowStyle(theme, sourceType, targetType),
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          paddingTop: '4px',
                          paddingBottom: '4px',
                        }}
                      >
                        <div className="flex items-center gap-1 justify-between">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="px-1 py-0.5 rounded border" style={componentStyle(sourceType)}>
                              {formatTypeLabel(sourceType)}
                            </span>
                            <span className="opacity-80">{formatTypeLabel(type)}</span>
                            <span className="px-1 py-0.5 rounded border" style={componentStyle(targetType)}>
                              {formatTypeLabel(targetType)}
                            </span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded border" style={getRelationshipChipStyle(theme, type)}>
                            {formatTypeLabel(type)}
                          </span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-start gap-1">
                            <span className="text-[10px] text-muted-foreground/50 mt-0.5">From:</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate" title={relationship.sourceId}>
                                {relationship.sourceName || relationship.sourceId?.split('|').pop()}
                              </div>
                              {relationship.sourceFilePath && (
                                <div className="text-[10px] text-muted-foreground/70 truncate font-mono" title={relationship.sourceFilePath}>
                                  {relationship.sourceFilePath}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start gap-1">
                            <span className="text-[10px] text-muted-foreground/50 mt-0.5">To:</span>
                            <div className="flex-1 min-w-0 ml-3">
                              <div className="font-medium truncate" title={relationship.targetId}>
                                {relationship.targetName || relationship.targetId?.split('|').pop()}
                              </div>
                              {relationship.targetFilePath && (
                                <div className="text-[10px] text-muted-foreground/70 truncate font-mono" title={relationship.targetFilePath}>
                                  {relationship.targetFilePath}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {relationship.metadata && Object.keys(relationship.metadata).length > 0 && (
                          <div className="mt-1 ml-2 flex flex-wrap gap-2">
                            {Object.entries(relationship.metadata).flatMap(([key, value]) => {
                              const keyLower = String(key).toLowerCase();

                              // Handle provenance separately - only show source
                              if (keyLower === 'provenance') {
                                const tags = extractProvenanceTags(value);
                                return tags
                                  .filter(tag => tag.key.toLowerCase() === 'source')
                                  .map((tag, idx) => {
                                    const label = formatTypeLabel(tag.key);
                                    const style = getRelationshipMetadataTagStyle(theme, type, label, tag.val);
                                    return (
                                      <span key={`prov-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs" style={style}>
                                        <span className="text-[10px] uppercase tracking-wide opacity-80">{label}:</span>
                                        <span className="text-xs break-words">{tag.val}</span>
                                      </span>
                                    );
                                  });
                              }

                              // Filter out useless metadata
                              if (!isUsefulMetadata(key)) {
                                return [];
                              }

                              // Format the value
                              let val: string;
                              if (typeof value === 'boolean') {
                                val = value ? '✓' : '✗';
                              } else if (typeof value === 'number') {
                                // Format confidence as percentage
                                if (keyLower.includes('confidence')) {
                                  val = `${Math.round(value * 100)}%`;
                                } else {
                                  val = String(value);
                                }
                              } else if (Array.isArray(value)) {
                                val = value.join(', ');
                              } else if (typeof value === 'object') {
                                val = JSON.stringify(value);
                              } else {
                                val = String(value);
                              }

                              const label = formatTypeLabel(String(key));
                              const style = getRelationshipMetadataTagStyle(theme, type, label, value);
                              return [(
                                <span key={label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs" style={style}>
                                  <span className="text-[10px] uppercase tracking-wide opacity-80">{label}:</span>
                                  <span className="text-xs break-words">{val}</span>
                                </span>
                              )];
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
