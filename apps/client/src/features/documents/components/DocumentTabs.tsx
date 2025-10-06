import { useState } from 'react';
import { X, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@client/shared/ui/Button';
import { cn } from '@/utils/cn';
import type { DocumentTab } from '@/types/components';

interface DocumentTabsProps {
  tabs: DocumentTab[];
  activeTabId?: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  className?: string;
}

export function DocumentTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
  className,
}: DocumentTabsProps) {
  const [draggedTab, setDraggedTab] = useState<string | null>(null);

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== targetTabId) {
      // Integration stub: reordering will use document store ordering when editor is restored
      console.log(`Reorder ${draggedTab} to position of ${targetTabId}`);
    }
  };

  if (tabs.length === 0) {
    return (
      <div className={cn('flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2', className)}>
        <div className="text-sm text-muted-foreground">No documents open</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewTab}
          className="h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          New
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center border-b border-border bg-muted/30', className)}>
      {/* Tab List */}
      <div className="flex flex-1 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, tab.id)}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm border-r border-border cursor-pointer transition-colors group relative min-w-0 max-w-48',
              tab.id === activeTabId
                ? 'bg-background text-foreground border-b-2 border-b-primary'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              draggedTab === tab.id && 'opacity-50'
            )}
          >
            {/* Tab Title */}
            <span className="truncate flex-1 min-w-0">
              {tab.isDirty && <span className="text-orange-500 mr-1">●</span>}
              {tab.title}
            </span>

            {/* Close Button */}
            <button
              onClick={(e) => handleTabClose(e, tab.id)}
              className={cn(
                'flex-shrink-0 w-4 h-4 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity',
                tab.id === activeTabId && 'opacity-70'
              )}
            >
              <X className="w-3 h-3" />
            </button>

            {/* Dirty indicator when not showing close button */}
            {tab.isDirty && (
              <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 group-hover:hidden" />
            )}
          </div>
        ))}
      </div>

      {/* New Tab Button */}
      <div className="flex items-center px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewTab}
          className="h-7 w-7 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Tab Overflow Menu */}
      {tabs.length > 8 && (
        <div className="flex items-center px-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
