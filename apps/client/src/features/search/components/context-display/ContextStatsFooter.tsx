interface ContextStatsFooterProps {
  componentCount: number;
  relationshipCount: number;
  tokenCount: number;
  metadataCount: number;
  totalRelationships?: number;
  displayMode: 'focus' | 'all';
}

export function ContextStatsFooter({
  componentCount,
  relationshipCount,
  tokenCount,
  metadataCount,
  totalRelationships,
  displayMode,
}: ContextStatsFooterProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{componentCount}</div>
        <div className="text-xs text-muted-foreground">Components</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{relationshipCount}</div>
        <div className="text-xs text-muted-foreground">
          Relationships
          {displayMode === 'focus' && totalRelationships ? ` (${totalRelationships} total)` : ''}
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{tokenCount}</div>
        <div className="text-xs text-muted-foreground">Tokens</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-accent">{metadataCount}</div>
        <div className="text-xs text-muted-foreground">Metadata Items</div>
      </div>
    </div>
  );
}
