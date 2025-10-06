import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Package, GitBranch, Layers } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTheme } from '@felix/theme-system';
import { formatTypeLabel } from '@/utils/relationship-format';
import { RelationshipCard } from './RelationshipCard';
import { CallGraphVisualization } from './CallGraphVisualization';

interface FunctionalRelationshipsSectionProps {
  relationships: any[];
  allComponents: any[];
  focusComponentId?: string | null;
  expandedSections?: Set<string>;
  onToggleSection?: (section: string) => void;
}

// Filter OUT hierarchical relationships - we only want functional ones
const HIERARCHICAL_TYPES = ['contains', 'parent_of', 'child_of', 'member_of', 'defines', 'defined_in', 'has_member'];

// Categorize relationships into functional groups
function categorizeRelationships(relationships: any[], focusComponentId: string | null) {
  const callers: any[] = [];
  const callees: any[] = [];
  const imports: any[] = [];
  const importedBy: any[] = [];
  const extends_: any[] = [];
  const extendedBy: any[] = [];
  const implements_: any[] = [];
  const implementedBy: any[] = [];
  const other: any[] = [];

  relationships.forEach((rel) => {
    const type = String(rel.type || '').toLowerCase();

    // SKIP hierarchical relationships - they're not functional!
    if (HIERARCHICAL_TYPES.includes(type)) {
      return;
    }

    const isSource = rel.sourceId === focusComponentId;
    const isTarget = rel.targetId === focusComponentId;

    if (type === 'calls' || type === 'function-call' || type === 'method-call') {
      if (isTarget) {
        callers.push(rel);
      } else if (isSource) {
        callees.push(rel);
      }
    } else if (type === 'called_by') {
      if (isTarget) {
        callees.push(rel);
      } else if (isSource) {
        callers.push(rel);
      }
    } else if (type === 'imports' || type === 'import') {
      if (isSource) {
        imports.push(rel);
      } else {
        importedBy.push(rel);
      }
    } else if (type === 'imported_by') {
      if (isTarget) {
        imports.push(rel);
      } else {
        importedBy.push(rel);
      }
    } else if (type === 'extends') {
      if (isSource) {
        extends_.push(rel);
      } else {
        extendedBy.push(rel);
      }
    } else if (type === 'extended_by') {
      if (isTarget) {
        extends_.push(rel);
      } else {
        extendedBy.push(rel);
      }
    } else if (type === 'implements') {
      if (isSource) {
        implements_.push(rel);
      } else {
        implementedBy.push(rel);
      }
    } else if (type === 'implemented_by') {
      if (isTarget) {
        implements_.push(rel);
      } else {
        implementedBy.push(rel);
      }
    } else {
      other.push(rel);
    }
  });

  return {
    callers,
    callees,
    imports,
    importedBy,
    extends: extends_,
    extendedBy,
    implements: implements_,
    implementedBy,
    other,
  };
}

export function FunctionalRelationshipsSection({
  relationships,
  allComponents,
  focusComponentId,
  expandedSections = new Set(['callers', 'callees']),
  onToggleSection = () => {},
}: FunctionalRelationshipsSectionProps) {
  const { theme } = useTheme();
  const [showCallGraph, setShowCallGraph] = useState(true);
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(expandedSections);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(localExpanded);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setLocalExpanded(newExpanded);
    onToggleSection(section);
  };

  const categorized = useMemo(
    () => categorizeRelationships(relationships, focusComponentId),
    [relationships, focusComponentId]
  );

  const focusComponent = useMemo(
    () => allComponents.find((c) => c.id === focusComponentId),
    [allComponents, focusComponentId]
  );

  if (!relationships.length) {
    return null;
  }

  const sections = [
    { key: 'callers', title: 'Called By', icon: ArrowUp, data: categorized.callers, direction: 'in' },
    { key: 'callees', title: 'Calls', icon: ArrowDown, data: categorized.callees, direction: 'out' },
    { key: 'imports', title: 'Imports', icon: Package, data: categorized.imports, direction: 'out' },
    { key: 'importedBy', title: 'Imported By', icon: Package, data: categorized.importedBy, direction: 'in' },
    { key: 'extends', title: 'Extends', icon: Layers, data: categorized.extends, direction: 'out' },
    { key: 'extendedBy', title: 'Extended By', icon: Layers, data: categorized.extendedBy, direction: 'in' },
    { key: 'implements', title: 'Implements', icon: Layers, data: categorized.implements, direction: 'out' },
    { key: 'implementedBy', title: 'Implemented By', icon: Layers, data: categorized.implementedBy, direction: 'in' },
  ].filter((section) => section.data.length > 0);

  return (
    <div className="space-y-3">
      {/* Compact Call Graph */}
      {(categorized.callers.length > 0 || categorized.callees.length > 0) && focusComponent && (
        <div className="border border-border/70 rounded-md overflow-hidden bg-card/50">
          <button
            onClick={() => setShowCallGraph(!showCallGraph)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              {showCallGraph ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <GitBranch className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Call Graph</h3>
              <span className="text-xs text-muted-foreground">
                ({categorized.callers.length + categorized.callees.length})
              </span>
            </div>
          </button>

          {showCallGraph && (
            <div className="p-2">
              <CallGraphVisualization
                focusComponent={focusComponent}
                callers={categorized.callers}
                callees={categorized.callees}
                height="350px"
              />
            </div>
          )}
        </div>
      )}

      {/* Compact Relationship Sections */}
      {sections.map(({ key, title, icon: Icon, data, direction }) => {
        const isExpanded = localExpanded.has(key);

        return (
          <div
            key={key}
            className="border border-border/70 rounded-md overflow-hidden bg-card/50"
          >
            <button
              onClick={() => toggleSection(key)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{title}</h3>
                <span className="text-xs text-muted-foreground">({data.length})</span>
              </div>
            </button>

            {isExpanded && (
              <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
                {data.map((rel, index) => {
                  const sourceComp = allComponents.find((c) => c.id === rel.sourceId);
                  const targetComp = allComponents.find((c) => c.id === rel.targetId);

                  return (
                    <RelationshipCard
                      key={`${rel.sourceId}-${rel.targetId}-${index}`}
                      relationship={rel}
                      sourceComponent={sourceComp}
                      targetComponent={targetComp}
                      direction={direction as 'in' | 'out'}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
