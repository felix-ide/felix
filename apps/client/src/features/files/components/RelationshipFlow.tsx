import { ArrowRight, ArrowLeft, GitBranch } from 'lucide-react';
import { useTheme, getComponentStyles } from '@felix/theme-system';
import { formatTypeLabel } from '@/utils/relationship-format';

interface Relationship {
  id: string;
  name: string;
  type: string;
  filePath?: string;
}

interface RelationshipFlowProps {
  usedBy?: Relationship[];
  uses?: Relationship[];
  related?: Relationship[];
  onItemClick?: (item: Relationship) => void;
}

export function RelationshipFlow({ 
  usedBy = [], 
  uses = [], 
  related = [], 
  onItemClick 
}: RelationshipFlowProps) {
  const { theme } = useTheme();
  const RelationshipItem = ({ 
    item, 
    direction 
  }: { 
    item: Relationship; 
    direction: 'in' | 'out' | 'related' 
  }) => {
    const typeStyle = (type: string) => getComponentStyles(theme, type?.toLowerCase?.() || 'component');

    const getDirectionIcon = () => {
      switch (direction) {
        case 'in': return <ArrowLeft className="h-3 w-3 text-success" />;
        case 'out': return <ArrowRight className="h-3 w-3 text-primary" />;
        case 'related': return <GitBranch className="h-3 w-3 text-primary" />;
      }
    };

    const panelStyle = typeStyle(item.type);
    return (
      <div 
        className="flex items-center gap-2 p-2 rounded border cursor-pointer transition-all hover:shadow-sm"
        onClick={() => onItemClick?.(item)}
        style={{ borderColor: (panelStyle as any).borderColor, backgroundColor: (panelStyle as any).backgroundColor, color: (panelStyle as any).color }}
      >
        {getDirectionIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{item.name}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium border" style={panelStyle}>
              {formatTypeLabel(item.type)}
            </span>
          </div>
          
          {item.filePath && (
            <div className="text-xs text-muted-foreground truncate mt-1">
              {item.filePath}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Used By (Dependencies) */}
      {usedBy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeft className="h-4 w-4 text-success" />
            <h4 className="font-medium text-sm">Used by ({usedBy.length})</h4>
          </div>
          
          <div className="space-y-2 pl-4">
            {usedBy.map((item) => (
              <RelationshipItem 
                key={item.id} 
                item={item} 
                direction="in" 
              />
            ))}
          </div>
        </div>
      )}

      {/* Uses (Dependencies) */}
      {uses.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">Uses ({uses.length})</h4>
          </div>
          
          <div className="space-y-2 pl-4">
            {uses.map((item) => (
              <RelationshipItem 
                key={item.id} 
                item={item} 
                direction="out" 
              />
            ))}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-accent" />
            <h4 className="font-medium text-sm">Related ({related.length})</h4>
          </div>
          
          <div className="space-y-2 pl-4">
            {related.map((item) => (
              <RelationshipItem 
                key={item.id} 
                item={item} 
                direction="related" 
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {usedBy.length === 0 && uses.length === 0 && related.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No relationships found</p>
        </div>
      )}
    </div>
  );
}
