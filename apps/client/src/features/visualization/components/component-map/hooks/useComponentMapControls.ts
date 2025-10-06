import { useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import type { LayoutName } from '../types';

interface UseComponentMapControlsParams {
  layoutType: LayoutName;
  filterText: string;
  projectPath: string | null;
  updateComponentMapSettings: (path: string, updates: Partial<{ layoutType: LayoutName; filterText: string }>) => void;
  setLayoutType: (next: LayoutName) => void;
  setFilterText: (value: string) => void;
  runLayout: (type: LayoutName) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetView: () => void;
  canvasRef: RefObject<HTMLCanvasElement>;
}

interface UseComponentMapControlsResult {
  applyLayout: (type: LayoutName) => void;
}

export function useComponentMapControls({
  layoutType,
  filterText,
  projectPath,
  updateComponentMapSettings,
  setLayoutType,
  setFilterText,
  runLayout,
  handleZoomIn,
  handleZoomOut,
  handleResetView,
  canvasRef,
}: UseComponentMapControlsParams): UseComponentMapControlsResult {
  const focusCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.focus !== 'function') return;
    const focusFn = () => {
      if (document.activeElement === canvas) return;
      try {
        canvas.focus({ preventScroll: true } as any);
      } catch {
        canvas.focus();
      }
    };
    requestAnimationFrame(focusFn);
  };

  const applyLayout = useMemo(() => (type: LayoutName) => {
    setLayoutType(type);
    if (projectPath) {
      updateComponentMapSettings(projectPath, { layoutType: type });
    }
    runLayout(type);
    focusCanvas();
  }, [projectPath, runLayout, setLayoutType, updateComponentMapSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const controls = {
      handleZoomIn,
      handleZoomOut,
      handleResetView,
      setLayoutType,
      applyLayout,
      setFilterText,
      getLayoutType: () => layoutType,
      getFilterText: () => filterText,
      layoutType,
      filterText,
      focusCanvas,
    };

    (window as any).__compMapControls = controls;
    return () => {
      if ((window as any).__compMapControls === controls) {
        delete (window as any).__compMapControls;
      }
    };
  }, [handleZoomIn, handleZoomOut, handleResetView, setLayoutType, applyLayout, setFilterText, layoutType, filterText]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const controls = (window as any).__compMapControls;
    if (controls) {
      controls.layoutType = layoutType;
    }
    window.dispatchEvent(new CustomEvent('component-map:layout-change', { detail: { layoutType } }));
  }, [layoutType]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const controls = (window as any).__compMapControls;
    if (controls) {
      controls.filterText = filterText;
    }
    window.dispatchEvent(new CustomEvent('component-map:filter-change', { detail: { filterText } }));
  }, [filterText]);

  return { applyLayout };
}
