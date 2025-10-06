import { CheckSquare, Square } from 'lucide-react';
import { Chip } from '@client/shared/ui/Chip';
import type { Checklist } from '@/types/api';

interface ChecklistDisplayProps {
  checklists: Checklist[];
  compact?: boolean;
}

export function ChecklistDisplay({ checklists = [], compact = false }: ChecklistDisplayProps) {
  if (!checklists.length) return null;

  const getTotalStats = () => {
    let totalItems = 0;
    let completedItems = 0;
    
    checklists.forEach(checklist => {
      totalItems += checklist.items.length;
      completedItems += checklist.items.filter(item => item.checked).length;
    });
    
    return { totalItems, completedItems };
  };

  if (compact) {
    const { totalItems, completedItems } = getTotalStats();
    if (totalItems === 0) return null;
    // Always show checklist progress, even if 0%

    return (
      <Chip variant="primary" size="sm" className="gap-1">
        <CheckSquare className="h-3 w-3" />
        <span className="text-xs">{completedItems}/{totalItems}</span>
        {totalItems > 0 && (
          <span className="text-[10px]">({Math.round((completedItems / totalItems) * 100)}%)</span>
        )}
      </Chip>
    );
  }

  return (
    <div className="space-y-3">
      {checklists.map(checklist => {
        const completed = checklist.items.filter(item => item.checked).length;
        const total = checklist.items.length;
        
        return (
          <div key={checklist.name} className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <span>{checklist.name}</span>
              <span className="text-xs text-muted-foreground">
                ({completed}/{total})
              </span>
              {total > 0 && (
                <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ width: `${(completed / total) * 100}%`, background: 'hsl(var(--primary))' }}
                  />
                </div>
              )}
            </div>
            <div className="ml-6 space-y-0.5">
              {checklist.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {item.checked ? (
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={item.checked ? 'line-through text-muted-foreground' : ''}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
