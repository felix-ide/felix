import { GitBranch, Box } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FilterPanelProps {
  visible: boolean;
  relationshipTypes: string[];
  activeRelTypes: Set<string>;
  onToggleRelationship: (type: string) => void;
  nodeTypes: string[];
  activeNodeTypes: Set<string>;
  onToggleNodeType: (type: string) => void;
}

export function FilterPanel({
  visible,
  relationshipTypes,
  activeRelTypes,
  onToggleRelationship,
  nodeTypes,
  activeNodeTypes,
  onToggleNodeType,
}: FilterPanelProps) {
  if (!visible) return null;

  return (
    <div className="absolute top-16 right-4 bg-card/95 backdrop-blur-sm rounded-lg p-4 border border-border z-30 min-w-[300px]">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Relationship Types
          </h4>
          <div className="flex flex-wrap gap-2">
            {relationshipTypes.map((type) => (
              <button
                key={type}
                onClick={() => onToggleRelationship(type)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  activeRelTypes.has(type)
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-accent text-muted-foreground hover:bg-accent/80'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Box className="h-4 w-4" />
            Node Types
          </h4>
          <div className="flex flex-wrap gap-2">
            {nodeTypes.map((type) => (
              <button
                key={type}
                onClick={() => onToggleNodeType(type)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  activeNodeTypes.has(type)
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-accent text-muted-foreground hover:bg-accent/80'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
