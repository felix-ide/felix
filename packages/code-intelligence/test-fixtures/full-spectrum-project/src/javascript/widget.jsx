import React, { useEffect, useState } from 'react';
import { sceneDefaults } from './component.ts';

export function initializeWidget(canvas, scene) {
  canvas.dataset.fixture = 'visualization';
  canvas.dispatchEvent(new CustomEvent('fixture:init', { detail: scene }));
}

export function attachEventBridges(canvas, handlers) {
  canvas.addEventListener('fixture:hover', (event) => {
    handlers.onNodeHover?.(event.detail.id);
  });
  canvas.addEventListener('fixture:select', (event) => {
    handlers.onNodeSelect?.(event.detail.id);
  });
}

export function GraphWidget() {
  const [scene, setScene] = useState(sceneDefaults);

  useEffect(() => {
    const handler = (event) => setScene(event.detail);
    window.addEventListener('graph:update', handler);
    return () => window.removeEventListener('graph:update', handler);
  }, []);

  return (
    <div role="presentation">
      <h2>Fixture Graph Widget</h2>
      <p>Nodes: {scene.nodes.length}</p>
      <p>Edges: {scene.edges.length}</p>
    </div>
  );
}
