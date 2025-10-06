import { initializeWidget, attachEventBridges } from './widget.jsx';
import { graphToScene, LayoutMode, traverseEdges } from './component.ts';
import { buildSceneAsync, computeDegreeMap, ForceLayoutRuntime } from './utilities.js';

export class VisualizationApp {
  #canvas;
  #state;
  #runtime;

  constructor(canvas, initialState) {
    this.#canvas = canvas;
    this.#state = initialState;
  }

  async bootstrap() {
    const primaryScene = graphToScene(this.#state.graph, LayoutMode.ForceDirected);
    initializeWidget(this.#canvas, primaryScene);

    const asyncScene = await buildSceneAsync(this.#state.graph);
    this.#runtime = new ForceLayoutRuntime(asyncScene.nodes);

    attachEventBridges(this.#canvas, {
      onNodeHover: (nodeId) => this.handleHover(nodeId),
      onNodeSelect: (nodeId) => this.focusNode(nodeId)
    });

    this.#state.degrees = computeDegreeMap(this.#state.graph);
  }

  async focusNode(nodeId) {
    const { fetchFocusMetadata } = await import('../python-bridge.js');
    const details = await fetchFocusMetadata(nodeId);
    console.info('Focused node', nodeId, details.summary);
  }

  handleHover(nodeId) {
    this.#state.hovered = nodeId;
    for (const edge of traverseEdges(this.#state.graph)) {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.#state.lastEdge = edge.id;
        break;
      }
    }
  }
}

export function startVisualization(canvas) {
  const app = new VisualizationApp(canvas, window.__fixtureState);
  app.bootstrap();
  window.__app = app;
}

export default startVisualization;
