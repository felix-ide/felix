import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowRight, Code, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MarkdownRenderer } from '@client/shared/components/MarkdownRenderer';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import { formatTypeLabel } from '@/utils/relationship-format';

interface RelationshipCardProps {
  relationship: any;
  sourceComponent?: any;
  targetComponent?: any;
  direction: 'in' | 'out';
}

// Extract parameters from metadata
function extractParameters(relationship: any): string | null {
  const metadata = relationship.metadata || {};

  // Check for explicit parameters field
  if (metadata.parameters) {
    if (Array.isArray(metadata.parameters)) {
      return metadata.parameters.map((p: any) =>
        typeof p === 'string' ? p : `${p.name}${p.type ? `: ${p.type}` : ''}`
      ).join(', ');
    }
    return String(metadata.parameters);
  }

  // Check for passed data
  if (metadata.passedData || metadata.args || metadata.arguments) {
    const data = metadata.passedData || metadata.args || metadata.arguments;
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }
    return String(data);
  }

  return null;
}

export function RelationshipCard({ relationship, sourceComponent, targetComponent, direction }: RelationshipCardProps) {
  const { theme } = useTheme();
  const [showSourceCode, setShowSourceCode] = useState(false);
  const [showTargetCode, setShowTargetCode] = useState(false);

  const sourceType = String(relationship.sourceType || sourceComponent?.type || 'component').toLowerCase();
  const targetType = String(relationship.targetType || targetComponent?.type || 'component').toLowerCase();
  const relationshipType = String(relationship.type || '').toLowerCase();

  const sourceStyle = theme ? getComponentStyles(theme, sourceType) : {};
  const targetStyle = theme ? getComponentStyles(theme, targetType) : {};

  const sourceName = relationship.sourceName || sourceComponent?.name || 'Unknown';
  const targetName = relationship.targetName || targetComponent?.name || 'Unknown';
  const sourceFilePath = relationship.sourceFilePath || sourceComponent?.filePath || '';
  const targetFilePath = relationship.targetFilePath || targetComponent?.filePath || '';
  const sourceStartLine = relationship.sourceLocation?.startLine || sourceComponent?.location?.startLine || 0;
  const sourceEndLine = relationship.sourceLocation?.endLine || sourceComponent?.location?.endLine || sourceStartLine;
  const targetStartLine = relationship.targetLocation?.startLine || targetComponent?.location?.startLine || 0;
  const targetEndLine = relationship.targetLocation?.endLine || targetComponent?.location?.endLine || targetStartLine;

  const sourceCode = sourceComponent?.code || sourceComponent?.source || '';
  const targetCode = targetComponent?.code || targetComponent?.source || '';

  const metadata = relationship.metadata || {};
  const confidence = metadata.confidence || relationship.confidence || metadata.finalConfidence;
  const source = metadata.provenance?.source || metadata.source || 'unknown';

  const parameters = extractParameters(relationship);

  return (
    <div className="border border-border/40 rounded bg-background/60 hover:bg-background/80 transition-all text-xs">
      {/* Compact Relationship Display */}
      <div className="p-2">
        {/* From -> To (more compact) */}
        <div className="flex items-center gap-2">
          {/* Source */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="px-1.5 py-0.5 rounded border text-[10px] font-semibold" style={sourceStyle}>
              {formatTypeLabel(sourceType)}
            </span>
            <span className="font-semibold truncate" title={sourceName}>{sourceName}</span>
          </div>

          {/* Arrow */}
          <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />

          {/* Target */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="px-1.5 py-0.5 rounded border text-[10px] font-semibold" style={targetStyle}>
              {formatTypeLabel(targetType)}
            </span>
            <span className="font-semibold truncate" title={targetName}>{targetName}</span>
          </div>
        </div>

        {/* File paths on second line */}
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          <span className="font-mono truncate flex-1" title={sourceFilePath}>{sourceFilePath}:{sourceStartLine}-{sourceEndLine}</span>
          <span className="flex-shrink-0">→</span>
          <span className="font-mono truncate flex-1" title={targetFilePath}>{targetFilePath}:{targetStartLine}-{targetEndLine}</span>
        </div>

        {/* Compact metadata */}
        {(confidence != null || source || parameters) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {confidence != null && (
              <span className="px-1.5 py-0.5 rounded border border-border/40 text-[10px] bg-background/40">
                {Math.round(confidence * 100)}%
              </span>
            )}
            {source && (
              <span className="px-1.5 py-0.5 rounded border border-border/40 text-[10px] bg-background/40">
                {source}
              </span>
            )}
            {parameters && (
              <span className="px-1.5 py-0.5 rounded border border-accent/40 text-[10px] bg-accent/5 font-mono truncate max-w-xs" title={parameters}>
                {parameters}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Compact Expandable Source */}
      {(sourceCode || targetCode) && (
        <div className="border-t border-border/40">
          {sourceCode && (
            <div>
              <button
                onClick={() => setShowSourceCode(!showSourceCode)}
                className="w-full px-2 py-1 flex items-center gap-1.5 hover:bg-background/40 transition-colors text-[10px]"
              >
                {showSourceCode ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Code className="h-3 w-3" />
                <span>Caller</span>
              </button>
              {showSourceCode && (
                <div className="px-2 pb-1 max-h-48 overflow-y-auto max-w-full">
                  <div className="rounded border border-border/20 bg-black/5 text-[10px] overflow-x-auto">
                    <MarkdownRenderer content={`\`\`\`${sourceComponent?.language || 'typescript'}\n${sourceCode}\n\`\`\``} />
                  </div>
                </div>
              )}
            </div>
          )}
          {targetCode && (
            <div className={cn(sourceCode && 'border-t border-border/40')}>
              <button
                onClick={() => setShowTargetCode(!showTargetCode)}
                className="w-full px-2 py-1 flex items-center gap-1.5 hover:bg-background/40 transition-colors text-[10px]"
              >
                {showTargetCode ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Code className="h-3 w-3" />
                <span>Callee</span>
              </button>
              {showTargetCode && (
                <div className="px-2 pb-1 max-h-48 overflow-y-auto max-w-full">
                  <div className="rounded border border-border/20 bg-black/5 text-[10px] overflow-x-auto">
                    <MarkdownRenderer content={`\`\`\`${targetComponent?.language || 'typescript'}\n${targetCode}\n\`\`\``} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
