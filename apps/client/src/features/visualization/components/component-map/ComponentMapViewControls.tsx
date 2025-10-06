import { useEffect, useRef, useState } from 'react';
import { Filter, Info, Network, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import type { LayoutName } from './types';

interface ComponentMapViewControlsProps {
  layoutType?: LayoutName;
  onLayoutChange?: (layout: LayoutName) => void;
  filterText?: string;
  onFilterTextChange?: (text: string) => void;
  onToggleFilters: () => void;
  onToggleStats: () => void;
  onToggleLegend: () => void;
}

export function ComponentMapViewControls({
  layoutType,
  onLayoutChange,
  filterText,
  onFilterTextChange,
  onToggleFilters,
  onToggleStats,
  onToggleLegend,
}: ComponentMapViewControlsProps) {
  const [localLayoutType, setLocalLayoutType] = useState<LayoutName>(layoutType || 'force');
  const [localSearchText, setLocalSearchText] = useState(filterText || '');
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    setLocalLayoutType(layoutType || 'force');
  }, [layoutType]);

  useEffect(() => {
    setLocalSearchText(filterText || '');
  }, [filterText]);

  useEffect(() => {
    if (layoutType) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const syncFromControls = () => {
      const controls = (window as any).__compMapControls;
      if (controls?.getLayoutType) {
        const current = controls.getLayoutType();
        if (current) {
          setLocalLayoutType(current);
        }
      } else if (controls?.layoutType) {
        setLocalLayoutType(controls.layoutType);
      }
    };

    syncFromControls();

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { layoutType?: LayoutName };
      if (detail?.layoutType) {
        setLocalLayoutType(detail.layoutType);
      }
    };

    window.addEventListener('component-map:layout-change', handler);
    return () => {
      window.removeEventListener('component-map:layout-change', handler);
    };
  }, [layoutType]);

  const handleLayoutChange = (newLayout: LayoutName) => {
    setLocalLayoutType(newLayout);
    onLayoutChange?.(newLayout);
    const controls = (window as any).__compMapControls;
    if (controls) {
      controls.applyLayout?.(newLayout);
      controls.focusCanvas?.();
    }
    selectRef.current?.blur();
  };

  const handleSearchChange = (text: string) => {
    setLocalSearchText(text);
    onFilterTextChange?.(text);
    if ((window as any).__compMapControls) {
      (window as any).__compMapControls.setFilterText(text);
      (window as any).__compMapControls.focusCanvas?.();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        ref={selectRef}
        className="h-8 px-2 text-sm border border-border rounded bg-card text-foreground"
        value={localLayoutType}
        onChange={(e) => handleLayoutChange(e.target.value as LayoutName)}
      >
        <option value="force">🧊 Cube Grid</option>
        <option value="hierarchical">🏗️ Tower</option>
        <option value="radial">🌌 Galaxy</option>
        <option value="tree">🌳 File Tree</option>
        <option value="circular">⭕ Circular</option>
        <option value="dependency">📊 Dependency Flow</option>
        <option value="grid">⬜ Grid</option>
      </select>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search nodes..."
          value={localSearchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-48 h-8 pl-8 pr-2 text-sm border border-border rounded bg-card text-foreground"
        />
      </div>

      <div className="flex items-center gap-1">
        <button
          className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded"
          title="Zoom In"
          onClick={() => {
            (window as any).__compMapControls?.handleZoomIn();
            (window as any).__compMapControls?.focusCanvas?.();
          }}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded"
          title="Zoom Out"
          onClick={() => {
            (window as any).__compMapControls?.handleZoomOut();
            (window as any).__compMapControls?.focusCanvas?.();
          }}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded"
          title="Reset View"
          onClick={() => {
            (window as any).__compMapControls?.handleResetView();
            (window as any).__compMapControls?.focusCanvas?.();
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button onClick={onToggleFilters} className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded" title="Filters">
          <Filter className="h-4 w-4" />
        </button>
        <button onClick={onToggleStats} className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded" title="Statistics">
          <Info className="h-4 w-4" />
        </button>
        <button onClick={onToggleLegend} className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded" title="Legend">
          <Network className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
