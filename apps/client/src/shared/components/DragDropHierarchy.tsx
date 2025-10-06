import { ReactNode, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface HierarchicalItem {
  id: string;
  parent_id?: string | null;
  sort_order: number;
  [key: string]: any;
}

interface DragDropHierarchyProps<T extends HierarchicalItem> {
  items: T[];
  onReorder: (itemId: string, newParentId: string | null, newSortOrder: number) => void;
  renderCard: (item: T, dragHandleProps: any) => ReactNode;
  filterItem?: (item: T) => boolean;
  sortItems?: (items: T[]) => T[];
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  itemType: string; // Used for droppable type
  className?: string;
  rootClassName?: string;
  childContainerClassName?: string;
  itemDepthClassName?: (depth: number) => string;
  isSearching?: boolean; // Add this to know when to auto-expand
}



export function DragDropHierarchy<T extends HierarchicalItem>({
  items,
  onReorder,
  renderCard,
  filterItem = () => true,
  sortItems = (items) => items.sort((a, b) => a.sort_order - b.sort_order),
  expandedIds,
  onToggleExpanded,
  itemType,
  className,
  rootClassName = "",
  childContainerClassName = "mt-2 ml-8 pl-4 border-l-2 border-muted",
  itemDepthClassName = (depth) => depth > 0 ? "bg-muted/20 rounded-lg border-l-2 border-primary/20" : "",
  isSearching = false,
}: DragDropHierarchyProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Build hierarchy
  const itemMap = new Map<string, T>();
  const rootItems: T[] = [];
  const childrenMap = new Map<string, T[]>();

  // First pass: create maps
  items.forEach(item => {
    itemMap.set(item.id, item);
    if (!item.parent_id) {
      rootItems.push(item);
    } else {
      if (!childrenMap.has(item.parent_id)) {
        childrenMap.set(item.parent_id, []);
      }
      childrenMap.get(item.parent_id)!.push(item);
    }
  });

  // Check if any descendant matches the filter
  const hasMatchingDescendant = (itemId: string): boolean => {
    const children = childrenMap.get(itemId) || [];
    for (const child of children) {
      if (filterItem(child)) return true;
      if (hasMatchingDescendant(child.id)) return true;
    }
    return false;
  };

  // Auto-expand items that have matching descendants
  const shouldAutoExpand = (item: T): boolean => {
    return hasMatchingDescendant(item.id);
  };


  const handleDragStart = (start: any) => {
    console.log('Drag started:', start);
    setDraggingId(start.draggableId);
  };

  const handleDragUpdate = (update: any) => {
    // Log drag updates to debug the issue
    if (!update.destination) {
      console.log('Drag update: No destination');
    }
  };

  const handleDragEnd = (result: DropResult) => {
    setDraggingId(null);
    const { draggableId, destination, source } = result;

    console.log('DragDropHierarchy handleDragEnd:', { 
      draggableId, 
      destination, 
      source,
      droppedOn: destination?.droppableId,
      droppedAtIndex: destination?.index
    });

    // If dropped outside any droppable area
    if (!destination) {
      console.log('No destination - dropped outside');
      return;
    }

    // No movement
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      console.log('No movement - same position');
      return;
    }

    const itemId = draggableId;
    const newParentId = destination.droppableId === 'root' ? null : destination.droppableId;
    
    // Prevent dragging into own descendants
    const isDescendant = (parentId: string, childId: string): boolean => {
      const children = childrenMap.get(parentId) || [];
      for (const child of children) {
        if (child.id === childId) return true;
        if (isDescendant(child.id, childId)) return true;
      }
      return false;
    };
    
    if (newParentId && isDescendant(itemId, newParentId)) {
      console.log('Cannot drag into own descendant');
      return;
    }

    // Get the actual item being moved
    const movedItem = itemMap.get(itemId);
    if (!movedItem) {
      console.log('Item not found:', itemId);
      return;
    }

    // Calculate new sort order based on destination index
    const siblings = newParentId ? (childrenMap.get(newParentId) || []) : rootItems;
    const sortedSiblings = sortItems(siblings.filter(item => item.id !== itemId));
    
    let newSortOrder = 0;
    if (destination.index === 0) {
      // Dropped at the beginning
      newSortOrder = sortedSiblings.length > 0 ? sortedSiblings[0].sort_order - 1 : 0;
    } else if (destination.index >= sortedSiblings.length) {
      // Dropped at the end
      newSortOrder = sortedSiblings.length > 0 
        ? sortedSiblings[sortedSiblings.length - 1].sort_order + 1 
        : 0;
    } else {
      // Dropped in the middle
      const prevItem = sortedSiblings[destination.index - 1];
      const nextItem = sortedSiblings[destination.index];
      newSortOrder = (prevItem.sort_order + nextItem.sort_order) / 2;
    }

    console.log('DragDropHierarchy calling onReorder:', {
      itemId,
      newParentId,
      newSortOrder,
      oldParentId: movedItem.parent_id,
      onReorderFunction: onReorder.toString()
    });
    onReorder(itemId, newParentId, newSortOrder);
  };

  const renderItem = (item: T, index: number, depth = 0): ReactNode => {
    // Check if this item matches the filter OR has matching descendants
    const itemMatches = filterItem(item);
    const hasMatchingChildren = shouldAutoExpand(item);
    
    if (!itemMatches && !hasMatchingChildren) {
      return null;
    }

    const children = childrenMap.get(item.id) || [];
    const hasChildren = children.length > 0;
    // Auto-expand when searching and has matching children, otherwise use manual state
    const isExpanded = (isSearching && hasMatchingChildren) || expandedIds.has(item.id);
    const sortedChildren = sortItems(children);
    
    // Calculate total descendant count (all children + their children recursively)
    const getTotalDescendantCount = (itemId: string): number => {
      const directChildren = childrenMap.get(itemId) || [];
      let total = directChildren.length;
      for (const child of directChildren) {
        total += getTotalDescendantCount(child.id);
      }
      return total;
    };
    
    const totalDescendants = getTotalDescendantCount(item.id);
    
    // Check if this item or any of its ancestors is being dragged
    const isBeingDragged = item.id === draggingId;
    const isDescendantOfDragged = draggingId ? (() => {
      let current = item;
      while (current.parent_id) {
        if (current.parent_id === draggingId) return true;
        current = itemMap.get(current.parent_id) as T;
        if (!current) break;
      }
      return false;
    })() : false;

    return (
      <div key={item.id}>
        <div className="mb-1 flex items-start gap-2">
          {/* Draggable handle area only */}
          <Draggable draggableId={item.id} index={index} isDragDisabled={false}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                style={{
                  ...provided.draggableProps.style,
                  // Ensure the handle stays visible during drag
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                }}
                className={cn(
                  "mt-1 p-1.5 bg-muted hover:bg-accent rounded cursor-move border transition-all",
                  snapshot.isDragging && "shadow-lg bg-primary text-primary-foreground"
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-muted-foreground"
                  >
                    <path
                      d="M4 6C4.55228 6 5 5.55228 5 5C5 4.44772 4.55228 4 4 4C3.44772 4 3 4.44772 3 5C3 5.55228 3.44772 6 4 6Z"
                      fill="currentColor"
                    />
                    <path
                      d="M4 9C4.55228 9 5 8.55228 5 8C5 7.44772 4.55228 7 4 7C3.44772 7 3 7.44772 3 8C3 8.55228 3.44772 9 4 9Z"
                      fill="currentColor"
                    />
                    <path
                      d="M4 12C4.55228 12 5 11.5523 5 11C5 10.4477 4.55228 10 4 10C3.44772 10 3 10.4477 3 11C3 11.5523 3.44772 12 4 12Z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 9C12.5523 9 13 8.55228 13 8C13 7.44772 12.5523 7 12 7C11.4477 7 11 7.44772 11 8C11 8.55228 11.4477 9 12 9Z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 12C12.5523 12 13 11.5523 13 11C13 10.4477 12.5523 10 12 10C11.4477 10 11 10.4477 11 11C11 11.5523 11.4477 12 12 12Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
            )}
          </Draggable>

          {/* Non-draggable content */}
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={() => onToggleExpanded(item.id)}
              className="mt-2 p-2 hover:bg-accent rounded-md z-10 bg-muted/50 border flex items-center gap-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              <span className="text-xs font-medium text-muted-foreground">
                {children.length}/{totalDescendants}
              </span>
            </button>
          )}
          
          {/* Spacer for items without children */}
          {!hasChildren && <div className="w-10" />}

          {/* Item Card */}
          <div className={cn("flex-1", itemDepthClassName(depth))}>
            {renderCard(item, null)} {/* No drag handle props here */}
          </div>
        </div>
        
        {/* Droppable container for children */}
        {(hasChildren && isExpanded) ? (
          // Expanded container with visible children
          <Droppable droppableId={item.id} type={itemType} isDropDisabled={isBeingDragged || isDescendantOfDragged}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  childContainerClassName,
                  "transition-all relative",
                  // Reduced padding now that we have precise control
                  "pt-2 pb-2",
                  snapshot.isDraggingOver && "bg-primary/10 border-2 border-dashed border-primary rounded-lg"
                )}
              >
                {sortedChildren.map((child, idx) => renderItem(child, idx, depth + 1))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ) : !isBeingDragged && !isDescendantOfDragged && (
          // Collapsed or empty container - show drop zone on hover
          <Droppable droppableId={item.id} type={itemType}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "ml-14 transition-all relative",
                  !snapshot.isDraggingOver && "h-2",
                  snapshot.isDraggingOver && "min-h-[50px] border-2 border-dashed border-primary rounded bg-primary/10 p-2 my-1"
                )}
              >
                {snapshot.isDraggingOver && (
                  <div className="text-xs text-muted-foreground text-center">
                    Drop here to make child of {item.title || 'this item'}
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    );
  };

  return (
    <DragDropContext 
      onDragStart={handleDragStart} 
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      <div className={className}>
        {rootItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-lg mb-2">No items yet</div>
            <div className="text-sm">Create your first item to get started</div>
          </div>
        ) : (
          <Droppable droppableId="root" type={itemType}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  rootClassName,
                  "min-h-[50px] relative p-2",
                  snapshot.isDraggingOver && "bg-primary/10 rounded-lg border-2 border-dashed border-primary"
                )}
              >
                {sortItems(rootItems).map((item, index) => renderItem(item, index, 0))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        )}
      </div>
    </DragDropContext>
  );
}